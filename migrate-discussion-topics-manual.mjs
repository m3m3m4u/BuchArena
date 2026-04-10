/**
 * Manuelle Nachkorrektur der Themen-Zuordnung.
 * Aufruf: node migrate-discussion-topics-manual.mjs
 */

import { readFileSync } from "fs";
import { MongoClient } from "mongodb";

function loadEnv(path) {
  try {
    const lines = readFileSync(path, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {}
}
loadEnv(".env.local");
loadEnv(".env");

const uri = process.env.MONGODB_URI;
if (!uri) { console.error("MONGODB_URI fehlt"); process.exit(1); }

// Manuelles Mapping: Titel-Anfang → Thema
const MANUAL = [
  { match: "Was hat dich motiviert, ein Buch zu schreiben", topic: "Autorentipps" },
  { match: "Tipps & Tricks", topic: "Autorentipps" },
  { match: "Würdet ihr", topic: "Selfpublishing" },
  { match: "Habt ihr eine eigene Homepage", topic: "Buchmarketing" },
  { match: "Kennzeichnung eurer Bücher", topic: "Autorentipps" },
  { match: "Alles selbst machen", topic: "Selfpublishing" },
  { match: "Lesungen: Ein zweischneidiges Schwert", topic: "Veranstaltungen" },
  { match: "Buchtitel", topic: "Schreibtipps" },
];

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const dbName = process.env.MONGODB_DB_NAME ?? "bucharena";
  const db = client.db(dbName);
  const col = db.collection("discussions");

  let updated = 0;

  for (const rule of MANUAL) {
    const doc = await col.findOne({ title: { $regex: `^${rule.match}`, $options: "i" } });
    if (!doc) {
      console.log(`  NICHT GEFUNDEN: "${rule.match}"`);
      continue;
    }

    const titleShort = doc.title.length > 60 ? doc.title.slice(0, 57) + "..." : doc.title;
    const old = doc.topic || "Allgemein";
    if (old === rule.topic) {
      console.log(`  SKIP  "${titleShort}"  →  bereits: ${old}`);
      continue;
    }

    await col.updateOne({ _id: doc._id }, { $set: { topic: rule.topic } });
    console.log(`  ${old.padEnd(24)} →  ${rule.topic.padEnd(24)}  "${titleShort}"`);
    updated++;
  }

  console.log(`\n✓ ${updated} Diskussionen manuell aktualisiert.\n`);
  await client.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
