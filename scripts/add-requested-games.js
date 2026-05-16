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

const requestedGames = [
  ["Sadar bazar", "13:39:00"],
  ["Gwalior", "14:39:00"],
  ["Delhi Matka", "15:39:00"],
  ["Agra", "17:29:00"],
  ["Alwar", "19:34:00"],
  ["Dwarka", "22:34:00"],
  ["Shirdi Dham", "13:33:00"],
  ["Kaliyar", "14:37:00"],
  ["Shakti Peeth", "19:40:00"],
  ["Mathura", "22:32:00"],
  ["Delhi Darbar", "14:10:00"],
  ["New Ganga", "15:30:00"],
  ["Fatehabad", "19:00:00"],
  ["Mandi Bazar", "20:10:00"],
  ["Ghaziabad City", "20:30:00"]
];

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

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

  const changes = [];
  for (const [name, resultTime] of requestedGames) {
    const existing = await Game.findOne({ name: new RegExp(`^${escapeRegExp(name)}$`, "i") });
    if (existing) {
      existing.name = name;
      existing.resultTime = resultTime;
      existing.isActive = true;
      await existing.save();
      changes.push(`updated ${name} - ${resultTime}`);
    } else {
      await Game.create({ name, code: "", resultTime, isActive: true, showIndex: 0, mid: 0 });
      changes.push(`added ${name} - ${resultTime}`);
    }
  }

  const activeGames = await Game.find({ isActive: true }).sort({ resultTime: 1, name: 1 });
  for (let index = 0; index < activeGames.length; index++) {
    activeGames[index].showIndex = index + 1;
    await activeGames[index].save();
  }

  console.log(changes.join("\n"));
  console.log(`Active games now: ${activeGames.length}`);
  console.log(activeGames.map((game) => `${String(game.showIndex).padStart(2, "0")}. ${game.name} - ${game.resultTime}`).join("\n"));

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
