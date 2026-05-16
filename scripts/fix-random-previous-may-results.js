const fs = require("fs");
const mongoose = require("mongoose");

function loadEnv() {
  if (!fs.existsSync(".env")) return;
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function randomResult() {
  return String(Math.floor(Math.random() * 100)).padStart(2, "0");
}

const mayResults = {
  Dwarka: ["86", "48", "01", "27", "56", "36", "01", "85", "69", "37", "15", "40", "43", "73", "57"],
  Alwar: ["14", "33", "73", "36", "02", "12", "90", "24", "52", "28", "31", "92", "90", "41", "13"],
  Agra: ["64", "44", "12", "01", "68", "69", "39", "31", "19", "38", "07", "99", "42", "41", "78"],
  "Delhi Matka": ["61", "93", "55", "25", "28", "81", "17", "72", "14", "16", "41", "22", "79", "27", "70"],
  Gwalior: ["89", "12", "71", "09", "18", "15", "87", "92", "44", "35", "66", "15", "38", "86", "26"],
  "Sadar bazar": ["13", "87", "49", "47", "93", "06", "53", "77", "83", "09", "98", "68", "65", "02", "57"]
};

async function main() {
  loadEnv();
  if (!process.env.MONGODB_URI) throw new Error("Set MONGODB_URI in .env first.");

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

  let totalDeleted = 0;
  const operations = [];

  for (const [gameName, mayValues] of Object.entries(mayResults)) {
    const game = await Game.findOne({ name: new RegExp(`^${escapeRegExp(gameName)}$`, "i") });
    if (!game) throw new Error(`Game not found: ${gameName}`);

    const deleted = await GameResult.deleteMany({
      game: game._id,
      resultDate: { $gte: "2026-01-01", $lte: "2026-05-31" }
    });
    totalDeleted += deleted.deletedCount || 0;

    for (const month of ["01", "02", "03", "04"]) {
      for (let day = 1; day <= 31; day++) {
        const resultDate = `2026-${month}-${String(day).padStart(2, "0")}`;
        operations.push({
          updateOne: {
            filter: { game: game._id, resultDate },
            update: { $set: { game: game._id, gameSqlId: game.sqlId, resultDate, result: randomResult() } },
            upsert: true
          }
        });
      }
    }

    mayValues.forEach((result, index) => {
      const resultDate = `2026-05-${String(index + 1).padStart(2, "0")}`;
      operations.push({
        updateOne: {
          filter: { game: game._id, resultDate },
          update: { $set: { game: game._id, gameSqlId: game.sqlId, resultDate, result } },
          upsert: true
        }
      });
    });
  }

  await GameResult.bulkWrite(operations, { ordered: false });
  console.log(`Deleted ${totalDeleted} old Jan-May rows.`);
  console.log(`Upserted ${operations.length} corrected rows.`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
