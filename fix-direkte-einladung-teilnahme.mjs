#!/usr/bin/env node
/**
 * Repariert fehlende Bewerbungs-Dokumente für direkt eingeladene Buchzirkel-Teilnehmer.
 * Solche Nutzer haben eine Teilnahme aber kein Bewerbungs-Dokument, weshalb sie
 * im Dashboard unter "Teilnehmer" nicht angezeigt werden.
 *
 * Nutzung: node fix-direkte-einladung-teilnahme.mjs [buchzirkelId] [username]
 * Ohne Argumente: repariert ALLE betroffenen Datensätze.
 */
import { readFileSync } from "fs";
import { MongoClient, ObjectId } from "mongodb";

// .env.local manuell laden
try {
  const envContent = readFileSync(".env.local", "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch { /* ignore */ }

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME ?? "bucharena";

if (!uri) {
  console.error("MONGODB_URI fehlt in .env.local");
  process.exit(1);
}

const filterBuchzirkelId = process.argv[2];
const filterUsername = process.argv[3];

const client = new MongoClient(uri);
try {
  await client.connect();
  const db = client.db(dbName);
  const teilnahmen = db.collection("buchzirkel_teilnahmen");
  const bewerbungen = db.collection("buchzirkel_bewerbungen");

  // Alle Teilnahmen laden (optional gefiltert)
  const query = {};
  if (filterBuchzirkelId) query.buchzirkelId = new ObjectId(filterBuchzirkelId);
  if (filterUsername) query.teilnehmerUsername = filterUsername;

  const alleTeilnahmen = await teilnahmen.find(query).toArray();
  console.log(`Gefundene Teilnahmen: ${alleTeilnahmen.length}`);

  let fixed = 0;
  for (const t of alleTeilnahmen) {
    const bewerb = await bewerbungen.findOne({
      buchzirkelId: t.buchzirkelId,
      bewerberUsername: t.teilnehmerUsername,
    });
    if (!bewerb) {
      console.log(`  -> Fehlende Bewerbung für ${t.teilnehmerUsername} im Zirkel ${t.buchzirkelId}`);
      await bewerbungen.insertOne({
        buchzirkelId: t.buchzirkelId,
        bewerberUsername: t.teilnehmerUsername,
        status: "angenommen",
        antworten: [],
        agbAkzeptiert: false,
        bewirbtSichAm: t.beigetreten ?? new Date(),
        entschiedenAm: t.beigetreten ?? new Date(),
      });
      fixed++;
    }
  }

  console.log(`\nFertig. ${fixed} Bewerbungs-Dokument(e) angelegt.`);
} finally {
  await client.close();
}
