#!/usr/bin/env node

const fs = require("fs");
const mongoose = require("mongoose");

const LEGACY_GAMES = [
  ["disawer", "Desawer", "05:18"],
  ["desawer", "Desawer", "05:18"],
  ["desawar", "Desawer", "05:18"],
  ["sadar-bazar", "Sadar bazar", "13:39"],
  ["delhi-darbar", "Delhi Darbar", "14:10"],
  ["gwalior", "Gwalior", "14:39"],
  ["delhi-bazar", "Delhi BAZAR", "15:15"],
  ["new-ganga", "New Ganga", "15:30"],
  ["delhi-matka", "Delhi Matka", "15:39"],
  ["shri-ganesh", "Shri Ganesh", "16:35"],
  ["agra", "Agra", "17:29"],
  ["faridabad", "Faridabad", "17:55"],
  ["fatehabad", "Fatehabad", "19:00"],
  ["alwar", "Alwar", "19:34"],
  ["mandi-bazar", "Mandi Bazar", "20:10"],
  ["ghaziabad-king", "Ghaziabad King", "20:30"],
  ["gaziabad-king", "Ghaziabad King", "20:30"],
  ["ghaziabad", "Ghaziabad", "21:00"],
  ["gaziabad", "Ghaziabad", "21:00"],
  ["dwarka", "Dwarka", "22:34"],
  ["gali", "Gali", "00:10"]
];

const gameBySlug = new Map(LEGACY_GAMES.map(([slug, name, resultTime]) => [slug, { slug, name, resultTime }]));

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  loadEnv();
  const args = parseArgs(process.argv.slice(2));

  if (!process.env.MONGODB_URI) {
    throw new Error("Missing MONGODB_URI in environment.");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 8000
  });

  const db = mongoose.connection.db;
  const legacyResults = await db.collection("results").find({}).sort({ date: 1, createdAt: 1 }).toArray();
  const legacySlugs = [...new Set(legacyResults.map((row) => normalizeSlug(row.game)).filter(Boolean))];
  const unmappedSlugs = legacySlugs.filter((slug) => !gameBySlug.has(slug));
  const mappedSlugs = legacySlugs.filter((slug) => gameBySlug.has(slug));

  const report = {
    dryRun: args.dryRun,
    legacyResults: legacyResults.length,
    legacyGames: legacySlugs.length,
    mappedGames: mappedSlugs.length,
    unmappedSlugs,
    gamesInserted: 0,
    gamesExisting: 0,
    resultsInserted: 0,
    resultsUpdated: 0,
    resultsUnchanged: 0,
    resultsSkipped: 0
  };

  const games = await ensureGames(db, mappedSlugs, report, args.dryRun);
  await migrateResults(db, legacyResults, games, report, args.dryRun);

  printReport(report);
  await mongoose.disconnect();
}

async function ensureGames(db, slugs, report, dryRun) {
  const gamesCollection = db.collection("games");
  const canonicalGames = uniqueByName(slugs.map((slug) => gameBySlug.get(slug)));
  const existingRows = await gamesCollection
    .find({
      $or: canonicalGames.flatMap((game) => [{ name: game.name }, { code: game.slug }])
    })
    .toArray();
  const existingByName = new Map(existingRows.map((game) => [normalizeName(game.name), game]));
  const existingByCode = new Map(existingRows.map((game) => [normalizeSlug(game.code), game]));
  const gamesBySlug = new Map();
  const now = new Date();
  let showIndex = 1;

  for (const game of canonicalGames) {
    const existing = existingByName.get(normalizeName(game.name)) || existingByCode.get(game.slug);
    if (existing) {
      report.gamesExisting++;
      gamesBySlug.set(game.slug, existing);
    } else {
      const doc = {
        _id: new mongoose.Types.ObjectId(),
        name: game.name,
        code: game.slug,
        resultTime: game.resultTime,
        isActive: true,
        showIndex,
        mid: 0,
        createdAt: now,
        updatedAt: now
      };
      report.gamesInserted++;
      gamesBySlug.set(game.slug, doc);
      if (!dryRun) await gamesCollection.insertOne(doc);
    }
    showIndex++;
  }

  for (const slug of slugs) {
    const canonical = gameBySlug.get(slug);
    const game = gamesBySlug.get(canonical.slug) || existingByName.get(normalizeName(canonical.name));
    if (game) gamesBySlug.set(slug, game);
  }

  return gamesBySlug;
}

async function migrateResults(db, legacyResults, gamesBySlug, report, dryRun) {
  const gameResultsCollection = db.collection("gameresults");
  const candidates = [];

  for (const row of legacyResults) {
    const slug = normalizeSlug(row.game);
    const game = gamesBySlug.get(slug);
    const resultDate = normalizeDate(row.date);
    const result = String(row.resultNumber || "").trim();

    if (!game || !resultDate || !result) {
      report.resultsSkipped++;
      continue;
    }

    candidates.push({ legacy: row, game, resultDate, result });
  }

  const existingRows = candidates.length
    ? await gameResultsCollection
        .find({
          $or: candidates.map(({ game, resultDate }) => ({ game: game._id, resultDate }))
        })
        .project({ game: 1, resultDate: 1, result: 1 })
        .toArray()
    : [];
  const existingByGameDate = new Map(existingRows.map((row) => [`${String(row.game)}:${row.resultDate}`, row]));
  const writes = [];

  for (const candidate of candidates) {
    const key = `${String(candidate.game._id)}:${candidate.resultDate}`;
    const existing = existingByGameDate.get(key);
    if (existing?.result === candidate.result) {
      report.resultsUnchanged++;
      continue;
    }

    if (existing) report.resultsUpdated++;
    else report.resultsInserted++;

    writes.push({
      updateOne: {
        filter: { game: candidate.game._id, resultDate: candidate.resultDate },
        update: {
          $set: {
            game: candidate.game._id,
            gameSqlId: candidate.game.sqlId,
            resultDate: candidate.resultDate,
            result: candidate.result,
            updatedAt: candidate.legacy.updatedAt || new Date()
          },
          $setOnInsert: {
            createdAt: candidate.legacy.createdAt || new Date()
          }
        },
        upsert: true
      }
    });
  }

  if (!dryRun && writes.length) {
    await gameResultsCollection.bulkWrite(writes, { ordered: false });
  }
}

function uniqueByName(games) {
  const seen = new Set();
  return games.filter((game) => {
    const key = normalizeName(game.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeSlug(value = "") {
  return String(value).trim().toLowerCase();
}

function normalizeName(value = "") {
  return String(value).trim().toLowerCase();
}

function normalizeDate(value) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

function parseArgs(args) {
  return {
    dryRun: args.includes("--dry-run")
  };
}

function printReport(report) {
  console.log(`${report.dryRun ? "Dry run" : "Migration"} complete`);
  console.log(`Legacy results found: ${report.legacyResults}`);
  console.log(`Legacy games found: ${report.legacyGames}`);
  console.log(`Mapped games: ${report.mappedGames}`);
  console.log(`Games inserted: ${report.gamesInserted}`);
  console.log(`Games already existing: ${report.gamesExisting}`);
  console.log(`Results inserted: ${report.resultsInserted}`);
  console.log(`Results updated: ${report.resultsUpdated}`);
  console.log(`Results unchanged: ${report.resultsUnchanged}`);
  console.log(`Results skipped: ${report.resultsSkipped}`);
  if (report.unmappedSlugs.length) {
    console.log(`Unmapped legacy games: ${report.unmappedSlugs.join(", ")}`);
  }
}
