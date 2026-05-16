const fs = require("fs");
const mongoose = require("mongoose");

function loadEnv() {
  if (!fs.existsSync(".env")) return;
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

const values = [
  "84", "19", "70", "82", "65", "42", "51", "81", "04", "86", "61", "67", "37", "40", "66", "08", "70", "50", "12", "74", "42", "13", "65", "32", "41", "88", "79", "52", "22", "97", "98",
  "35", "99", "87", "83", "58", "97", "74", "36", "06", "92", "72", "52", "36", "22", "34", "83", "10", "84", "14", "50", "89", "90", "88", "72", "58", "10", "47", "26", "07", "59", "94",
  "56", "74", "12", "22", "46", "52", "69", "16", "67", "88", "79", "03", "41", "35", "61", "28", "53", "07", "80", "75", "82", "59", "32", "30", "24", "23", "91", "96", "87", "63", "08",
  "90", "12", "48", "82", "02", "55", "69", "34", "68", "56", "42", "41", "60", "32", "91", "13", "60", "12", "87", "93", "72", "35", "35", "35", "35", "35", "99", "13", "87", "49", "47",
  "93", "06", "53", "77", "83", "09", "98", "68", "65", "02", "57"
];

const months = ["01", "02", "03", "04", "05"];

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

  const game = await Game.findOne({ name: /^Sadar bazar$/i });
  if (!game) throw new Error("Game not found: Sadar bazar");

  const operations = values.map((result, index) => {
    const month = months[Math.floor(index / 31)];
    const day = (index % 31) + 1;
    const resultDate = `2026-${month}-${String(day).padStart(2, "0")}`;
    return {
      updateOne: {
        filter: { game: game._id, resultDate },
        update: { $set: { game: game._id, gameSqlId: game.sqlId, resultDate, result } },
        upsert: true
      }
    };
  });

  await GameResult.bulkWrite(operations, { ordered: false });
  console.log(`Upserted ${operations.length} Sadar bazar chart results.`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
