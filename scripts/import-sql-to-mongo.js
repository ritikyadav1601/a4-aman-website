const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

function tableInsertBlocks(sql, table) {
  const regex = new RegExp("INSERT INTO `" + table + "` \\(([^)]+)\\) VALUES\\s*([\\s\\S]*?);", "g");
  const blocks = [];
  let match;
  while ((match = regex.exec(sql))) {
    const columns = match[1].split(",").map((column) => column.replace(/[` ]/g, ""));
    blocks.push({ columns, values: match[2] });
  }
  return blocks;
}

function parseRows(values) {
  const rows = [];
  let row = [];
  let value = "";
  let inString = false;
  let escaping = false;
  let inRow = false;

  for (let i = 0; i < values.length; i++) {
    const char = values[i];
    if (!inRow) {
      if (char === "(") {
        inRow = true;
        row = [];
        value = "";
      }
      continue;
    }
    if (escaping) {
      value += char;
      escaping = false;
      continue;
    }
    if (char === "\\" && inString) {
      escaping = true;
      continue;
    }
    if (char === "'") {
      inString = !inString;
      continue;
    }
    if (!inString && char === ",") {
      row.push(cleanValue(value));
      value = "";
      continue;
    }
    if (!inString && char === ")") {
      row.push(cleanValue(value));
      rows.push(row);
      inRow = false;
      value = "";
      continue;
    }
    value += char;
  }
  return rows;
}

function cleanValue(value) {
  const trimmed = value.trim();
  if (trimmed.toUpperCase() === "NULL") return null;
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
  return trimmed.replace(/\\'/g, "'");
}

function rowsFor(sql, table) {
  return tableInsertBlocks(sql, table).flatMap((block) =>
    parseRows(block.values).map((values) => Object.fromEntries(block.columns.map((column, index) => [column, values[index]])))
  );
}

async function bulkWriteInBatches(Model, operations, label, size = 1000) {
  for (let index = 0; index < operations.length; index += size) {
    const batch = operations.slice(index, index + size);
    if (batch.length) await Model.bulkWrite(batch, { ordered: false });
    console.log(`Imported ${Math.min(index + batch.length, operations.length)}/${operations.length} ${label}.`);
  }
}

async function main() {
  loadEnv();
  const args = process.argv.slice(2);
  const reset = args.includes("--reset");
  const sqlPathArg = args.find((arg) => arg !== "--reset");
  const sqlPath = sqlPathArg || path.resolve(process.cwd(), "../murgan_kalkasatta.sql");
  if (!process.env.MONGODB_URI) throw new Error("Set MONGODB_URI in .env first.");
  const sql = fs.readFileSync(sqlPath, "utf8");

  await mongoose.connect(process.env.MONGODB_URI);

  const Game = mongoose.models.Game || mongoose.model("Game", new mongoose.Schema({
    sqlId: { type: Number, unique: true, sparse: true },
    name: String,
    code: String,
    resultTime: String,
    isActive: Boolean,
    showIndex: Number,
    mid: Number
  }, { timestamps: true }));
  const GameResult = mongoose.models.GameResult || mongoose.model("GameResult", new mongoose.Schema({
    sqlId: { type: Number, unique: true, sparse: true },
    game: { type: mongoose.Schema.Types.ObjectId, ref: "Game", index: true },
    gameSqlId: Number,
    resultDate: String,
    result: String
  }, { timestamps: true }).index({ game: 1, resultDate: 1 }, { unique: true }));
  const Ad = mongoose.models.Ad || mongoose.model("Ad", new mongoose.Schema({
    sqlId: { type: Number, unique: true, sparse: true },
    gpayNumber: String,
    whatsappNumber: String,
    khaiwalName: String,
    website: String
  }, { timestamps: true }));
  const Contact = mongoose.models.Contact || mongoose.model("Contact", new mongoose.Schema({
    sqlId: { type: Number, unique: true, sparse: true },
    name: String,
    contactNumber: String
  }, { timestamps: true }));
  const User = mongoose.models.User || mongoose.model("User", new mongoose.Schema({
    sqlId: { type: Number, unique: true, sparse: true },
    name: String,
    email: { type: String, unique: true },
    password: String
  }, { timestamps: true }));

  if (reset) {
    await Promise.all([
      Game.deleteMany({}),
      GameResult.deleteMany({}),
      Ad.deleteMany({}),
      Contact.deleteMany({}),
      User.deleteMany({})
    ]);
    console.log("Cleared existing MongoDB app data.");
  }

  const games = rowsFor(sql, "tbl_game");
  await bulkWriteInBatches(
    Game,
    games.map((row) => ({
      updateOne: {
        filter: { sqlId: row.id },
        update: {
          $set: {
            sqlId: row.id,
            name: row.name,
            code: row.code,
            resultTime: row.result_time,
            isActive: row.isactive === 1,
            showIndex: row.showindex || 0,
            mid: row.mid || 0
          }
        },
        upsert: true
      }
    })),
    "games"
  );

  const gameDocs = await Game.find({ sqlId: { $in: games.map((row) => row.id) } }).select({ _id: 1, sqlId: 1 }).lean();
  const gameMap = new Map(gameDocs.map((game) => [game.sqlId, game._id]));
  const resultRows = rowsFor(sql, "tbl_game_result");
  await bulkWriteInBatches(
    GameResult,
    resultRows.flatMap((row) => {
      const game = gameMap.get(row.gameid);
      if (!game) return [];
      return [{
        updateOne: {
          filter: { game, resultDate: row.result_date },
          update: { $set: { sqlId: row.id, game, gameSqlId: row.gameid, resultDate: row.result_date, result: row.result || "" } },
          upsert: true
        }
      }];
    }),
    "results"
  );

  const adRows = rowsFor(sql, "tbl_ad");
  await bulkWriteInBatches(
    Ad,
    adRows.map((row) => ({
      updateOne: {
        filter: { sqlId: row.id },
        update: { $set: { sqlId: row.id, gpayNumber: row.gpaynumber || "", whatsappNumber: row.whatsappnumber || "", khaiwalName: row.khaiwalname || "", website: row.website || "" } },
        upsert: true
      }
    })),
    "ads"
  );

  const contactRows = rowsFor(sql, "tbl_contact");
  await bulkWriteInBatches(
    Contact,
    contactRows.map((row) => ({
      updateOne: {
        filter: { sqlId: row.id },
        update: { $set: { sqlId: row.id, name: row.name || "", contactNumber: row.contactnumber || "" } },
        upsert: true
      }
    })),
    "contacts"
  );

  const userRows = rowsFor(sql, "users");
  await bulkWriteInBatches(
    User,
    userRows.map((row) => ({
      updateOne: {
        filter: { email: row.email },
        update: { $set: { sqlId: row.id, name: row.name || "Admin", email: row.email, password: String(row.password || "").replace(/^\$2y\$/, "$2b$") } },
        upsert: true
      }
    })),
    "users"
  );

  console.log(`Imported ${games.length} games and ${resultRows.length} results.`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
