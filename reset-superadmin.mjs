#!/usr/bin/env node
/**
 * Setzt das Kopernikus-Superadmin-Passwort in der DB auf den Wert
 * aus SUPERADMIN_PASSWORD (oder "12345" als Fallback).
 *
 * Nutzung:  node reset-superadmin.mjs
 */
import { readFileSync } from "fs";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

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
const newPassword = process.env.SUPERADMIN_PASSWORD ?? "12345";

if (!uri) {
  console.error("MONGODB_URI ist nicht gesetzt.");
  process.exit(1);
}

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db(dbName);
  const users = db.collection("users");

  const hash = await bcrypt.hash(newPassword, 12);

  const result = await users.updateOne(
    { username: "Kopernikus" },
    { $set: { passwordHash: hash, role: "SUPERADMIN" } }
  );

  if (result.matchedCount === 0) {
    // User existiert noch nicht → anlegen
    await users.insertOne({
      username: "Kopernikus",
      email: "kopernikus@bucharena.local",
      passwordHash: hash,
      role: "SUPERADMIN",
      createdAt: new Date(),
    });
    console.log("Kopernikus-User angelegt mit neuem Passwort.");
  } else {
    console.log("Kopernikus-Passwort erfolgreich zurückgesetzt.");
  }
} finally {
  await client.close();
}
