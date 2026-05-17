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

const monthNumbers = {
  JAN: "01",
  FEB: "02",
  MAR: "03",
  APR: "04",
  MAY: "05"
};

const results = {
  JAN: {
    1: "73", 2: "26", 3: "91", 4: "58", 5: "67", 6: "68", 7: "92", 8: "77", 9: "32", 10: "34",
    11: "51", 12: "40", 13: "93", 14: "98", 15: "05", 16: "56", 17: "00", 18: "10", 19: "01", 20: "26",
    21: "76", 22: "82", 23: "71", 24: "33", 25: "48", 26: "80", 27: "28", 28: "79", 29: "67", 30: "47",
    31: "-"
  },
  FEB: {
    1: "89", 2: "59", 3: "80", 4: "04", 5: "54", 6: "69", 7: "75", 8: "60", 9: "12", 10: "52",
    11: "27", 12: "86", 13: "64", 14: "16", 15: "75", 16: "95", 17: "64", 18: "10", 19: "68", 20: "92",
    21: "07", 22: "98", 23: "46", 24: "88", 25: "68", 26: "01", 27: "30", 28: "-"
  },
  MAR: {
    1: "52", 2: "18", 3: "60", 4: "12", 5: "03", 6: "63", 7: "12", 8: "41", 9: "54", 10: "70",
    11: "11", 12: "09", 13: "90", 14: "24", 15: "-", 16: "18", 17: "68", 18: "45", 19: "78", 20: "87",
    21: "21", 22: "04", 23: "67", 24: "71", 25: "48", 26: "98", 27: "49", 28: "45", 29: "77", 30: "30",
    31: "-"
  },
  APR: {
    1: "27", 2: "66", 3: "60", 4: "95", 5: "37", 6: "81", 7: "26", 8: "85", 9: "50", 10: "73",
    11: "19", 12: "86", 13: "40", 14: "33", 15: "07", 16: "16", 17: "20", 18: "63", 19: "91", 20: "49",
    21: "40", 22: "04", 23: "09", 24: "68", 25: "64", 26: "04", 27: "16", 28: "25", 29: "12", 30: "-"
  },
  MAY: {
    1: "36", 2: "56", 3: "44", 4: "80", 5: "63", 6: "19", 7: "86", 8: "13", 9: "90", 10: "24",
    11: "77", 12: "55", 13: "10", 14: "50", 15: "32", 16: "09", 17: "-"
  }
};

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

  const game = await Game.findOne({ name: new RegExp(`^${escapeRegExp("Fatehabad")}$`, "i") });
  if (!game) throw new Error("Game not found: Fatehabad");

  const operations = [];
  for (const [month, days] of Object.entries(results)) {
    for (const [day, result] of Object.entries(days)) {
      const resultDate = `2026-${monthNumbers[month]}-${String(day).padStart(2, "0")}`;
      operations.push({
        updateOne: {
          filter: { game: game._id, resultDate },
          update: { $set: { game: game._id, gameSqlId: game.sqlId, resultDate, result } },
          upsert: true
        }
      });
    }
  }

  await GameResult.bulkWrite(operations, { ordered: false });
  console.log(`Upserted ${operations.length} Fatehabad 2026 results.`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
