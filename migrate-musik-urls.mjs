#!/usr/bin/env node
/**
 * Migriert bestehende musik_tracks-URLs von direkten WebDAV-URLs
 * auf interne Next.js-Routen (/api/musik/audio?path=…).
 *
 * Ausführen:  node migrate-musik-urls.mjs
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
  } catch { /* ignore */ }
}
loadEnv(".env.local");
loadEnv(".env");

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME ?? "bucharena";
const WEBDAV_PUBLIC_BASE = (process.env.WEBDAV_PUBLIC_BASE_URL ?? process.env.WEBDAV_URL ?? "").replace(/\/$/, "");
const WEBDAV_UPLOAD_DIR = (process.env.WEBDAV_UPLOAD_DIR ?? "bucharena-profile-images").replace(/^\/+/, "").replace(/\/+$/, "");

if (!MONGODB_URI) { console.error("MONGODB_URI fehlt"); process.exit(1); }

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const col = client.db(DB_NAME).collection("musik_tracks");

  const tracks = await col.find({}).toArray();
  let migrated = 0;

  for (const track of tracks) {
    const url = track.fileUrl ?? "";
    // Nur migrieren wenn es eine direkte WebDAV-URL ist (enthält base oder upload dir)
    if (url.startsWith("/api/musik/audio")) {
      console.log(`  ⚠ Bereits migriert: ${track.title}`);
      continue;
    }

    // Aus der vollen URL den relativen Pfad extrahieren
    // Bsp: https://hetzner.../bucharena-profile-images/musik/xxx.mp3
    //   → /bucharena-profile-images/musik/xxx.mp3
    let remotePath = url;
    if (remotePath.startsWith("http")) {
      const u = new URL(remotePath);
      remotePath = u.pathname;
    }

    // Sicherstellen dass der Pfad im erlaubten Verzeichnis liegt
    if (!remotePath.includes(`/${WEBDAV_UPLOAD_DIR}/musik/`)) {
      console.log(`  ✗ Unbekannter Pfad, übersprungen: ${track.title} — ${url}`);
      continue;
    }

    const newUrl = `/api/musik/audio?path=${encodeURIComponent(remotePath)}`;
    await col.updateOne({ _id: track._id }, { $set: { fileUrl: newUrl } });
    console.log(`  ✓ ${track.title}: ${newUrl}`);
    migrated++;
  }

  await client.close();
  console.log(`\n✅ ${migrated} Einträge migriert.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
