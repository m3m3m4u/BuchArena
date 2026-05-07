/**
 * Einmalige Migration: Befüllt die messageConversations-Collection
 * aus dem bestehenden messages-Datensatz.
 *
 * Aufruf: node migrate-message-conversations.mjs
 */

import { MongoClient } from "mongodb";
import { readFileSync } from "fs";

// .env.local manuell laden
try {
  const lines = readFileSync(".env.local", "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
} catch { /* ignore */ }

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME ?? "bucharena";

if (!uri) {
  console.error("MONGODB_URI nicht gesetzt.");
  process.exit(1);
}

const client = new MongoClient(uri);

async function run() {
  await client.connect();
  const db = client.db(dbName);

  const messages = db.collection("messages");
  const conversations = db.collection("messageConversations");

  // Indexes anlegen (idempotent)
  await conversations.createIndex({ userA: 1, userB: 1 }, { unique: true });
  await conversations.createIndex({ userA: 1, updatedAt: -1 });
  await conversations.createIndex({ userB: 1, updatedAt: -1 });

  console.log("Lese alle Nachrichten...");

  // Alle Nachrichten sortiert nach createdAt ASC
  // Wir iterieren und upserten für jedes Paar die letzte Nachricht (spätere überschreibt frühere).
  const cursor = messages.find({}, {
    projection: {
      _id: 1,
      senderUsername: 1,
      recipientUsername: 1,
      subject: 1,
      body: 1,
      kooperationId: 1,
      bookCoAuthorId: 1,
      read: 1,
      deletedBySender: 1,
      deletedByRecipient: 1,
      createdAt: 1,
    },
    sort: { createdAt: 1 },
  });

  let processed = 0;
  let upserted = 0;

  // Wir sammeln pro Pair die neueste Nachricht (in Memory, dann bulk-write)
  // Key: "userA:userB", Value: aggregiertes Objekt
  const pairMap = new Map();

  for await (const msg of cursor) {
    processed++;
    if (!msg.senderUsername || !msg.recipientUsername) continue;

    const [userA, userB] = [msg.senderUsername, msg.recipientUsername].sort();
    const key = `${userA}:${userB}`;

    const existing = pairMap.get(key);
    const isNewer = !existing || msg.createdAt > existing.latestCreatedAt;

    if (!existing) {
      // Unread-Zähler: Initiales Laden aus allen Nachrichten dieses Paares
      pairMap.set(key, {
        userA,
        userB,
        latestMessageId: msg._id,
        latestSender: msg.senderUsername,
        latestRecipient: msg.recipientUsername,
        latestSubject: msg.subject ?? "",
        latestBody: msg.body ?? "",
        latestKooperationId: msg.kooperationId ?? null,
        latestBookCoAuthorId: msg.bookCoAuthorId ?? null,
        latestCreatedAt: msg.createdAt,
        updatedAt: msg.createdAt,
        unreadForA: 0,
        unreadForB: 0,
        // Wir zählen unread separat
        _unreadForA: 0,
        _unreadForB: 0,
      });
    }

    const entry = pairMap.get(key);

    // Neueste Nachricht tracken
    if (isNewer) {
      entry.latestMessageId = msg._id;
      entry.latestSender = msg.senderUsername;
      entry.latestRecipient = msg.recipientUsername;
      entry.latestSubject = msg.subject ?? "";
      entry.latestBody = msg.body ?? "";
      entry.latestKooperationId = msg.kooperationId ?? null;
      entry.latestBookCoAuthorId = msg.bookCoAuthorId ?? null;
      entry.latestCreatedAt = msg.createdAt;
      entry.updatedAt = msg.createdAt;
    }

    // Unread zählen: Nachricht an userA (= recipient ist userA, nicht gelesen)
    if (!msg.read && msg.recipientUsername === userA && msg.deletedByRecipient !== true) {
      entry._unreadForA++;
    }
    if (!msg.read && msg.recipientUsername === userB && msg.deletedByRecipient !== true) {
      entry._unreadForB++;
    }
  }

  console.log(`${processed} Nachrichten verarbeitet, ${pairMap.size} Konversationspaare gefunden.`);

  // Bulk-Upsert
  const ops = [];
  for (const entry of pairMap.values()) {
    const { _unreadForA, _unreadForB, ...doc } = entry;
    doc.unreadForA = _unreadForA;
    doc.unreadForB = _unreadForB;

    ops.push({
      updateOne: {
        filter: { userA: doc.userA, userB: doc.userB },
        update: { $set: doc },
        upsert: true,
      },
    });
  }

  if (ops.length > 0) {
    const result = await conversations.bulkWrite(ops, { ordered: false });
    upserted = result.upsertedCount + result.modifiedCount;
  }

  console.log(`Migration abgeschlossen. ${upserted} Konversationen upserted.`);
}

run()
  .catch((err) => {
    console.error("Fehler:", err);
    process.exit(1);
  })
  .finally(() => client.close());
