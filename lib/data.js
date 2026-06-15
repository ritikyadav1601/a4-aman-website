import { connectDB } from "@/lib/db";
import { addDays, daysInMonth, formatResult, istDate, sanitizeColumn } from "@/lib/utils";
import Ad from "@/models/Ad";
import Contact from "@/models/Contact";
import Game from "@/models/Game";
import GameResult from "@/models/GameResult";
import Result from "@/models/Result";

function plain(doc) {
  return JSON.parse(JSON.stringify(doc));
}

function hasMongo() {
  return Boolean(process.env.MONGODB_URI);
}

function timeToMinutes(time = "") {
  const [hours, minutes] = String(time).split(":").map(Number);
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

function currentResultBoardDate() {
  const today = istDate();
  return currentIstMinutes() < 180 ? addDays(today, -1) : today;
}

function resultGameKey(name = "") {
  const key = String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const aliases = new Map([
    ["desawer", "disawer"],
    ["desawar", "disawer"],
    ["ghaziabad", "gaziabad"],
    ["ghaziabad-king", "gaziabad-king"]
  ]);

  return aliases.get(key) || key;
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
  if (!hasMongo()) return [];
  await connectDB();
  const order = sort === "show" ? { showIndex: 1, resultTime: 1 } : { resultTime: 1, showIndex: 1 };
  return plain(await Game.find({ isActive: true }).sort(order).lean());
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
  const today = currentResultBoardDate();
  const yesterday = addDays(today, -1);
  const games = await getActiveGames("time");
  if (!games.length) return [];

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

  return games.map((game) => {
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

export async function getTopGames(games) {
  const now = currentIstMinutes();
  const byTime = [...games].sort((a, b) => timeToMinutes(a.resultTime) - timeToMinutes(b.resultTime));
  const recentResult = byTime.filter((game) => timeToMinutes(game.resultTime) <= now).at(-1);
  const upcoming = byTime.find((game) => timeToMinutes(game.resultTime) > now);

  if (!recentResult) return byTime.slice(0, 2);

  return [recentResult, upcoming || byTime.find((game) => String(game._id) !== String(recentResult._id))].filter(Boolean);
}

export async function getMonthlyRows({ year, month, untilToday = true, games: activeGames } = {}) {
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
