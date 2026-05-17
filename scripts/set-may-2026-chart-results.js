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
  return String(name).toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

const aliases = {
  "delhi bazar": ["delhi bazar", "delhi bazar"],
  "makka madina": ["makka madina", "makka-madina"]
};

const mayResults = {
  DESAWER: ["-", "79", "00", "27", "06", "03", "84", "06", "19", "62", "10", "08", "46", "76", "74", "73", "76"],
  GALI: ["54", "42", "74", "14", "87", "38", "33", "97", "64", "56", "83", "47", "58", "58", "35", "72", "-"],
  GHAZIABAD: ["15", "79", "93", "78", "15", "92", "47", "33", "44", "86", "43", "43", "08", "27", "17", "06", "-"],
  FARIDABAD: ["63", "72", "84", "08", "12", "70", "69", "48", "86", "46", "22", "28", "01", "05", "09", "80", "-"],
  "DELHI BAZAR": ["94", "39", "25", "69", "42", "30", "14", "64", "14", "17", "26", "47", "09", "41", "25", "61", "09"],
  "SHRI GANESH": ["48", "41", "86", "78", "69", "77", "94", "24", "08", "22", "17", "80", "12", "83", "79", "52", "20"],
  "SHIV DHAM": ["78", "29", "18", "13", "59", "66", "23", "76", "14", "35", "13", "21", "65", "33", "46", "56", "77"],
  "PUSHKAR BAZAR": ["05", "17", "12", "04", "41", "17", "29", "26", "88", "59", "19", "45", "32", "42", "86", "04", "92"],
  "DELHI METRO": ["66", "45", "46", "91", "37", "04", "61", "52", "87", "71", "34", "16", "07", "85", "16", "23", "46"],
  "SHRI SAYAM": ["07", "23", "08", "61", "28", "49", "51", "56", "93", "66", "93", "06", "29", "67", "81", "72", "04"],
  KOLMBIA: ["77", "78", "11", "23", "38", "58", "99", "78", "28", "33", "64", "49", "05", "39", "51", "03", "86"],
  "MAKKA MADINA": ["55", "78", "75", "77", "89", "43", "09", "08", "76", "54", "23", "04", "26", "31", "88", "53", "-"],
  "KALKA NIGHT": ["67", "71", "72", "29", "26", "46", "74", "49", "93", "92", "80", "28", "74", "41", "54", "88", "-"]
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

  const activeGames = await Game.find({ isActive: true }).lean();
  const gamesByName = new Map(activeGames.map((game) => [normalizeName(game.name), game]));
  const operations = [];
  const missing = [];

  for (const [rawName, values] of Object.entries(mayResults)) {
    const keys = aliases[normalizeName(rawName)] || [normalizeName(rawName)];
    const game = keys.map((key) => gamesByName.get(key)).find(Boolean);
    if (!game) {
      missing.push(rawName);
      continue;
    }

    values.forEach((result, index) => {
      const day = String(index + 1).padStart(2, "0");
      const resultDate = `2026-05-${day}`;
      operations.push({
        updateOne: {
          filter: { game: game._id, resultDate },
          update: { $set: { game: game._id, gameSqlId: game.sqlId, resultDate, result } },
          upsert: true
        }
      });
    });
  }

  if (missing.length) throw new Error(`Active games not found: ${missing.join(", ")}`);

  await GameResult.bulkWrite(operations, { ordered: false });
  console.log(`Upserted ${operations.length} May 2026 chart results.`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
