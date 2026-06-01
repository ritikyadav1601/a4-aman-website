import { connectDB } from "./db.js";
import Game from "../models/Game.js";
import GameResult from "../models/GameResult.js";

export const A7_URL = "https://a7satta.com/";
const DEFAULT_FETCH_TIMEOUT_MS = 12000;

export const GAME_ALIASES = [
  ["Desawer", ["disawer", "desawer", "desawar"]],
  ["Sadar bazar", ["sadar bazar"]],
  ["Delhi Darbar", ["delhi darbar"]],
  ["Gwalior", ["gwalior"]],
  ["Delhi BAZAR", ["delhi bazar"]],
  ["New Ganga", ["new ganga"]],
  ["Delhi Matka", ["delhi matka"]],
  ["Shri Ganesh", ["shri ganesh"]],
  ["Agra", ["agra"]],
  ["Faridabad", ["faridabad"]],
  ["Fatehabad", ["fatehabad"]],
  ["Alwar", ["alwar"]],
  ["Mandi Bazar", ["mandi bazar"]],
  ["Ghaziabad King", ["gaziabad king", "ghaziabad king"]],
  ["Ghaziabad", ["gaziabad", "ghaziabad"]],
  ["Dwarka", ["dwarka"]],
  ["Gali", ["gali"]]
];

export const RESULT_SCHEDULE = new Map([
  ["Desawer", "05:18"],
  ["Sadar bazar", "13:39"],
  ["Delhi Darbar", "14:10"],
  ["Gwalior", "14:39"],
  ["Delhi BAZAR", "15:15"],
  ["New Ganga", "15:30"],
  ["Delhi Matka", "15:39"],
  ["Shri Ganesh", "16:35"],
  ["Agra", "17:29"],
  ["Faridabad", "17:55"],
  ["Fatehabad", "19:00"],
  ["Alwar", "19:34"],
  ["Mandi Bazar", "20:10"],
  ["Ghaziabad King", "20:30"],
  ["Ghaziabad", "21:00"],
  ["Dwarka", "22:34"],
  ["Gali", "00:10"]
]);

const aliasToGame = new Map();
for (const [gameName, aliases] of GAME_ALIASES) {
  for (const alias of aliases) aliasToGame.set(normalizeName(alias), gameName);
}

const AFTER_MIDNIGHT_PREVIOUS_DATE_GAMES = new Set(["Gali"]);

export async function syncA7Results({
  resultDate = istDate(),
  dryRun = false,
  smart = false,
  windowMinutes = 20,
  now = "",
  fetchTimeoutMs = DEFAULT_FETCH_TIMEOUT_MS
} = {}) {
  resultDate = resultDate || istDate();
  await connectDB();

  const activeGames = await Game.find({ isActive: true }).lean();
  const syncableGames = getSyncableGames(activeGames);
  const targetGames = await getTargetGames({
    syncableGames,
    resultDate,
    smart,
    windowMinutes,
    now
  });

  const report = {
    date: resultDate,
    source: A7_URL,
    smart,
    windowMinutes,
    targetGames: targetGames.map((target) => target.siteName),
    matched: 0,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    skipped: [],
    missingOnOurSite: [],
    unmatchedSourceGames: []
  };

  if (!targetGames.length) return report;

  const html = await fetchHtml(A7_URL, fetchTimeoutMs);
  const parsed = parseA7Results(html);
  const scraped = parsed.results;
  report.sourceDate = parsed.sourceDate;
  const candidates = [];

  for (const target of targetGames) {
    const { a7Name, game, siteName } = target;
    const source = scraped.get(normalizeName(a7Name));
    const writeDate = getWriteDateForGame(a7Name, resultDate, {
      smart,
      windowMinutes,
      nowMinutes: now ? timeToMinutes(now) : currentIstMinutes()
    });

    if (!game) {
      report.missingOnOurSite.push(siteName);
      continue;
    }

    if (!source) {
      report.skipped.push(`${siteName}: not found on A7`);
      continue;
    }

    const sourceResult = getSourceResultForDate(source, writeDate, parsed.sourceDate);

    if (!isResult(sourceResult)) {
      report.skipped.push(`${siteName}: pending/invalid result (${sourceResult || "blank"})`);
      continue;
    }

    report.matched++;
    candidates.push({ game, sourceResult, writeDate });
  }

  const existingRows = candidates.length
    ? await GameResult.find({
        $or: candidates.map(({ game, writeDate }) => ({ game: game._id, resultDate: writeDate }))
      })
        .select({ game: 1, resultDate: 1, result: 1 })
        .lean()
    : [];
  const existingByGameDate = new Map(
    existingRows.map((row) => [`${String(row.game)}:${row.resultDate}`, row])
  );
  const writes = [];

  for (const { game, sourceResult, writeDate } of candidates) {
    const existing = existingByGameDate.get(`${String(game._id)}:${writeDate}`);
    if (existing?.result === sourceResult) {
      report.unchanged++;
      continue;
    }

    if (dryRun) {
      if (existing) report.updated++;
      else report.inserted++;
      continue;
    }

    writes.push({
      updateOne: {
        filter: { game: game._id, resultDate: writeDate },
        update: {
          $set: {
            game: game._id,
            gameSqlId: game.sqlId,
            resultDate: writeDate,
            result: sourceResult
          }
        },
        upsert: true
      }
    });

    if (existing) report.updated++;
    else report.inserted++;
  }

  if (writes.length) {
    await GameResult.bulkWrite(writes, { ordered: false });
  }

  return report;
}

export function printA7SyncReport(report, dryRun = false) {
  console.log(`${dryRun ? "Dry run" : "Sync"} complete for ${report.date}`);
  if (report.smart) {
    console.log(`Smart window mode: enabled (${report.windowMinutes} minutes)`);
  }
  console.log(`Target games: ${report.targetGames.length ? report.targetGames.join(", ") : "none"}`);
  console.log(`Matched with valid result: ${report.matched}`);
  console.log(`Inserted: ${report.inserted}`);
  console.log(`Updated: ${report.updated}`);
  console.log(`Unchanged: ${report.unchanged}`);

  if (report.skipped.length) {
    console.log("\nSkipped:");
    for (const item of report.skipped) console.log(`- ${item}`);
  }

  if (report.missingOnOurSite.length) {
    console.log("\nConfigured games missing on our site:");
    for (const item of report.missingOnOurSite) console.log(`- ${item}`);
  }

  if (report.unmatchedSourceGames.length) {
    console.log("\nA7 games ignored because they are not in the 17-game sync list:");
    for (const item of report.unmatchedSourceGames) console.log(`- ${item}`);
  }
}

async function getTargetGames({ syncableGames, resultDate, smart, windowMinutes, now }) {
  if (!smart) return syncableGames;

  const currentMinutes = now ? timeToMinutes(now) : currentIstMinutes();
  const activeWindowGames = syncableGames.filter(({ a7Name }) => {
    const schedule = RESULT_SCHEDULE.get(a7Name);
    if (!schedule) return false;
    return isInsideWindow(currentMinutes, timeToMinutes(schedule), windowMinutes);
  });

  if (!activeWindowGames.length) return [];

  const checks = activeWindowGames
    .map(({ a7Name, game }) => ({
      game,
      resultDate: getWriteDateForGame(a7Name, resultDate, {
        smart,
        windowMinutes,
        nowMinutes: currentMinutes
      })
    }))
    .filter(Boolean);
  const existingRows = checks.length
    ? await GameResult.find({
        $or: checks.map(({ game, resultDate: targetDate }) => ({ game: game._id, resultDate: targetDate }))
      })
        .select({ game: 1, resultDate: 1, result: 1 })
        .lean()
    : [];
  const savedGameIds = new Set(
    existingRows
      .filter((row) => isResult(row.result))
      .map((row) => `${String(row.game)}:${row.resultDate}`)
  );

  return activeWindowGames.filter(({ a7Name, game }) => {
    const targetDate = getWriteDateForGame(a7Name, resultDate, {
      smart,
      windowMinutes,
      nowMinutes: currentMinutes
    });
    return game && !savedGameIds.has(`${String(game._id)}:${targetDate}`);
  });
}

function getSyncableGames(activeGames) {
  const activeByName = new Map(activeGames.map((game) => [normalizeName(game.name), game]));
  const usedGameIds = new Set();
  const syncableGames = [];

  for (const [a7Name, aliases] of GAME_ALIASES) {
    const game = [a7Name, ...aliases]
      .map((name) => activeByName.get(normalizeName(name)))
      .find(Boolean);
    if (!game || usedGameIds.has(String(game._id))) continue;

    usedGameIds.add(String(game._id));
    syncableGames.push({
      a7Name,
      siteName: game.name,
      game
    });
  }

  return syncableGames;
}

async function fetchHtml(url, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; SattaKingFastResultSync/1.0)"
    }
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) throw new Error(`A7 fetch failed with HTTP ${response.status}`);
  return response.text();
}

function parseA7Results(html) {
  const lines = htmlToLines(html);
  const results = new Map();
  const sourceDate = parseSourceDate(lines);

  for (let index = 0; index < lines.length; index++) {
    const sourceName = lines[index];
    const siteGameName = aliasToGame.get(normalizeName(sourceName));
    if (!siteGameName) continue;

    const time = lines[index + 1] || "";
    if (!isTime(time)) continue;

    const { yesterday, today } = readResultPair(lines, index + 2);
    results.set(normalizeName(siteGameName), {
      sourceName,
      siteGameName,
      time,
      yesterday,
      today
    });
  }

  return { results, sourceDate };
}

function getWriteDateForGame(gameName, resultDate, { smart, windowMinutes, nowMinutes }) {
  const schedule = RESULT_SCHEDULE.get(gameName);
  const scheduleMinutes = schedule ? timeToMinutes(schedule) : 0;

  if (
    smart &&
    schedule &&
    scheduleMinutes > nowMinutes &&
    isInsideWindow(nowMinutes, scheduleMinutes, windowMinutes)
  ) {
    return addDays(resultDate, -1);
  }

  if (AFTER_MIDNIGHT_PREVIOUS_DATE_GAMES.has(gameName) && nowMinutes >= 0 && nowMinutes <= 180) {
    return addDays(resultDate, -1);
  }

  return resultDate;
}

function getSourceResultForDate(source, writeDate, sourceDate) {
  if (!sourceDate) return source.today;
  if (writeDate === sourceDate) return source.today;
  if (writeDate === addDays(sourceDate, -1)) return source.yesterday;
  return source.today;
}

function parseSourceDate(lines) {
  const months = new Map([
    ["january", "01"],
    ["february", "02"],
    ["march", "03"],
    ["april", "04"],
    ["may", "05"],
    ["june", "06"],
    ["july", "07"],
    ["august", "08"],
    ["september", "09"],
    ["october", "10"],
    ["november", "11"],
    ["december", "12"]
  ]);

  for (const line of lines.slice(0, 30)) {
    const cleaned = line.replace(/\$/g, "").replace(/\s+/g, " ");
    const match = cleaned.match(/\b([A-Za-z]+)\s+(\d{1,2})\s*,\s*(\d{4})\b/);
    if (!match) continue;
    const month = months.get(match[1].toLowerCase());
    if (!month) continue;
    return `${match[3]}-${month}-${String(match[2]).padStart(2, "0")}`;
  }

  return "";
}

function readResultPair(lines, startIndex) {
  const slots = [];

  for (let index = startIndex; index < Math.min(lines.length, startIndex + 8); index++) {
    const line = lines[index];
    const nextLine = lines[index + 1] || "";

    if (aliasToGame.has(normalizeName(line)) && isTime(nextLine)) break;
    if (isTime(line)) break;

    const result = normalizeResult(line);
    if (isResult(result)) slots.push(result);
    else if (isPendingMarker(line)) slots.push("");
    else if (/arrow/i.test(line)) continue;

    if (slots.length >= 2) break;
  }

  return {
    yesterday: slots[0] || "",
    today: slots[1] || ""
  };
}

function htmlToLines(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "\n")
    .replace(/<img\b[^>]*alt=["']([^"']+)["'][^>]*>/gi, "\n$1\n")
    .replace(/<(br|p|div|tr|td|th|li|h[1-6]|a|section|article|table|thead|tbody)\b[^>]*>/gi, "\n")
    .replace(/<\/(p|div|tr|td|th|li|h[1-6]|a|section|article|table|thead|tbody)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .split(/\r?\n/)
    .map(decodeEntities)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function normalizeName(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeResult(value) {
  const result = String(value).trim();
  return /^\d$/.test(result) ? result.padStart(2, "0") : result;
}

function isResult(value) {
  return /^\d{2}$/.test(String(value).trim());
}

function isPendingMarker(value) {
  return /^(--|-|xx)$/i.test(String(value).trim()) || /wait|pending/i.test(String(value));
}

function isTime(value) {
  return /^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(String(value).trim());
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value).split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

function currentIstMinutes(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(map.hour) * 60 + Number(map.minute);
}

function isInsideWindow(currentMinutes, startMinutes, windowMinutes) {
  const minutesInDay = 24 * 60;
  const normalizedCurrent = (currentMinutes + minutesInDay) % minutesInDay;
  const normalizedStart = (startMinutes + minutesInDay) % minutesInDay;
  const diff = (normalizedCurrent - normalizedStart + minutesInDay) % minutesInDay;
  return diff >= 0 && diff <= windowMinutes;
}

function istDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function addDays(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
