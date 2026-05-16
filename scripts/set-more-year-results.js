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

const charts = {
  Gwalior: `
49 42 84 03 80 86 11 66 93 25 74 35 97 21 18 13 41 58 48 02 43 99 61 46 64 86 18 17 37 02 16
83 12 90 29 27 32 54 49 16 76 99 92 12 94 39 18 91 32 21 04 44 12 46 23 76 02 29 49 78 20 31
20 13 43 78 58 29 79 61 68 34 96 55 60 22 42 41 61 48 45 10 62 02 17 57 69 78 57 42 25 04 11
58 84 94 94 84 81 61 02 71 78 35 91 11 96 28 25 85 17 21 07 92 11 86 89 12 71 09 18 15 87 92
44 35 66 15 38 86 26
`,
  "Delhi Matka": `
79 88 23 25 71 79 18 32 98 06 29 89 81 33 13 63 52 42 65 11 64 36 32 47 05 94 31 24 70 11 44
49 26 35 92 26 04 94 19 97 82 74 69 03 45 52 13 73 80 75 74 14 48 98 30 61 92 42 63 73 04 28
33 92 02 68 82 61 24 42 94 24 03 70 71 37 87 29 23 39 76 72 24 18 92 14 19 52 49 48 61 78 84
68 51 32 19 58 82 61 67 92 81 71 84 73 21 96 81 29 46 36 17 97 85 68 61 93 55 25 28 81 17 72
14 16 41 22 79 27 70
`,
  Agra: `
22 51 34 71 52 78 07 74 47 95 80 65 64 58 94 98 84 72 54 06 74 80 75 78 01 86 59 23 38 23 86
32 63 93 61 22 28 31 25 18 50 34 33 56 27 55 49 18 86 62 38 08 66 29 52 78 74 37 58 29 21 73
30 57 14 59 86 31 13 36 08 98 71 15 80 93 79 83 42 47 51 61 29 89 31 44 26 39 73 69 22 86 24
57 22 67 46 39 77 04 75 94 41 87 34 92 55 33 17 80 22 62 98 17 52 83 64 44 12 01 68 69 39 31
19 38 07 99 42 41 78
`,
  Alwar: `
12 04 80 21 52 05 46 62 29 91 21 45 16 15 18 97 49 68 80 24 87 29 48 28 31 16 53 04 58 17 28
84 72 03 18 71 36 91 76 64 21 19 14 90 13 02 38 31 92 80 39 36 82 89 97 01 09 85 91 24 96 82
41 74 16 19 97 05 42 74 53 28 41 42 27 48 88 93 02 15 42 15 83 11 87 14 65 41 05 73 97 43 51
46 52 04 63 08 89 85 81 16 99 25 13 62 21 79 73 43 06 79 51 60 01 92 14 33 73 36 02 12 90 24
52 28 31 92 90 41 13
`,
  Dwarka: `
97 64 71 39 86 23 27 61 85 76 43 98 78 37 30 10 88 72 46 34 88 09 70 27 08 38 61 62 91 38 39
07 45 12 45 47 20 36 98 93 46 73 62 47 62 72 33 50 31 07 10 17 13 75 88 99 85 04 47 52 06 86
95 01 62 64 76 85 14 38 22 89 28 16 28 44 76 30 56 09 77 93 62 02 53 19 82 94 14 81 02 50 12
59 41 14 25 90 53 62 04 07 80 26 27 81 43 18 92 79 58 83 99 97 35 71 86 48 01 27 56 36 01 85
69 37 15 40 43 73 57
`
};

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

  const operations = [];
  for (const [gameName, rawValues] of Object.entries(charts)) {
    const game = await Game.findOne({ name: new RegExp(`^${escapeRegExp(gameName)}$`, "i") });
    if (!game) throw new Error(`Game not found: ${gameName}`);

    const values = rawValues.trim().split(/\s+/);
    console.log(`${gameName}: ${values.length} values`);
    for (let index = 0; index < values.length; index++) {
      const month = months[Math.floor(index / 31)];
      const day = (index % 31) + 1;
      const resultDate = `2026-${month}-${String(day).padStart(2, "0")}`;
      operations.push({
        updateOne: {
          filter: { game: game._id, resultDate },
          update: { $set: { game: game._id, gameSqlId: game.sqlId, resultDate, result: values[index] } },
          upsert: true
        }
      });
    }
  }

  await GameResult.bulkWrite(operations, { ordered: false });
  console.log(`Upserted ${operations.length} chart results.`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
