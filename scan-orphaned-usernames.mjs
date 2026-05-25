#!/usr/bin/env node
/**
 * Findet alle verwaisten Username-Referenzen in den Neben-Collections.
 * Zeigt Usernames, die in einer Collection vorkommen, aber nicht mehr in `users` existieren.
 *
 * Nutzung: node scan-orphaned-usernames.mjs
 *
 * Danach fix-username-rename.mjs ausführen:
 *   node fix-username-rename.mjs <alterName> <neuerName>
 */
import { readFileSync } from "fs";
import { MongoClient } from "mongodb";

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
  console.error("MONGODB_URI ist nicht gesetzt.");
  process.exit(1);
}

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db(dbName);

  // Alle bekannten Usernames aus der users-Collection laden
  const allUsers = await db.collection("users")
    .find({}, { projection: { username: 1 } })
    .toArray();
  const knownUsernames = new Set(allUsers.map((u) => u.username));
  console.log(`${knownUsernames.size} bekannte User geladen.\n`);

  const orphans = new Map(); // orphanedUsername -> Set of collection names

  function markOrphan(username, collectionName) {
    if (!username || knownUsernames.has(username)) return;
    if (!orphans.has(username)) orphans.set(username, new Set());
    orphans.get(username).add(collectionName);
  }

  async function scanField(collectionName, field) {
    const docs = await db.collection(collectionName)
      .find({ [field]: { $exists: true } }, { projection: { [field]: 1 } })
      .toArray();
    for (const doc of docs) {
      markOrphan(doc[field], collectionName);
    }
  }

  async function scanArrayField(collectionName, arrayField, subField) {
    const path = subField ? `${arrayField}.${subField}` : arrayField;
    const docs = await db.collection(collectionName)
      .find({ [path]: { $exists: true } }, { projection: { [arrayField]: 1 } })
      .toArray();
    for (const doc of docs) {
      const arr = doc[arrayField];
      if (!Array.isArray(arr)) continue;
      for (const item of arr) {
        const val = subField ? item?.[subField] : item;
        markOrphan(val, collectionName);
      }
    }
  }

  // books
  await scanField("books", "ownerUsername");

  // discussions
  await scanField("discussions", "authorUsername");
  await scanArrayField("discussions", "replies", "authorUsername");
  await scanArrayField("discussions", "reactions", "username");

  // polls
  await scanField("polls", "authorUsername");
  await scanArrayField("polls", "votes", "username");
  await scanArrayField("polls", "replies", "authorUsername");

  // tausch
  await scanField("tausch", "authorUsername");

  // messages
  await scanField("messages", "senderUsername");
  await scanField("messages", "recipientUsername");

  // lesezeichen
  await scanField("lesezeichen", "username");

  // support
  await scanField("support", "username");

  // kalender_events
  await scanField("kalender_events", "createdBy");
  await scanArrayField("kalender_events", "participants", null);

  // buchzirkel
  await scanField("buchzirkel", "veranstalterUsername");
  await scanField("buchzirkel_bewerbungen", "bewerberUsername");
  await scanField("buchzirkel_teilnahmen", "teilnehmerUsername");
  await scanField("buchzirkel_beitraege", "autorUsername");
  await scanArrayField("buchzirkel_beitraege", "replies", "autorUsername");
  await scanArrayField("buchzirkel_beitraege", "reactions", "username");
  await scanField("buchzirkel_chat", "senderUsername");
  await scanArrayField("buchzirkel_chat", "readBy", null);

  if (orphans.size === 0) {
    console.log("Keine verwaisten Referenzen gefunden. Alles in Ordnung.");
  } else {
    console.log(`${orphans.size} verwaiste(r) Username(s) gefunden:\n`);
    for (const [username, collections] of orphans.entries()) {
      console.log(`  "${username}" kommt vor in: ${[...collections].join(", ")}`);
    }
    console.log(`\nFix-Befehl fuer jeden gefundenen Username ausfuehren:`);
    for (const [username] of orphans.entries()) {
      console.log(`  node fix-username-rename.mjs "${username}" <neuerUsername>`);
    }
  }
} finally {
  await client.close();
}
