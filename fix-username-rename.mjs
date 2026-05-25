#!/usr/bin/env node
/**
 * Repariert fehlende Username-Referenzen nach einer Umbenennung.
 * Aktualisiert alle Collections, die den alten Username noch referenzieren.
 *
 * Nutzung: node fix-username-rename.mjs <altername> <neuerName>
 * Beispiel: node fix-username-rename.mjs MaxMuster MaxMuster2024
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

const oldUsername = process.argv[2]?.trim();
const newUsername = process.argv[3]?.trim();

if (!oldUsername || !newUsername) {
  console.error("Aufruf: node fix-username-rename.mjs <alteName> <neuerName>");
  process.exit(1);
}

if (oldUsername === newUsername) {
  console.error("Alter und neuer Username sind identisch.");
  process.exit(1);
}

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

  console.log(`Repariere Referenzen: "${oldUsername}" -> "${newUsername}"`);

  async function update(collection, filter, update, options) {
    const col = db.collection(collection);
    const result = await col.updateMany(filter, update, options);
    if (result.modifiedCount > 0) {
      console.log(`  [${collection}] ${result.modifiedCount} Dokument(e) aktualisiert`);
    }
    return result.modifiedCount;
  }

  let total = 0;

  // books
  total += await update("books", { ownerUsername: oldUsername }, { $set: { ownerUsername: newUsername } });

  // discussions
  total += await update("discussions", { authorUsername: oldUsername }, { $set: { authorUsername: newUsername } });
  total += await update("discussions", { "replies.authorUsername": oldUsername }, { $set: { "replies.$[r].authorUsername": newUsername } }, { arrayFilters: [{ "r.authorUsername": oldUsername }] });
  total += await update("discussions", { "reactions.username": oldUsername }, { $set: { "reactions.$[r].username": newUsername } }, { arrayFilters: [{ "r.username": oldUsername }] });

  // polls
  total += await update("polls", { authorUsername: oldUsername }, { $set: { authorUsername: newUsername } });
  total += await update("polls", { "votes.username": oldUsername }, { $set: { "votes.$[v].username": newUsername } }, { arrayFilters: [{ "v.username": oldUsername }] });
  total += await update("polls", { "replies.authorUsername": oldUsername }, { $set: { "replies.$[r].authorUsername": newUsername } }, { arrayFilters: [{ "r.authorUsername": oldUsername }] });

  // tausch
  total += await update("tausch", { authorUsername: oldUsername }, { $set: { authorUsername: newUsername } });

  // messages
  total += await update("messages", { senderUsername: oldUsername }, { $set: { senderUsername: newUsername } });
  total += await update("messages", { recipientUsername: oldUsername }, { $set: { recipientUsername: newUsername } });

  // lesezeichen
  total += await update("lesezeichen", { username: oldUsername }, { $set: { username: newUsername } });

  // support
  total += await update("support", { username: oldUsername }, { $set: { username: newUsername } });

  // kalender_events
  total += await update("kalender_events", { createdBy: oldUsername }, { $set: { createdBy: newUsername } });
  total += await update("kalender_events", { participants: oldUsername }, { $set: { "participants.$": newUsername } });

  // buchzirkel
  total += await update("buchzirkel", { veranstalterUsername: oldUsername }, { $set: { veranstalterUsername: newUsername } });
  total += await update("buchzirkel_bewerbungen", { bewerberUsername: oldUsername }, { $set: { bewerberUsername: newUsername } });
  total += await update("buchzirkel_teilnahmen", { teilnehmerUsername: oldUsername }, { $set: { teilnehmerUsername: newUsername } });
  total += await update("buchzirkel_beitraege", { autorUsername: oldUsername }, { $set: { autorUsername: newUsername } });
  total += await update("buchzirkel_beitraege", { "replies.autorUsername": oldUsername }, { $set: { "replies.$[r].autorUsername": newUsername } }, { arrayFilters: [{ "r.autorUsername": oldUsername }] });
  total += await update("buchzirkel_beitraege", { "reactions.username": oldUsername }, { $set: { "reactions.$[r].username": newUsername } }, { arrayFilters: [{ "r.username": oldUsername }] });
  total += await update("buchzirkel_chat", { senderUsername: oldUsername }, { $set: { senderUsername: newUsername } });
  total += await update("buchzirkel_chat", { readBy: oldUsername }, { $set: { "readBy.$[elem]": newUsername } }, { arrayFilters: [{ elem: oldUsername }] });

  console.log(`\nFertig. Insgesamt ${total} Referenz(en) aktualisiert.`);
} finally {
  await client.close();
}
