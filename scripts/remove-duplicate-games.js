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

function normalizeName(name = "") {
  return String(name).toLowerCase().trim();
}

function resultScore(results) {
  return results.filter((row) => row.result && String(row.result).toUpperCase() !== "XX").length;
}

const duplicateNames = new Set(["delhi bazar", "shri ganesh"]);

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

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

  const activeGames = await Game.find({ isActive: true }).sort({ resultTime: 1, createdAt: 1 }).lean();
  const grouped = activeGames.reduce((map, game) => {
    const key = normalizeName(game.name);
    if (!duplicateNames.has(key)) return map;
    const list = map.get(key) || [];
    list.push(game);
    map.set(key, list);
    return map;
  }, new Map());

  const changes = [];
  for (const [key, games] of grouped.entries()) {
    if (games.length < 2) {
      changes.push(`No duplicate active records for ${key}.`);
      continue;
    }

    const scored = [];
    for (const game of games) {
      const results = await GameResult.find({ game: game._id }).lean();
      scored.push({ game, score: resultScore(results), results: results.length });
    }

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.results !== a.results) return b.results - a.results;
      return new Date(a.game.createdAt) - new Date(b.game.createdAt);
    });

    const keep = scored[0];
    const remove = scored.slice(1);
    changes.push(`Keeping ${keep.game.name} (${keep.game._id}) with ${keep.score} real results.`);

    for (const item of remove) {
      await Game.updateOne({ _id: item.game._id }, { $set: { isActive: false, showIndex: 0 } });
      changes.push(`Deactivated ${item.game.name} (${item.game._id}) with ${item.score} real results.`);
    }
  }

  const remainingActive = await Game.find({ isActive: true }).sort({ resultTime: 1, name: 1 });
  for (let index = 0; index < remainingActive.length; index++) {
    remainingActive[index].showIndex = index + 1;
    await remainingActive[index].save();
  }

  console.log(changes.join("\n"));
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
