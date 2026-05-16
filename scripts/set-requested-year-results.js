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

const data = {
  "Shirdi Dham": {
    FEB: { 27: "45" },
    MAR: {
      1: "65", 2: "38", 3: "31", 4: "40", 5: "31", 6: "85", 7: "26", 8: "77", 9: "95", 10: "64",
      11: "39", 12: "52", 13: "44", 14: "07", 15: "17", 16: "19", 17: "26", 18: "85", 19: "03", 20: "27",
      21: "42", 22: "52", 23: "07", 24: "87", 25: "04", 26: "01", 27: "35", 28: "28", 29: "93", 30: "32"
    },
    APR: {
      1: "15", 2: "57", 3: "86", 4: "51", 5: "02", 6: "42", 7: "26", 8: "92", 9: "27", 10: "97",
      11: "49", 12: "55", 13: "75", 14: "05", 15: "15", 16: "96", 17: "72", 18: "78", 19: "22", 20: "39",
      21: "61", 22: "60", 23: "49", 24: "11", 25: "86", 26: "73", 27: "78", 28: "53", 29: "71"
    },
    MAY: {
      1: "89", 2: "71", 3: "68", 4: "32", 5: "93", 6: "07", 7: "13", 8: "37", 9: "82", 10: "26",
      11: "10", 12: "99", 13: "25", 14: "50", 15: "19"
    }
  },
  Kaliyar: {
    MAR: {
      1: "90", 2: "13", 3: "52", 4: "75", 5: "16", 6: "36", 7: "14", 8: "03", 9: "45", 10: "31",
      11: "92", 12: "57", 13: "32", 14: "70", 15: "68", 16: "00", 17: "87", 18: "25", 19: "26", 20: "13",
      21: "82", 22: "61", 23: "76", 24: "52", 25: "80", 26: "58", 27: "65", 28: "82", 29: "31", 30: "29"
    },
    APR: {
      1: "44", 2: "18", 3: "40", 4: "96", 5: "32", 6: "83", 7: "93", 8: "05", 9: "45", 10: "18",
      11: "40", 12: "06", 13: "77", 14: "43", 15: "61", 16: "69", 17: "68", 18: "87", 19: "35", 20: "59",
      21: "49", 22: "81", 23: "08", 24: "90", 25: "71", 26: "52", 27: "85", 28: "35", 29: "73"
    },
    MAY: {
      1: "95", 2: "11", 3: "01", 4: "82", 5: "18", 6: "16", 7: "11", 8: "55", 9: "15", 10: "62",
      11: "98", 12: "80", 13: "82", 14: "11", 15: "18"
    }
  },
  "Shakti Peeth": {
    MAR: {
      1: "20", 2: "63", 3: "67", 4: "56", 5: "63", 6: "30", 7: "05", 8: "72", 9: "45", 10: "70",
      11: "68", 12: "60", 13: "75", 14: "58", 15: "48", 16: "12", 17: "41", 18: "82", 19: "08", 20: "63",
      21: "24", 22: "29", 23: "01", 24: "12", 25: "37", 26: "81", 27: "82", 28: "60", 29: "02", 30: "24"
    },
    APR: {
      1: "97", 2: "48", 3: "03", 4: "61", 5: "92", 6: "63", 7: "28", 8: "55", 9: "16", 10: "48",
      11: "81", 12: "68", 13: "01", 14: "56", 15: "78", 16: "66", 17: "16", 18: "09", 19: "78", 20: "99",
      21: "93", 22: "94", 23: "32", 24: "13", 25: "93", 26: "57", 27: "98", 28: "23", 29: "88"
    },
    MAY: {
      1: "36", 2: "96", 3: "43", 4: "20", 5: "24", 6: "85", 7: "11", 8: "69", 9: "81", 10: "41",
      11: "53", 12: "16", 13: "96", 14: "53", 15: "79"
    }
  },
  Mathura: {
    MAR: {
      1: "11", 2: "84", 3: "43", 4: "29", 5: "93", 6: "79", 7: "80", 8: "50", 9: "60", 10: "54",
      11: "43", 12: "87", 13: "30", 14: "55", 15: "31", 16: "32", 17: "36", 18: "31", 19: "46", 20: "90",
      21: "64", 22: "73", 23: "45", 24: "34", 25: "29", 26: "17", 27: "90", 28: "76", 29: "52", 30: "51"
    },
    APR: {
      1: "65", 2: "03", 3: "28", 4: "12", 5: "09", 6: "70", 7: "89", 8: "53", 9: "51", 10: "39",
      11: "94", 12: "33", 13: "87", 14: "38", 15: "13", 16: "26", 17: "25", 18: "35", 19: "00", 20: "15",
      21: "20", 22: "24", 23: "41", 24: "19", 25: "23", 26: "96", 27: "66", 28: "67", 29: "70"
    },
    MAY: {
      1: "13", 2: "90", 3: "10", 4: "26", 5: "45", 6: "75", 7: "75", 8: "60", 9: "74", 10: "63",
      11: "13", 12: "49", 13: "85", 14: "34", 15: "03"
    }
  }
};

const monthNumbers = {
  JAN: "01",
  FEB: "02",
  MAR: "03",
  APR: "04",
  MAY: "05",
  JUN: "06",
  JUL: "07",
  AUG: "08",
  SEP: "09",
  OCT: "10",
  NOV: "11",
  DEC: "12"
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

  const operations = [];
  for (const [gameName, months] of Object.entries(data)) {
    const game = await Game.findOne({ name: new RegExp(`^${escapeRegExp(gameName)}$`, "i") });
    if (!game) throw new Error(`Game not found: ${gameName}`);

    for (const [month, days] of Object.entries(months)) {
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
  }

  await GameResult.bulkWrite(operations, { ordered: false });
  console.log(`Upserted ${operations.length} yearly chart results.`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
