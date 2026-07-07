import { connectDB } from "@/lib/db";
import { getFirestoreCollection, getFirestoreDoc, hasFirebaseConfig } from "@/lib/firebase-rest";
import { connectResultSourceDB, hasResultSourceMongo } from "@/lib/result-source-db";
import { addDays, daysInMonth, formatResult, istDate, sanitizeColumn } from "@/lib/utils";
import Ad from "@/models/Ad";
import Contact from "@/models/Contact";
import Game from "@/models/Game";
import GameResult from "@/models/GameResult";
import Result from "@/models/Result";
import mongoose from "mongoose";

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

function isCityGame(game) {
  return game?.sourceCollection === "cities";
}

function dateRangeForKey(dateKey) {
  const start = new Date(`${dateKey}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function dailyNumberDateKey(row) {
  const value = row?.date || row?.revealedAt;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.valueOf()) ? "" : date.toISOString().slice(0, 10);
}

function dailyNumberValue(row) {
  if (!row || row.number == null || row.number === "") return "";
  return formatResult(row.number);
}

function newestDailyNumber(existing, next) {
  if (!existing) return next;
  const existingTime = new Date(existing.updatedAt || existing.revealedAt || existing.date || 0).valueOf();
  const nextTime = new Date(next.updatedAt || next.revealedAt || next.date || 0).valueOf();
  return nextTime >= existingTime ? next : existing;
}

function mongoId(value) {
  const id = String(value || "");
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : value;
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

function sourceLookupKeys(name = "") {
  return firebaseLookupKeys(name);
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

function dateFilter(dates) {
  return Array.isArray(dates) ? { $in: dates } : dates;
}

function sourceResultValue(result) {
  return formatResult(result?.resultNumber || result?.result || "-");
}

async function getSourceGames(siteGames) {
  const conn = await connectResultSourceDB();
  const db = conn.db;
  const sqlIds = siteGames.map((game) => game.sqlId).filter((id) => id != null);
  const names = siteGames.flatMap((game) => sourceLookupKeys(game.name));
  const query = {
    $or: [
      ...(sqlIds.length ? [{ sqlId: { $in: sqlIds } }] : []),
      { code: { $in: names } },
      { name: { $in: siteGames.map((game) => game.name) } }
    ]
  };
  const sourceGames = await db.collection("games").find(query).project({ name: 1, code: 1, sqlId: 1 }).toArray();
  const siteGameBySourceId = new Map();

  for (const sourceGame of sourceGames) {
    const sourceKeys = new Set([
      normalizeKey(sourceGame.name),
      normalizeKey(sourceGame.code),
      sourceGame.sqlId != null ? `sql:${sourceGame.sqlId}` : ""
    ]);
    const siteGame = siteGames.find((game) => {
      const siteKeys = new Set([
        ...sourceLookupKeys(game.name),
        game.sqlId != null ? `sql:${game.sqlId}` : ""
      ]);
      return [...sourceKeys].some((key) => key && siteKeys.has(key));
    });

    if (siteGame) siteGameBySourceId.set(String(sourceGame._id), siteGame);
  }

  return { sourceGames, siteGameBySourceId };
}

async function getSourceLiveRows({ siteGames, dates }) {
  const conn = await connectResultSourceDB();
  const games = [...new Set(siteGames.flatMap((game) => sourceLookupKeys(game.name)))];
  if (!games.length) return [];

  return conn.db
    .collection("results")
    .find({ game: { $in: games }, date: dateFilter(dates) })
    .project({ game: 1, date: 1, resultNumber: 1, updatedAt: 1, createdAt: 1 })
    .toArray();
}

async function getSourceGameResultRows({ siteGames, dates }) {
  const conn = await connectResultSourceDB();
  const { sourceGames, siteGameBySourceId } = await getSourceGames(siteGames);
  const sourceIds = sourceGames.map((game) => game._id);
  if (!sourceIds.length) return { rows: [], siteGameBySourceId };

  const rows = await conn.db
    .collection("gameresults")
    .find({ game: { $in: sourceIds }, resultDate: dateFilter(dates) })
    .project({ game: 1, resultDate: 1, result: 1, updatedAt: 1, createdAt: 1 })
    .toArray();

  return { rows, siteGameBySourceId };
}

async function getCityGames(sort = "time") {
  if (!hasMongo()) return [];
  await connectDB();
  const order = sort === "show" ? { revelationOrder: 1, revelationTime: 1 } : { revelationTime: 1, revelationOrder: 1 };
  const cities = await Game.db
    .collection("cities")
    .find({ isActive: { $ne: false } })
    .sort(order)
    .project({ name: 1, revelationTime: 1, revelationOrder: 1, sqlId: 1, isActive: 1 })
    .toArray();

  return plain(
    cities.map((city, index) => ({
      _id: String(city._id),
      cityId: String(city._id),
      sqlId: city.sqlId,
      name: city.name,
      code: normalizeKey(city.name),
      resultTime: city.revelationTime ? `${city.revelationTime}:00`.slice(0, 8) : "00:00:00",
      isActive: city.isActive !== false,
      showIndex: city.revelationOrder || index + 1,
      sourceCollection: "cities"
    }))
  );
}

async function getDailyNumberRowsForDates(games, dates) {
  const cityIds = games.map((game) => game.cityId || String(game._id)).filter(Boolean).map(mongoId);
  if (!cityIds.length || !dates.length) return [];
  const ranges = dates.map(dateRangeForKey);
  const start = new Date(Math.min(...ranges.map((range) => range.start.valueOf())));
  const end = new Date(Math.max(...ranges.map((range) => range.end.valueOf())));

  return Game.db
    .collection("dailynumbers")
    .find({ city: { $in: cityIds }, date: { $gte: start, $lt: end } })
    .project({ city: 1, date: 1, number: 1, revealedAt: 1, updatedAt: 1, createdAt: 1 })
    .toArray();
}

async function getDailyNumberRowsForRange(games, startKey, endKey) {
  const cityIds = games.map((game) => game.cityId || String(game._id)).filter(Boolean).map(mongoId);
  if (!cityIds.length) return [];
  const { start } = dateRangeForKey(startKey);
  const { end } = dateRangeForKey(endKey);

  return Game.db
    .collection("dailynumbers")
    .find({ city: { $in: cityIds }, date: { $gte: start, $lt: end } })
    .project({ city: 1, date: 1, number: 1, revealedAt: 1, updatedAt: 1, createdAt: 1 })
    .toArray();
}

function dailyNumberMap(rows) {
  const byCityDate = new Map();

  for (const row of rows) {
    const dateKey = dailyNumberDateKey(row);
    const key = `${String(row.city)}:${dateKey}`;
    byCityDate.set(key, newestDailyNumber(byCityDate.get(key), row));
  }

  return byCityDate;
}

async function getManualResultRowsForDates(games, dates) {
  const gameIds = games.map((game) => game.cityId || String(game._id)).filter(Boolean).map(mongoId);
  if (!gameIds.length) return [];

  return GameResult.find({
    game: { $in: gameIds },
    resultDate: dateFilter(dates)
  })
    .select({ game: 1, resultDate: 1, result: 1, updatedAt: 1, createdAt: 1 })
    .lean();
}

function manualResultMap(rows) {
  const byGameDate = new Map();

  for (const row of rows) {
    const key = `${String(row.game)}:${row.resultDate}`;
    const existing = byGameDate.get(key);
    const existingTime = new Date(existing?.updatedAt || existing?.createdAt || 0).valueOf();
    const nextTime = new Date(row.updatedAt || row.createdAt || 0).valueOf();
    if (!existing || nextTime >= existingTime) byGameDate.set(key, row);
  }

  return byGameDate;
}

function manualResultValue(row) {
  if (!row || row.result == null || row.result === "") return "";
  return formatResult(row.result);
}

function liveResultForGame(resultMap, game, date) {
  for (const key of sourceLookupKeys(game.name)) {
    const result = resultMap.get(`${key}:${date}`);
    if (result) return result;
  }

  return null;
}

function liveValueForGameByDate(liveByDate, dateKey, game) {
  const row = liveByDate.get(dateKey);
  if (!row) return "";

  for (const key of sourceLookupKeys(game.name)) {
    const value = row.get(key);
    if (value) return value;
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
  if (games.length) return plain(games);

  const cityGames = await getCityGames(sort);
  return plain(cityGames.length ? cityGames : sortGames(WEBSITE_CHART_GAMES, sort));
}

export async function getAdminGames() {
  if (!hasMongo()) return [];
  await connectDB();
  const cities = await Game.db
    .collection("cities")
    .find({})
    .sort({ revelationOrder: 1, revelationTime: 1 })
    .project({ name: 1, revelationTime: 1, revelationOrder: 1, sqlId: 1, isActive: 1 })
    .toArray();

  return plain(
    cities.map((city, index) => ({
      _id: String(city._id),
      cityId: String(city._id),
      sqlId: city.sqlId,
      name: city.name,
      code: normalizeKey(city.name),
      resultTime: city.revelationTime ? `${city.revelationTime}:00`.slice(0, 8) : "00:00:00",
      isActive: city.isActive !== false,
      showIndex: city.revelationOrder || index + 1,
      sourceCollection: "cities"
    }))
  );
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

  if (games.some(isCityGame)) {
    try {
      await connectDB();
      const [rows, manualRows] = await Promise.all([
        getDailyNumberRowsForDates(games, [today, yesterday]),
        getManualResultRowsForDates(games, [today, yesterday])
      ]);
      const byCityDate = dailyNumberMap(rows);
      const byManualDate = manualResultMap(manualRows);

      resolvedGames = games.map((game) => {
        const cityId = game.cityId || String(game._id);
        const yesterdayRow = byCityDate.get(`${cityId}:${yesterday}`);
        const todayRow = byCityDate.get(`${cityId}:${today}`);
        const manualYesterday = byManualDate.get(`${cityId}:${yesterday}`);
        const manualToday = byManualDate.get(`${cityId}:${today}`);

        return {
          ...game,
          first: manualResultValue(manualYesterday) || dailyNumberValue(yesterdayRow) || "XX",
          second: manualResultValue(manualToday) || dailyNumberValue(todayRow) || "XX",
          firstUpdatedAt: manualYesterday?.updatedAt || manualYesterday?.createdAt || yesterdayRow?.updatedAt || yesterdayRow?.revealedAt || yesterdayRow?.createdAt || null,
          secondUpdatedAt: manualToday?.updatedAt || manualToday?.createdAt || todayRow?.updatedAt || todayRow?.revealedAt || todayRow?.createdAt || null
        };
      });
    } catch (error) {
      console.error("[mongodb] city daily numbers read failed:", error.message);
    }
  } else if (hasResultSourceMongo()) {
    try {
      const [liveRows, gameResultData] = await Promise.all([
        getSourceLiveRows({ siteGames: games, dates: [today, yesterday] }),
        getSourceGameResultRows({ siteGames: games, dates: [today, yesterday] })
      ]);
      const liveResultMap = new Map(liveRows.map((row) => [`${row.game}:${row.date}`, row]));
      const resultMap = new Map(
        gameResultData.rows.map((row) => [`${String(gameResultData.siteGameBySourceId.get(String(row.game))?._id)}:${row.resultDate}`, row])
      );

      resolvedGames = games.map((game) => {
        const liveYesterday = liveResultForGame(liveResultMap, game, yesterday);
        const liveToday = liveResultForGame(liveResultMap, game, today);
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
    } catch (error) {
      console.error("[result-source] homepage results read failed:", error.message);
    }
  } else if (hasMongo()) {
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
  const detectedGames = activeGames || (hasMongo() ? await getActiveGames("time") : []);
  const activeCityGames = detectedGames?.some(isCityGame) ? detectedGames : null;
  if (activeCityGames) {
    try {
      await connectDB();
      const today = istDate();
      const current = new Date(`${today}T00:00:00.000Z`);
      const y = year || current.getUTCFullYear();
      const m = month || current.getUTCMonth() + 1;
      const limit =
        untilToday && y === current.getUTCFullYear() && m === current.getUTCMonth() + 1
          ? current.getUTCDate()
          : daysInMonth(y, m);
      const games = [...activeCityGames].sort((a, b) => monthlyChartOrder(a) - monthlyChartOrder(b));
      const start = `${y}-${String(m).padStart(2, "0")}-01`;
      const end = `${y}-${String(m).padStart(2, "0")}-${String(limit).padStart(2, "0")}`;
      const [dailyRows, manualRows] = await Promise.all([
        getDailyNumberRowsForRange(games, start, end),
        getManualResultRowsForDates(games, { $gte: start, $lte: end })
      ]);
      const byCityDate = dailyNumberMap(dailyRows);
      const byManualDate = manualResultMap(manualRows);

      const rows = [];
      for (let day = 1; day <= limit; day++) {
        const dateKey = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const row = { Date: `${String(day).padStart(2, "0")}/${String(m).padStart(2, "0")}` };
        for (const game of games) {
          const key = `${game.cityId || String(game._id)}:${dateKey}`;
          const manualResult = byManualDate.get(key);
          const result = byCityDate.get(key);
          row[sanitizeColumn(game.name)] = manualResultValue(manualResult) || dailyNumberValue(result) || "-";
        }
        rows.push(row);
      }

      return plain({ rows, games, gameColumns: games.map((game) => sanitizeColumn(game.name)) });
    } catch (error) {
      console.error("[mongodb] city monthly chart read failed:", error.message);
    }
  }

  if (hasResultSourceMongo()) {
    try {
      const today = istDate();
      const current = new Date(`${today}T00:00:00.000Z`);
      const y = year || current.getUTCFullYear();
      const m = month || current.getUTCMonth() + 1;
      const limit =
        untilToday && y === current.getUTCFullYear() && m === current.getUTCMonth() + 1
          ? current.getUTCDate()
          : daysInMonth(y, m);
      const games = [...(activeGames?.length ? activeGames : await getActiveGames("time"))].sort((a, b) => monthlyChartOrder(a) - monthlyChartOrder(b));
      const start = `${y}-${String(m).padStart(2, "0")}-01`;
      const end = `${y}-${String(m).padStart(2, "0")}-${String(limit).padStart(2, "0")}`;
      const [liveResults, gameResultData] = await Promise.all([
        getSourceLiveRows({ siteGames: games, dates: { $gte: start, $lte: end } }),
        getSourceGameResultRows({ siteGames: games, dates: { $gte: start, $lte: end } })
      ]);
      const liveByDate = new Map();
      for (const result of liveResults) {
        if (!liveByDate.has(result.date)) liveByDate.set(result.date, new Map());
        liveByDate.get(result.date).set(result.game, sourceResultValue(result));
      }

      const byDate = new Map();
      for (const result of gameResultData.rows) {
        const siteGame = gameResultData.siteGameBySourceId.get(String(result.game));
        if (!siteGame) continue;
        if (!byDate.has(result.resultDate)) byDate.set(result.resultDate, new Map());
        byDate.get(result.resultDate).set(String(siteGame._id), sourceResultValue(result));
      }

      const rows = [];
      for (let day = 1; day <= limit; day++) {
        const dateKey = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const row = { Date: `${String(day).padStart(2, "0")}/${String(m).padStart(2, "0")}` };
        for (const game of games) {
          row[sanitizeColumn(game.name)] = liveValueForGameByDate(liveByDate, dateKey, game) || byDate.get(dateKey)?.get(String(game._id)) || "-";
        }
        rows.push(row);
      }

      return plain({ rows, games, gameColumns: games.map((game) => sanitizeColumn(game.name)) });
    } catch (error) {
      console.error("[result-source] monthly chart read failed:", error.message);
    }
  }

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
  if (hasMongo()) {
    const games = await getActiveGames("time");
    if (games.some(isCityGame)) {
      try {
        await connectDB();
        const gameName = String(gameSlug).replace(/-/g, " ").trim().toLowerCase();
        const game =
          games.find((item) => normalizeKey(item.name) === normalizeKey(gameSlug) || String(item.name).trim().toLowerCase() === gameName) ||
          null;
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

        const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        const [dailyRows, manualRows] = await Promise.all([
          getDailyNumberRowsForRange([game], `${year}-01-01`, `${year}-12-31`),
          getManualResultRowsForDates([game], { $gte: `${year}-01-01`, $lte: `${year}-12-31` })
        ]);
        const byCityDate = dailyNumberMap(dailyRows);
        const byManualDate = manualResultMap(manualRows);

        for (let month = 1; month <= 12; month++) {
          for (let day = 1; day <= 31; day++) {
            const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const key = `${game.cityId || String(game._id)}:${dateKey}`;
            const value = manualResultValue(byManualDate.get(key)) || dailyNumberValue(byCityDate.get(key));
            if (value && rows[day - 1]) rows[day - 1][months[month - 1]] = value;
          }
        }

        return plain({ rows, game, games });
      } catch (error) {
        console.error("[mongodb] city yearly chart read failed:", error.message);
      }
    }
  }

  if (hasResultSourceMongo()) {
    try {
      const gameName = String(gameSlug).replace(/-/g, " ").trim().toLowerCase();
      const games = await getActiveGames("time");
      const game = games.find((item) => normalizeKey(item.name) === normalizeKey(gameSlug) || String(item.name).trim().toLowerCase() === gameName);
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

      const [liveResults, gameResultData] = await Promise.all([
        getSourceLiveRows({ siteGames: [game], dates: { $gte: `${year}-01-01`, $lte: `${year}-12-31` } }),
        getSourceGameResultRows({ siteGames: [game], dates: { $gte: `${year}-01-01`, $lte: `${year}-12-31` } })
      ]);
      const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

      for (const result of liveResults) {
        const [, month, day] = result.date.split("-").map(Number);
        if (rows[day - 1]) rows[day - 1][months[month - 1]] = sourceResultValue(result);
      }
      for (const result of gameResultData.rows) {
        const [, month, day] = result.resultDate.split("-").map(Number);
        if (rows[day - 1] && rows[day - 1][months[month - 1]] === "-") rows[day - 1][months[month - 1]] = sourceResultValue(result);
      }

      return plain({ rows, game, games });
    } catch (error) {
      console.error("[result-source] yearly chart read failed:", error.message);
    }
  }

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
  const { start, end } = dateRangeForKey(dateKey);
  const [rows, manualRows] = await Promise.all([
    Game.db
      .collection("dailynumbers")
      .find({ date: { $gte: start, $lt: end } })
      .sort({ createdAt: 1 })
      .project({ city: 1, date: 1, number: 1, revealedAt: 1, updatedAt: 1, createdAt: 1 })
      .toArray(),
    GameResult.find({ resultDate: dateKey }).select({ game: 1, resultDate: 1, result: 1, updatedAt: 1, createdAt: 1 }).lean()
  ]);

  if (!rows.length && !manualRows.length) return [];

  const dailyKeys = new Set(rows.map((row) => `${String(row.city)}:${dateKey}`));
  const cityIds = [...new Set([...rows.map((row) => String(row.city)), ...manualRows.map((row) => String(row.game))])].map(mongoId);
  const cities = await Game.db
    .collection("cities")
    .find({ _id: { $in: cityIds } })
    .project({ name: 1, revelationTime: 1, revelationOrder: 1, sqlId: 1, isActive: 1 })
    .toArray();
  const cityById = new Map(cities.map((city) => [String(city._id), city]));

  const dailyItems = rows.map((row) => {
    const city = cityById.get(String(row.city)) || {};
    return {
      _id: String(row._id),
      resultDate: dateKey,
      result: dailyNumberValue(row),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      game: {
        _id: String(row.city),
        cityId: String(row.city),
        name: city.name || "Unknown",
        code: normalizeKey(city.name || ""),
        resultTime: city.revelationTime ? `${city.revelationTime}:00`.slice(0, 8) : "00:00:00",
        isActive: city.isActive !== false,
        showIndex: city.revelationOrder || 0,
        sourceCollection: "cities"
      }
    };
  });

  const manualItems = manualRows
    .filter((row) => !dailyKeys.has(`${String(row.game)}:${row.resultDate}`))
    .map((row) => {
      const city = cityById.get(String(row.game)) || {};
      return {
        _id: String(row._id),
        resultDate: row.resultDate,
        result: manualResultValue(row),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        game: {
          _id: String(row.game),
          cityId: String(row.game),
          name: city.name || "Unknown",
          code: normalizeKey(city.name || ""),
          resultTime: city.revelationTime ? `${city.revelationTime}:00`.slice(0, 8) : "00:00:00",
          isActive: city.isActive !== false,
          showIndex: city.revelationOrder || 0,
          sourceCollection: "cities"
        }
      };
    });

  return plain([...dailyItems, ...manualItems]);
}
