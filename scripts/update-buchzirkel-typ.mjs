import { MongoClient, ObjectId } from "mongodb";
import { readFileSync } from "fs";

// .env.local laden (wie in reset-superadmin.mjs)
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

if (!uri) { console.error("MONGODB_URI nicht gesetzt."); process.exit(1); }

const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbName);
const col = db.collection("buchzirkel");

const ids = ["69f0d4c692240c6b17c130cc", "69f0d9cd59977c1a7dc058f1"];
const result = await col.updateMany(
  { _id: { $in: ids.map((id) => new ObjectId(id)) } },
  { $set: { typ: "testleser", status: "bewerbung" } }
);

console.log("Updated:", result.modifiedCount, "Buchzirkel");
await client.close();
