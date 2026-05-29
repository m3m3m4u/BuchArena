#!/usr/bin/env node
/**
 * Repariert falsche unreadForA/unreadForB Werte in messageConversations.
 *
 * Problem: Wenn ein Sender eine noch ungelesene Nachricht löschte, wurde
 * der Unread-Counter des Empfängers früher nicht dekrementiert. Der Badge
 * zeigte dauerhaft "neue Nachricht", obwohl nichts mehr zu lesen war.
 *
 * Lösung: Für jede Konversation wird der Counter neu berechnet aus den
 * tatsächlich vorhandenen, ungelesenen, nicht-vom-Sender-gelöschten Nachrichten.
 *
 * Nutzung: node fix-unread-counts.mjs [--dry-run]
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
const dryRun = process.argv.includes("--dry-run");

if (!uri) {
  console.error("MONGODB_URI nicht gesetzt.");
  process.exit(1);
}

const client = new MongoClient(uri);

async function main() {
  await client.connect();
  const db = client.db(dbName);
  const convCol = db.collection("messageConversations");
  const msgCol = db.collection("messages");

  const conversations = await convCol.find({}).toArray();
  console.log(`${conversations.length} Konversationen gefunden.`);

  let fixed = 0;
  let unchanged = 0;

  for (const conv of conversations) {
    const { userA, userB } = conv;

    // Tatsächliche Unread-Counts berechnen:
    // Ungelesen für A = Nachrichten von B an A, noch nicht gelesen, nicht vom Sender (B) gelöscht
    const [countForA, countForB] = await Promise.all([
      msgCol.countDocuments({
        senderUsername: userB,
        recipientUsername: userA,
        read: false,
        deletedBySender: { $ne: true },
      }),
      msgCol.countDocuments({
        senderUsername: userA,
        recipientUsername: userB,
        read: false,
        deletedBySender: { $ne: true },
      }),
    ]);

    const currentA = conv.unreadForA ?? 0;
    const currentB = conv.unreadForB ?? 0;

    if (countForA !== currentA || countForB !== currentB) {
      console.log(
        `  ${userA} <-> ${userB}: unreadForA ${currentA} -> ${countForA}, unreadForB ${currentB} -> ${countForB}`
      );
      if (!dryRun) {
        await convCol.updateOne(
          { userA, userB },
          { $set: { unreadForA: countForA, unreadForB: countForB } }
        );
      }
      fixed++;
    } else {
      unchanged++;
    }
  }

  console.log(`\nErgebnis: ${fixed} korrigiert, ${unchanged} bereits korrekt.`);
  if (dryRun) console.log("(Dry-run – keine Änderungen geschrieben)");
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => client.close());
