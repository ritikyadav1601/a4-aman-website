const fs = require("fs");
const mongoose = require("mongoose");

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    }
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function addDays(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
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

const games = [
  ["Shiv Dham", "13:25:00", "46", "56"],
  ["Pushkar Bazar", "14:25:00", "86", "04"],
  ["Delhi Metro", "15:10:00", "16", "23"],
  ["Delhi Bazar", "15:15:00", "25", "61"],
  ["Shri Sayam", "16:20:00", "81", "XX"],
  ["Shri Ganesh", "16:35:00", "79", "XX"],
  ["Kolmbia", "17:10:00", "51", "XX"],
  ["Faridabad", "17:55:00", "09", "XX"],
  ["Makka-Madina", "19:25:00", "88", "XX"],
  ["Ghaziabad", "21:00:00", "17", "XX"],
  ["Kalka Night", "22:00:00", "54", "XX"],
  ["Gali", "23:50:00", "35", "XX"],
  ["Desawer", "05:05:00", "74", "73"]
];

async function main() {
  loadEnv();
  if (!process.env.MONGODB_URI) throw new Error("Set MONGODB_URI in .env.local or .env first.");

  const Game =
    mongoose.models.Game ||
    mongoose.model(
      "Game",
      new mongoose.Schema(
        {
          sqlId: { type: Number, index: true, unique: true, sparse: true },
          name: { type: String, required: true },
          code: { type: String, default: "" },
          resultTime: { type: String, default: "00:00:00" },
          isActive: { type: Boolean, default: true },
          showIndex: { type: Number, default: 0 },
          mid: { type: Number, default: 0 }
        },
        { timestamps: true }
      )
    );

  const GameResult =
    mongoose.models.GameResult ||
    mongoose.model(
      "GameResult",
      new mongoose.Schema(
        {
          sqlId: { type: Number, index: true, unique: true, sparse: true },
          game: { type: mongoose.Schema.Types.ObjectId, ref: "Game", required: true, index: true },
          gameSqlId: { type: Number, index: true },
          resultDate: { type: String, required: true, index: true },
          result: { type: String, default: "" }
        },
        { timestamps: true }
      ).index({ game: 1, resultDate: 1 }, { unique: true })
    );

  const today = istDate();
  const yesterday = addDays(today, -1);

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

  const resultOps = [];
  const changedGames = [];
  for (const [name, resultTime, previousResult, todayResult] of games) {
    const game = await Game.findOneAndUpdate(
      { name: new RegExp(`^${escapeRegExp(name)}$`, "i") },
      { $set: { name, resultTime, isActive: true } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    changedGames.push(`${name} - ${resultTime}`);

    resultOps.push({
      updateOne: {
        filter: { game: game._id, resultDate: yesterday },
        update: { $set: { game: game._id, gameSqlId: game.sqlId, resultDate: yesterday, result: previousResult } },
        upsert: true
      }
    });
    resultOps.push({
      updateOne: {
        filter: { game: game._id, resultDate: today },
        update: { $set: { game: game._id, gameSqlId: game.sqlId, resultDate: today, result: todayResult } },
        upsert: true
      }
    });
  }

  await GameResult.bulkWrite(resultOps, { ordered: false });

  const activeGames = await Game.find({ isActive: true }).sort({ resultTime: 1, name: 1 });
  for (let index = 0; index < activeGames.length; index++) {
    activeGames[index].showIndex = index + 1;
    await activeGames[index].save();
  }

  console.log(`Upserted ${changedGames.length} home games.`);
  console.log(`Upserted ${resultOps.length} results for ${yesterday} and ${today}.`);
  console.log(changedGames.join("\n"));

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
