import { connectDB } from "@/lib/db";
import { addDays, daysInMonth, formatResult, istDate, sanitizeColumn } from "@/lib/utils";
import Ad from "@/models/Ad";
import Contact from "@/models/Contact";
import Game from "@/models/Game";
import GameResult from "@/models/GameResult";

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

function monthlyChartOrder(game) {
  const order = new Map([
    ["desawer", 0],
    ["desawar", 0],
    ["delhi bazar", 1],
    ["shri ganesh", 2],
    ["faridabad", 3],
    ["ghaziabad", 4],
    ["gali", 5]
  ]);
  const name = String(game.name).toLowerCase().trim();
  return order.has(name) ? order.get(name) : 100 + timeToMinutes(game.resultTime);
}

export async function getContact() {
  if (!hasMongo()) return { name: "", contactNumber: "" };
  await connectDB();
  return plain((await Contact.findOne().lean()) || { name: "", contactNumber: "" });
}

export async function getAds() {
  if (!hasMongo()) {
    return [
      { khaiwalName: "SATTA KING", gpayNumber: "", whatsappNumber: "" },
      { khaiwalName: "SATTA KING", gpayNumber: "", whatsappNumber: "" }
    ];
  }
  await connectDB();
  const ads = await Ad.find().sort({ sqlId: 1, createdAt: 1 }).lean();
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
  const rows = await GameResult.find({ resultDate: dateKey }).lean();
  return new Map(rows.map((row) => [String(row.game), row]));
}

export async function getGamesWithTodayResults() {
  const today = istDate();
  const yesterday = addDays(today, -1);
  const games = await getActiveGames("time");
  const todayMap = await getResultMap(today);
  const yesterdayMap = await getResultMap(yesterday);
  return games.map((game) => ({
    ...game,
    first: formatResult(yesterdayMap.get(String(game._id))?.result || "XX"),
    second: formatResult(todayMap.get(String(game._id))?.result || "XX")
  }));
}

export async function getTopGames(games) {
  const now = currentIstMinutes();
  const byTime = [...games].sort((a, b) => timeToMinutes(a.resultTime) - timeToMinutes(b.resultTime));
  const recentResult = byTime.filter((game) => timeToMinutes(game.resultTime) <= now).at(-1) || byTime.at(-1);
  const upcoming =
    byTime.find((game) => timeToMinutes(game.resultTime) > now && String(game._id) !== String(recentResult?._id)) ||
    byTime.find((game) => String(game._id) !== String(recentResult?._id));

  return [recentResult, upcoming].filter(Boolean);
}

export async function getMonthlyRows({ year, month, untilToday = true } = {}) {
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

  const games = (await getActiveGames("time")).sort((a, b) => monthlyChartOrder(a) - monthlyChartOrder(b));
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const end = `${y}-${String(m).padStart(2, "0")}-${String(limit).padStart(2, "0")}`;
  const results = await GameResult.find({ resultDate: { $gte: start, $lte: end } }).lean();
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
      row[sanitizeColumn(game.name)] = byDate.get(dateKey)?.get(String(game._id)) || "-";
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

  const results = await GameResult.find({
    game: game._id,
    resultDate: { $gte: `${year}-01-01`, $lte: `${year}-12-31` }
  }).lean();
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  for (const result of results) {
    const [, month, day] = result.resultDate.split("-").map(Number);
    if (rows[day - 1]) rows[day - 1][months[month - 1]] = formatResult(result.result || "-");
  }

  return plain({ rows, game, games });
}

export async function getResultsForDate(dateKey) {
  if (!hasMongo()) return [];
  await connectDB();
  const rows = await GameResult.find({ resultDate: dateKey }).populate("game").sort({ createdAt: 1 }).lean();
  return plain(rows);
}
