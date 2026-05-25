#!/usr/bin/env node
/**
 * Repariert automatisch alle verwaisten Username-Referenzen.
 *
 * Strategie:
 * 1. Alle Usernames in Neben-Collections sammeln, die nicht in `users` existieren.
 * 2. Für Email-basierte alte Namen: User per Email-Lookup finden (email === oldUsername).
 * 3. Bekannte manuelle Mappings aus dem Aufruf-Argument berücksichtigen.
 * 4. Alle aufgelösten Fälle automatisch reparieren.
 * 5. Nicht auflösbare Fälle melden.
 *
 * Nutzung (vollautomatisch):
 *   node fix-all-orphaned-usernames.mjs
 *
 * Mit zusätzlichen manuellen Mappings:
 *   node fix-all-orphaned-usernames.mjs "palineas=PalineaNeuerName" "marcus=MarcusNeu"
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

// Manuelle Mappings aus Argumenten parsen: "alter=neuer"
const manualMappings = new Map();
for (const arg of process.argv.slice(2)) {
  const idx = arg.indexOf("=");
  if (idx === -1) continue;
  manualMappings.set(arg.slice(0, idx).trim(), arg.slice(idx + 1).trim());
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME ?? "bucharena";

if (!uri) {
  console.error("MONGODB_URI ist nicht gesetzt.");
  process.exit(1);
}

const client = new MongoClient(uri);

async function main() {
  await client.connect();
  const db = client.db(dbName);

  const allUsers = await db.collection("users")
    .find({}, { projection: { username: 1, email: 1 } })
    .toArray();
  const knownUsernames = new Set(allUsers.map((u) => u.username));

  // Email -> Username Map für automatische Auflösung
  const emailToUsername = new Map();
  for (const u of allUsers) {
    if (u.email) emailToUsername.set(u.email.toLowerCase(), u.username);
  }

  console.log(`${knownUsernames.size} bekannte User geladen.\n`);

  // --- Verwaiste Usernames sammeln ---
  const orphans = new Set();

  function markOrphan(username) {
    if (!username || knownUsernames.has(username)) return;
    orphans.add(username);
  }

  async function collectField(collectionName, field) {
    const docs = await db.collection(collectionName)
      .distinct(field);
    for (const val of docs) markOrphan(val);
  }

  async function collectArraySubField(collectionName, arrayField, subField) {
    const path = subField ? `${arrayField}.${subField}` : arrayField;
    const vals = await db.collection(collectionName).distinct(path);
    for (const val of vals) markOrphan(val);
  }

  await collectField("books", "ownerUsername");
  await collectField("discussions", "authorUsername");
  await collectArraySubField("discussions", "replies", "authorUsername");
  await collectArraySubField("discussions", "reactions", "username");
  await collectField("polls", "authorUsername");
  await collectArraySubField("polls", "votes", "username");
  await collectArraySubField("polls", "replies", "authorUsername");
  await collectField("tausch", "authorUsername");
  await collectField("messages", "senderUsername");
  await collectField("messages", "recipientUsername");
  await collectField("lesezeichen", "username");
  await collectField("support", "username");
  await collectField("kalender_events", "createdBy");
  await collectArraySubField("kalender_events", "participants", null);
  await collectField("buchzirkel", "veranstalterUsername");
  await collectField("buchzirkel_bewerbungen", "bewerberUsername");
  await collectField("buchzirkel_teilnahmen", "teilnehmerUsername");
  await collectField("buchzirkel_beitraege", "autorUsername");
  await collectArraySubField("buchzirkel_beitraege", "replies", "autorUsername");
  await collectArraySubField("buchzirkel_beitraege", "reactions", "username");
  await collectField("buchzirkel_chat", "senderUsername");
  await collectArraySubField("buchzirkel_chat", "readBy", null);

  if (orphans.size === 0) {
    console.log("Keine verwaisten Referenzen gefunden. Alles in Ordnung.");
    await client.close();
    return;
  }

  console.log(`${orphans.size} verwaiste(r) Username(s) gefunden:\n`);

  // --- Auflösung ---
  const resolved = new Map();   // oldUsername -> newUsername
  const unresolved = [];

  for (const oldUsername of orphans) {
    let newUsername = manualMappings.get(oldUsername);

    // Automatisch: wenn der alte Username eine E-Mail-Adresse ist, User per Email suchen
    if (!newUsername && oldUsername.includes("@")) {
      newUsername = emailToUsername.get(oldUsername.toLowerCase());
    }

    if (newUsername && knownUsernames.has(newUsername)) {
      resolved.set(oldUsername, newUsername);
      console.log(`  Aufgeloest: "${oldUsername}" -> "${newUsername}"`);
    } else {
      unresolved.push(oldUsername);
      console.log(`  Nicht aufloesbar: "${oldUsername}"${newUsername ? ` (vorgeschlagen: "${newUsername}" existiert nicht)` : ""}`);
    }
  }

  if (resolved.size === 0) {
    console.log("\nKeine automatisch reparierbaren Eintraege gefunden.");
    if (unresolved.length > 0) {
      console.log("\nFuer manuelle Reparatur:");
      for (const u of unresolved) {
        console.log(`  node fix-username-rename.mjs "${u}" <neuerUsername>`);
      }
    }
    await client.close();
    return;
  }

  // --- Reparatur ---
  console.log(`\n${resolved.size} Eintraege werden repariert...\n`);

  async function update(collection, filter, updateDoc, options) {
    const col = db.collection(collection);
    const result = await col.updateMany(filter, updateDoc, options);
    return result.modifiedCount;
  }

  let totalFixed = 0;

  for (const [oldUsername, newUsername] of resolved.entries()) {
    console.log(`Repariere: "${oldUsername}" -> "${newUsername}"`);
    let count = 0;

    count += await update("books", { ownerUsername: oldUsername }, { $set: { ownerUsername: newUsername } });
    count += await update("discussions", { authorUsername: oldUsername }, { $set: { authorUsername: newUsername } });
    count += await update("discussions", { "replies.authorUsername": oldUsername }, { $set: { "replies.$[r].authorUsername": newUsername } }, { arrayFilters: [{ "r.authorUsername": oldUsername }] });
    count += await update("discussions", { "reactions.username": oldUsername }, { $set: { "reactions.$[r].username": newUsername } }, { arrayFilters: [{ "r.username": oldUsername }] });
    count += await update("polls", { authorUsername: oldUsername }, { $set: { authorUsername: newUsername } });
    count += await update("polls", { "votes.username": oldUsername }, { $set: { "votes.$[v].username": newUsername } }, { arrayFilters: [{ "v.username": oldUsername }] });
    count += await update("polls", { "replies.authorUsername": oldUsername }, { $set: { "replies.$[r].authorUsername": newUsername } }, { arrayFilters: [{ "r.authorUsername": oldUsername }] });
    count += await update("tausch", { authorUsername: oldUsername }, { $set: { authorUsername: newUsername } });
    count += await update("messages", { senderUsername: oldUsername }, { $set: { senderUsername: newUsername } });
    count += await update("messages", { recipientUsername: oldUsername }, { $set: { recipientUsername: newUsername } });
    count += await update("lesezeichen", { username: oldUsername }, { $set: { username: newUsername } });
    count += await update("support", { username: oldUsername }, { $set: { username: newUsername } });
    count += await update("kalender_events", { createdBy: oldUsername }, { $set: { createdBy: newUsername } });
    count += await update("kalender_events", { participants: oldUsername }, { $set: { "participants.$": newUsername } });
    count += await update("buchzirkel", { veranstalterUsername: oldUsername }, { $set: { veranstalterUsername: newUsername } });
    count += await update("buchzirkel_bewerbungen", { bewerberUsername: oldUsername }, { $set: { bewerberUsername: newUsername } });
    count += await update("buchzirkel_teilnahmen", { teilnehmerUsername: oldUsername }, { $set: { teilnehmerUsername: newUsername } });
    count += await update("buchzirkel_beitraege", { autorUsername: oldUsername }, { $set: { autorUsername: newUsername } });
    count += await update("buchzirkel_beitraege", { "replies.autorUsername": oldUsername }, { $set: { "replies.$[r].autorUsername": newUsername } }, { arrayFilters: [{ "r.autorUsername": oldUsername }] });
    count += await update("buchzirkel_beitraege", { "reactions.username": oldUsername }, { $set: { "reactions.$[r].username": newUsername } }, { arrayFilters: [{ "r.username": oldUsername }] });
    count += await update("buchzirkel_chat", { senderUsername: oldUsername }, { $set: { senderUsername: newUsername } });
    count += await update("buchzirkel_chat", { readBy: oldUsername }, { $set: { "readBy.$[elem]": newUsername } }, { arrayFilters: [{ elem: oldUsername }] });

    console.log(`  -> ${count} Referenz(en) aktualisiert`);
    totalFixed += count;
  }

  console.log(`\nFertig. Insgesamt ${totalFixed} Referenz(en) aktualisiert.`);

  if (unresolved.length > 0) {
    console.log(`\n${unresolved.length} Username(s) konnten nicht automatisch aufgeloest werden:`);
    for (const u of unresolved) {
      console.log(`  node fix-username-rename.mjs "${u}" <neuerUsername>`);
    }
  }
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
