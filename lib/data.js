import { connectDB } from "@/lib/db";
import { getFirestoreCollection, getFirestoreDoc, hasFirebaseConfig } from "@/lib/firebase-rest";
import { addDays, daysInMonth, formatResult, istDate, sanitizeColumn } from "@/lib/utils";
import Ad from "@/models/Ad";
import Contact from "@/models/Contact";
import Game from "@/models/Game";
import GameResult from "@/models/GameResult";
import Result from "@/models/Result";

function plain(doc) {
  return JSON.parse(JSON.stringify(doc));
}

const WEBSITE_CHART_GAMES = [
  { _id: "sadar-bazar", name: "Sadar bazar", resultTime: "13:39:00", showIndex: 1, isActive: true },
  { _id: "gwalior", name: "Gwalior", resultTime: "14:39:00", showIndex: 2, isActive: true },
  { _id: "delhi-bazar", name: "Delhi BAZAR", resultTime: "15:15:00", showIndex: 3, isActive: true },
  { _id: "delhi-matka", name: "Delhi Matka", resultTime: "15:39:00", showIndex: 4, isActive: true },
  { _id: "shri-ganesh", name: "Shri Ganesh", resultTime: "16:35:00", showIndex: 5, isActive: true },
  { _id: "agra", name: "Agra", resultTime: "17:29:00", showIndex: 6, isActive: true },
  { _id: "faridabad", name: "Faridabad", resultTime: "17:55:00", showIndex: 7, isActive: true },
  { _id: "alwar", name: "Alwar", resultTime: "19:34:00", showIndex: 8, isActive: true },
  { _id: "ghaziabad", name: "Ghaziabad", resultTime: "21:00:00", showIndex: 9, isActive: true },
  { _id: "dwarka", name: "Dwarka", resultTime: "22:34:00", showIndex: 10, isActive: true },
  { _id: "gali", name: "Gali", resultTime: "23:50:00", showIndex: 11, isActive: true },
  { _id: "desawer", name: "Desawer", resultTime: "05:05:00", showIndex: 12, isActive: true },
  { _id: "up-bazar", name: "U.P. Bazar", resultTime: "20:15:00", showIndex: 13, isActive: true },
  { _id: "mathura-city", name: "Mathura City", resultTime: "22:32:00", showIndex: 14, isActive: true },
  { _id: "manipur", name: "Manipur", resultTime: "14:30:00", showIndex: 15, isActive: true },
  { _id: "palwal-city", name: "Palwal City", resultTime: "16:30:00", showIndex: 16, isActive: true },
  { _id: "kohlapur", name: "Kohlapur", resultTime: "13:30:00", showIndex: 17, isActive: true }
];

function hasMongo() {
  return Boolean(process.env.MONGODB_URI);
}

function timeToMinutes(time = "") {
  const [hours, minutes] = String(time).split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

function sortGames(games, sort = "time") {
  return [...games].sort((a, b) => {
    if (sort === "show") {
      return (a.showIndex || 0) - (b.showIndex || 0) || timeToMinutes(a.resultTime) - timeToMinutes(b.resultTime);
    }

    return timeToMinutes(a.resultTime) - timeToMinutes(b.resultTime) || (a.showIndex || 0) - (b.showIndex || 0);
  });
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

function currentResultBoardDate() {
  const today = istDate();
  return currentIstMinutes() < 180 ? addDays(today, -1) : today;
}

function monthNameLower(month) {
  return new Date(Date.UTC(2026, month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    timeZone: "UTC"
  }).toLowerCase();
}

function normalizeKey(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resultGameKey(name = "") {
  const key = normalizeKey(name);

  const aliases = new Map([
    ["desawer", "disawer"],
    ["desawar", "disawer"],
    ["ghaziabad", "gaziabad"],
    ["ghaziabad-king", "gaziabad-king"]
  ]);

  return aliases.get(key) || key;
}

function formatFirebaseResult(value = "") {
  const result = String(value || "").trim();
  if (!result || result === "--") return "XX";
  return formatResult(result);
}

function firebaseLookupKeys(name = "") {
  const key = normalizeKey(name);
  const keys = new Set([key, resultGameKey(key)]);

  const aliases = {
    agra: ["agra-bazar"],
    "agra-bazar": ["agra"],
    gwalior: ["gwalior-bazar"],
    "gwalior-bazar": ["gwalior"],
    "mathura-city": ["mathura"],
    mathura: ["mathura-city"],
    "u-p-bazar": ["up-bazar"],
    "up-bazar": ["u-p-bazar"],
    "delhi-bazaar": ["delhi-bazar"],
    "delhi-bazar": ["delhi-bazaar"],
    "shree-ganesh": ["shri-ganesh"],
    "shri-ganesh": ["shree-ganesh"]
  };

  if (["desawer", "desawar", "disawer", "disawar"].includes(key)) {
    ["desawer", "desawar", "disawer", "disawar"].forEach((item) => keys.add(item));
  }
  if (["ghaziabad", "gaziabad"].includes(key)) {
    ["ghaziabad", "gaziabad"].forEach((item) => keys.add(item));
  }
  for (const alias of aliases[key] || []) keys.add(alias);

  return [...keys].filter(Boolean);
}

async function getFirebaseHomepageResultMap() {
  const byKey = new Map();
  if (!hasFirebaseConfig()) return byKey;

  const [sk24, homepage] = await Promise.all([
    getFirestoreDoc("scraped_cache/sk24_games"),
    getFirestoreDoc("scraped_cache/homepage")
  ]);
  const rawGames = [
    ...(sk24?.games || []),
    ...(homepage?.live || []),
    ...(homepage?.next || []),
    ...(homepage?.rest || [])
  ];

  for (const game of rawGames) {
    const item = {
      first: formatFirebaseResult(game?.yesterday),
      second: formatFirebaseResult(game?.today)
    };

    for (const key of firebaseLookupKeys(game?.name)) {
      if (!byKey.has(key)) byKey.set(key, item);
    }
  }

  return byKey;
}

async function getFirebaseCustomResultMap(yesterday, today) {
  const byKey = new Map();
  if (!hasFirebaseConfig()) return byKey;

  const [previousDoc, todayDoc] = await Promise.all([
    getFirestoreDoc(`custom_games/${yesterday}`),
    getFirestoreDoc(`custom_games/${today}`)
  ]);
  const keys = new Set([
    ...Object.keys(previousDoc || {}),
    ...Object.keys(todayDoc || {})
  ]);

  for (const key of keys) {
    if (["khaiwal", "updatedAt"].includes(key)) continue;

    const item = {
      first: formatFirebaseResult(previousDoc?.[key]),
      second: formatFirebaseResult(todayDoc?.[key])
    };

    for (const lookupKey of firebaseLookupKeys(key)) {
      byKey.set(lookupKey, item);
    }
  }

  return byKey;
}

const FIREBASE_CHART_FIELDS = new Map([
  ["desawer", "dswr"],
  ["desawar", "dswr"],
  ["disawer", "dswr"],
  ["sadar-bazar", "sadar-bazar"],
  ["gwalior", "gwalior"],
  ["faridabad", "frbd"],
  ["ghaziabad", "gzbd"],
  ["gaziabad", "gzbd"],
  ["dwarka", "dwarka"],
  ["gali", "gali"],
  ["agra", "agra"],
  ["alwar", "alwar"],
  ["delhi-matka", "delhi-matka"],
  ["shri-ganesh", "srgn"],
  ["delhi-bazar", "dlbz"],
  ["u-p-bazar", "up-bazar"],
  ["up-bazar", "up-bazar"],
  ["mathura-city", "mathura-city"],
  ["manipur", "manipur"],
  ["palwal-city", "palwal-city"],
  ["kohlapur", "kohlapur"]
]);

function firebaseChartFieldForGame(name = "") {
  return FIREBASE_CHART_FIELDS.get(normalizeKey(name));
}

function firebaseResultForGame(resultMap, game, side = "second") {
  const result = firebaseLookupKeys(game.name).map((key) => resultMap.get(key)).find(Boolean);
  return result?.[side] || "";
}

function resultDateDay(value) {
  const input = String(value || "").trim();
  const numeric = input.match(/\b(\d{1,2})\b(?!.*\b\d{1,2}\b)/)?.[1];
  const day = Number(numeric || input);
  return Number.isFinite(day) && day >= 1 && day <= 31 ? String(day).padStart(2, "0") : "";
}

async function getFirebaseMonthlyDoc(year, month) {
  const docId = `chart_${monthNameLower(month)}_${year}`;
  return getFirestoreDoc(`scraped_cache/${docId}`);
}

async function getFirebaseGameChartDoc(gameName, year, month) {
  const monthName = monthNameLower(month);
  const candidates = firebaseLookupKeys(gameName).map((key) => `game_${key}_${monthName}_${year}`);

  for (const docId of candidates) {
    const doc = await getFirestoreDoc(`scraped_cache/${docId}`);
    if (doc?.results?.length) return doc;
  }

  return null;
}

async function getFirebaseCustomGameRows(year, month) {
  const docs = await getFirestoreCollection("custom_games");
  const prefix = `${year}-${String(month).padStart(2, "0")}-`;
  const rows = new Map();

  for (const doc of docs) {
    if (!String(doc.id || "").startsWith(prefix)) continue;
    rows.set(String(doc.id).slice(-2), doc);
  }

  return rows;
}

function customGameValue(customRows, dayKey, game) {
  const row = customRows.get(dayKey);
  if (!row) return "";

  for (const key of firebaseLookupKeys(game.name)) {
    if (row[key] != null) return formatFirebaseResult(row[key]);
  }

  return "";
}

function monthlyChartOrder(game) {
  const order = new Map([
    ["desawer", 0],
    ["desawar", 0],
    ["delhi bazar", 1],
    ["shri ganesh", 2],
    ["faridabad", 3],
    ["ghaziabad", 4],
    ["gali", 5],
    ["shiv dham", 6],
    ["pushkar bazar", 7],
    ["delhi metro", 8],
    ["shri sayam", 9],
    ["shri shyam", 9],
    ["kolmbia", 10],
    ["makka-madina", 11],
    ["kalka night", 12]
  ]);
  const name = String(game.name).toLowerCase().trim();
  return order.has(name) ? order.get(name) : 100 + timeToMinutes(game.resultTime);
}

export async function getContact() {
  if (!hasMongo()) return { name: "", contactNumber: "" };
  await connectDB();
  return plain((await Contact.findOne().select({ name: 1, contactNumber: 1 }).lean()) || { name: "", contactNumber: "" });
}

export async function getAds() {
  if (!hasMongo()) {
    return [
      { khaiwalName: "SATTA KING", gpayNumber: "", whatsappNumber: "" },
      { khaiwalName: "SATTA KING", gpayNumber: "", whatsappNumber: "" }
    ];
  }
  await connectDB();
  const ads = await Ad.find().select({ khaiwalName: 1, gpayNumber: 1, whatsappNumber: 1, website: 1 }).sort({ sqlId: 1, createdAt: 1 }).lean();
  if (ads.length) return plain(ads);
  return [
    { khaiwalName: "SATTA KING", gpayNumber: "", whatsappNumber: "" },
    { khaiwalName: "SATTA KING", gpayNumber: "", whatsappNumber: "" }
  ];
}

export async function getActiveGames(sort = "time") {
  if (!hasMongo()) return plain(sortGames(WEBSITE_CHART_GAMES, sort));
  await connectDB();
  const order = sort === "show" ? { showIndex: 1, resultTime: 1 } : { resultTime: 1, showIndex: 1 };
  const games = await Game.find({ isActive: true }).sort(order).lean();
  return plain(games.length ? games : sortGames(WEBSITE_CHART_GAMES, sort));
}

export async function getAdminGames() {
  if (!hasMongo()) return [];
  await connectDB();
  return plain(await Game.find({ isActive: true }).sort({ showIndex: 1, resultTime: 1 }).lean());
}

export async function getResultMap(dateKey) {
  if (!hasMongo()) return new Map();
  await connectDB();
  const rows = await GameResult.find({ resultDate: dateKey }).select({ game: 1, result: 1 }).lean();
  return new Map(rows.map((row) => [String(row.game), row]));
}

export async function getGamesWithTodayResults() {
  const games = await getActiveGames("time");
  if (!games.length) return [];

  const today = currentResultBoardDate();
  const yesterday = addDays(today, -1);
  let resolvedGames = games;

  if (hasMongo()) {
    await connectDB();
    const liveRows = await Result.find({
      game: { $in: games.map((game) => resultGameKey(game.name)) },
      date: { $in: [today, yesterday] }
    })
      .select({ game: 1, date: 1, resultNumber: 1, updatedAt: 1, createdAt: 1 })
      .lean();
    const liveResultMap = new Map(liveRows.map((row) => [`${row.game}:${row.date}`, row]));
    const rows = await GameResult.find({
      game: { $in: games.map((game) => game._id) },
      resultDate: { $in: [today, yesterday] }
    })
      .select({ game: 1, resultDate: 1, result: 1, updatedAt: 1, createdAt: 1 })
      .lean();
    const resultMap = new Map(rows.map((row) => [`${String(row.game)}:${row.resultDate}`, row]));

    resolvedGames = games.map((game) => {
      const key = resultGameKey(game.name);
      const liveYesterday = liveResultMap.get(`${key}:${yesterday}`);
      const liveToday = liveResultMap.get(`${key}:${today}`);
      const oldYesterday = resultMap.get(`${String(game._id)}:${yesterday}`);
      const oldToday = resultMap.get(`${String(game._id)}:${today}`);

      return {
        ...game,
        first: formatResult(liveYesterday?.resultNumber || oldYesterday?.result || "XX"),
        second: formatResult(liveToday?.resultNumber || oldToday?.result || "XX"),
        firstUpdatedAt: liveYesterday?.updatedAt || liveYesterday?.createdAt || oldYesterday?.updatedAt || oldYesterday?.createdAt || null,
        secondUpdatedAt: liveToday?.updatedAt || liveToday?.createdAt || oldToday?.updatedAt || oldToday?.createdAt || null
      };
    });
  }

  if (hasFirebaseConfig()) {
    try {
      const [homepageResults, customResults] = await Promise.all([
        getFirebaseHomepageResultMap(),
        getFirebaseCustomResultMap(yesterday, today)
      ]);
      const firebaseResults = new Map([...homepageResults, ...customResults]);

      if (firebaseResults.size) {
        return resolvedGames.map((game) => {
          const result = firebaseLookupKeys(game.name).map((key) => firebaseResults.get(key)).find(Boolean);

          if (!result) return game;

          return {
            ...game,
            first: result.first || game.first || "XX",
            second: result.second || game.second || "XX",
            firstUpdatedAt: game.firstUpdatedAt || null,
            secondUpdatedAt: game.secondUpdatedAt || null
          };
        });
      }
    } catch (error) {
      console.error("[firebase] homepage results read failed:", error.message);
    }
  }

  return resolvedGames;
}

export async function getTopGames(games) {
  const now = currentIstMinutes();
  const byTime = [...games].sort((a, b) => timeToMinutes(a.resultTime) - timeToMinutes(b.resultTime));
  const recentResult = byTime.filter((game) => timeToMinutes(game.resultTime) <= now).at(-1);
  const upcoming = byTime.find((game) => timeToMinutes(game.resultTime) > now);

  if (!recentResult) return byTime.slice(0, 2);

  return [recentResult, upcoming || byTime.find((game) => String(game._id) !== String(recentResult._id))].filter(Boolean);
}

export async function getMonthlyRows({ year, month, untilToday = true, games: activeGames } = {}) {
  if (hasFirebaseConfig()) {
    try {
      const today = istDate();
      const current = new Date(`${today}T00:00:00.000Z`);
      const y = year || current.getUTCFullYear();
      const m = month || current.getUTCMonth() + 1;
      const limit =
        untilToday && y === current.getUTCFullYear() && m === current.getUTCMonth() + 1
          ? current.getUTCDate()
          : daysInMonth(y, m);
      const chart = await getFirebaseMonthlyDoc(y, m);
      const chartRows = new Map((chart?.results || []).map((row) => [String(row.date).padStart(2, "0"), row]));
      const games = [...(activeGames?.length ? activeGames : await getActiveGames("time"))].sort((a, b) => monthlyChartOrder(a) - monthlyChartOrder(b));
      const [gameChartDocs, customRows] = await Promise.all([
        Promise.all(games.map((game) => getFirebaseGameChartDoc(game.name, y, m))),
        getFirebaseCustomGameRows(y, m)
      ]);
      const gameChartRows = new Map(
        games.map((game, index) => [
          sanitizeColumn(game.name),
          new Map((gameChartDocs[index]?.results || []).map((row) => [resultDateDay(row.date), row.result]))
        ])
      );
      const shouldUseLiveFallback = y === current.getUTCFullYear() && m === current.getUTCMonth() + 1;
      const liveResults = shouldUseLiveFallback
        ? new Map([
            ...(await getFirebaseHomepageResultMap()),
            ...(await getFirebaseCustomResultMap(addDays(today, -1), today))
          ])
        : new Map();

      const rows = [];
      for (let day = 1; day <= limit; day++) {
        const dayKey = String(day).padStart(2, "0");
        const row = { Date: `${dayKey}/${String(m).padStart(2, "0")}` };
        const source = chartRows.get(dayKey) || {};

        for (const game of games) {
          const column = sanitizeColumn(game.name);
          const field = firebaseChartFieldForGame(game.name);
          let value = formatFirebaseResult(gameChartRows.get(column)?.get(dayKey));
          if (value === "XX") value = customGameValue(customRows, dayKey, game);
          if (value === "XX") value = field ? formatFirebaseResult(source[field]) : "";
          if (value === "XX" && shouldUseLiveFallback && day === current.getUTCDate()) {
            value = firebaseResultForGame(liveResults, game, "second");
          }
          row[column] = value && value !== "XX" ? value : "-";
        }

        rows.push(row);
      }

      return plain({ rows, games, gameColumns: games.map((game) => sanitizeColumn(game.name)) });
    } catch (error) {
      console.error("[firebase] monthly chart read failed:", error.message);
    }
  }

  if (!hasMongo()) return { rows: [], games: [], gameColumns: [] };
  await connectDB();
  const today = istDate();
  const current = new Date(`${today}T00:00:00.000Z`);
  const y = year || current.getUTCFullYear();
  const m = month || current.getUTCMonth() + 1;
  const limit =
    untilToday && y === current.getUTCFullYear() && m === current.getUTCMonth() + 1
      ? current.getUTCDate()
      : daysInMonth(y, m);

  const games = [...(activeGames || (await getActiveGames("time")))].sort((a, b) => monthlyChartOrder(a) - monthlyChartOrder(b));
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const end = `${y}-${String(m).padStart(2, "0")}-${String(limit).padStart(2, "0")}`;
  const liveResults = await Result.find({
    game: { $in: games.map((game) => resultGameKey(game.name)) },
    date: { $gte: start, $lte: end }
  })
    .select({ game: 1, date: 1, resultNumber: 1 })
    .lean();
  const liveByDate = new Map();
  for (const result of liveResults) {
    if (!liveByDate.has(result.date)) liveByDate.set(result.date, new Map());
    liveByDate.get(result.date).set(result.game, formatResult(result.resultNumber || "-"));
  }

  const results = await GameResult.find({
    game: { $in: games.map((game) => game._id) },
    resultDate: { $gte: start, $lte: end }
  })
    .select({ game: 1, resultDate: 1, result: 1 })
    .lean();
  const byDate = new Map();

  for (const result of results) {
    if (!byDate.has(result.resultDate)) byDate.set(result.resultDate, new Map());
    byDate.get(result.resultDate).set(String(result.game), formatResult(result.result || "-"));
  }

  const rows = [];
  for (let day = 1; day <= limit; day++) {
    const dateKey = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const row = { Date: `${String(day).padStart(2, "0")}/${String(m).padStart(2, "0")}` };
    for (const game of games) {
      row[sanitizeColumn(game.name)] = liveByDate.get(dateKey)?.get(resultGameKey(game.name)) || byDate.get(dateKey)?.get(String(game._id)) || "-";
    }
    rows.push(row);
  }

  return plain({ rows, games, gameColumns: games.map((game) => sanitizeColumn(game.name)) });
}

export async function getYearChartRows(gameSlug, year) {
  if (hasFirebaseConfig()) {
    try {
      const gameName = String(gameSlug).replace(/-/g, " ").trim();
      const games = await getActiveGames("time");
      const game = games.find((item) => normalizeKey(item.name) === normalizeKey(gameSlug)) || { name: gameName };
      const rows = Array.from({ length: 31 }, (_, index) => ({
        Date: index + 1,
        JAN: "-",
        FEB: "-",
        MAR: "-",
        APR: "-",
        MAY: "-",
        JUN: "-",
        JUL: "-",
        AUG: "-",
        SEP: "-",
        OCT: "-",
        NOV: "-",
        DEC: "-"
      }));

      const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      const [docs, customDocs] = await Promise.all([
        Promise.all(months.map((_, index) => getFirebaseGameChartDoc(game.name || gameName, year, index + 1))),
        getFirestoreCollection("custom_games")
      ]);

      docs.forEach((doc, monthIndex) => {
        for (const result of doc?.results || []) {
          const day = Number(resultDateDay(result.date));
          const value = formatFirebaseResult(result.result);
          if (rows[day - 1] && value !== "XX") rows[day - 1][months[monthIndex]] = value;
        }
      });

      for (const doc of customDocs) {
        if (!String(doc.id || "").startsWith(`${year}-`)) continue;
        const [, monthPart, dayPart] = String(doc.id).split("-");
        const monthIndex = Number(monthPart) - 1;
        const day = Number(dayPart);
        const value = customGameValue(new Map([[dayPart, doc]]), dayPart, game);

        if (rows[day - 1] && months[monthIndex] && value && value !== "XX") {
          rows[day - 1][months[monthIndex]] = value;
        }
      }

      return plain({ rows, game, games });
    } catch (error) {
      console.error("[firebase] yearly chart read failed:", error.message);
    }
  }

  if (!hasMongo()) return { rows: [], game: { name: gameSlug }, games: [] };
  await connectDB();
  const gameName = String(gameSlug).replace(/-/g, " ").trim().toLowerCase();
  const games = await getActiveGames("time");
  const game = games.find((item) => String(item.name).trim().toLowerCase() === gameName);
  const rows = Array.from({ length: 31 }, (_, index) => ({
    Date: index + 1,
    JAN: "-",
    FEB: "-",
    MAR: "-",
    APR: "-",
    MAY: "-",
    JUN: "-",
    JUL: "-",
    AUG: "-",
    SEP: "-",
    OCT: "-",
    NOV: "-",
    DEC: "-"
  }));

  if (!game) return { rows, game: { name: gameName }, games };

  const liveResults = await Result.find({
    game: resultGameKey(game.name),
    date: { $gte: `${year}-01-01`, $lte: `${year}-12-31` }
  })
    .select({ date: 1, resultNumber: 1 })
    .lean();
  const results = await GameResult.find({
    game: game._id,
    resultDate: { $gte: `${year}-01-01`, $lte: `${year}-12-31` }
  })
    .select({ resultDate: 1, result: 1 })
    .lean();
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  for (const result of liveResults) {
    const [, month, day] = result.date.split("-").map(Number);
    if (rows[day - 1]) rows[day - 1][months[month - 1]] = formatResult(result.resultNumber || "-");
  }
  for (const result of results) {
    const [, month, day] = result.resultDate.split("-").map(Number);
    if (rows[day - 1] && rows[day - 1][months[month - 1]] === "-") rows[day - 1][months[month - 1]] = formatResult(result.result || "-");
  }

  return plain({ rows, game, games });
}

export async function getResultsForDate(dateKey) {
  if (!hasMongo()) return [];
  await connectDB();
  const rows = await GameResult.find({ resultDate: dateKey }).populate("game").sort({ createdAt: 1 }).lean();
  return plain(rows);
}
