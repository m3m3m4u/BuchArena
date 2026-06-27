#!/usr/bin/env node
// Zeigt den Kopernikus-User und prüft das Passwort

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || "bucharena";
const password = process.argv[2] || "12345";

if (!uri) {
  console.error("MONGODB_URI fehlt!");
  process.exit(1);
}

const client = await MongoClient.connect(uri);
const db = client.db(dbName);
const user = await db.collection("users").findOne({ username: "Kopernikus" });
if (!user) {
  console.error("Kopernikus nicht gefunden!");
  process.exit(2);
}
console.log("User:", { username: user.username, email: user.email, role: user.role, status: user.status });
const valid = await bcrypt.compare(password, user.passwordHash);
console.log("Passwort korrekt?", valid);
client.close();
