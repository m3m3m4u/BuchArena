#!/usr/bin/env node
/**
 * Einmaliges Skript: Musik-Tracks aus public/mp3 auf WebDAV hochladen
 * und MongoDB-Einträge anlegen.
 *
 * Ausführen:  node upload-musik.mjs
 */

import { readFileSync as _readEnv } from "fs";

// .env.local manuell laden (kein dotenv nötig)
function loadEnv(path) {
  try {
    const lines = _readEnv(path, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch { /* Datei existiert nicht */ }
}
loadEnv(".env.local");
loadEnv(".env");

import { MongoClient } from "mongodb";
import { readFileSync } from "fs";
import { randomUUID } from "crypto";

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME ?? "bucharena";
if (!MONGODB_URI) { console.error("MONGODB_URI fehlt"); process.exit(1); }

const WEBDAV_URL      = (process.env.WEBDAV_URL ?? "").replace(/\/$/, "");
const WEBDAV_USERNAME = process.env.WEBDAV_USERNAME ?? "";
const WEBDAV_PASSWORD = process.env.WEBDAV_PASSWORD ?? "";
const WEBDAV_UPLOAD_DIR = (process.env.WEBDAV_UPLOAD_DIR ?? "bucharena-profile-images").replace(/^\/+/, "").replace(/\/+$/, "");
const WEBDAV_PUBLIC_BASE = (process.env.WEBDAV_PUBLIC_BASE_URL ?? process.env.WEBDAV_URL ?? "").replace(/\/$/, "");

if (!WEBDAV_URL || !WEBDAV_USERNAME || !WEBDAV_PASSWORD) {
  console.error("WebDAV-Konfiguration fehlt (WEBDAV_URL, WEBDAV_USERNAME, WEBDAV_PASSWORD)");
  process.exit(1);
}

const AUTH = "Basic " + Buffer.from(`${WEBDAV_USERNAME}:${WEBDAV_PASSWORD}`).toString("base64");

/** WebDAV: Verzeichnis anlegen (falls nicht vorhanden) */
async function mkdirWebdav(remotePath) {
  const url = `${WEBDAV_URL}${remotePath}`;
  const res = await fetch(url, { method: "MKCOL", headers: { Authorization: AUTH } });
  if (res.ok || res.status === 405 /* existiert bereits */) return;
  throw new Error(`MKCOL ${remotePath} → ${res.status}`);
}

/** WebDAV: Datei hochladen */
async function putWebdav(remotePath, buffer) {
  const url = `${WEBDAV_URL}${remotePath}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { Authorization: AUTH, "Content-Type": "audio/mpeg" },
    body: buffer,
  });
  if (!res.ok) throw new Error(`PUT ${remotePath} → ${res.status} ${await res.text()}`);
}

/* ═══ Track-Metadaten ═══ */
const TRACKS = [
  {
    fileName: "Rain_Against_The_Glass.mp3",
    title: "Rain Against The Glass",
    style: "Lo-Fi / Chillhop",
    description: "Ein entspannter Lo-Fi Hip Hop Sound mit warmem E-Piano, gedämpften Drums und atmosphärischen Regengeräuschen.",
  },
  {
    fileName: "Before_the_Dawn_Breaks.mp3",
    title: "Before the Dawn Breaks",
    style: "Cinematic / Orchestral",
    description: "Eine weite, atmosphärische Komposition mit Flötenmelodie, sich steigernden Streichern und einem epischen orchestralen Finale.",
  },
  {
    fileName: "Clear_Path_Forward.mp3",
    title: "Clear Path Forward",
    style: "Corporate / Modern Pop",
    description: "Ein motivierender Sound mit präzisen Synthesizer-Pulsen, cleaner E-Gitarre und einem optimistischen, kraftvollen Chorus.",
  },
  {
    fileName: "Ghost_of_the_Boulevard.mp3",
    title: "Ghost of the Boulevard",
    style: "Synthwave / Retrowave",
    description: "Ein nächtlicher, antreibender Track mit pulsierendem Synthesizer-Bass, 80er-Jahre Drums und roboterhaftem Gesang.",
  },
  {
    fileName: "Where_the_World_Begins.mp3",
    title: "Where the World Begins",
    style: "Acoustic / Folk",
    description: "Ein warmer, rustikaler Sound mit detailliertem Fingerpicking auf der Akustikgitarre und intimen, naturverbundenen Vocals.",
  },
];

const REMOTE_DIR = `/${WEBDAV_UPLOAD_DIR}/musik`;

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const col = db.collection("musik_tracks");

  // Verzeichnis sicherstellen
  await mkdirWebdav(`/${WEBDAV_UPLOAD_DIR}`).catch(() => {});
  await mkdirWebdav(REMOTE_DIR).catch(() => {});

  for (const track of TRACKS) {
    console.log(`\n→ ${track.fileName}`);

    // Bereits vorhanden?
    const existing = await col.findOne({ fileName: track.fileName });
    if (existing) {
      console.log("  ⚠ Bereits in DB – übersprungen.");
      continue;
    }

    // Datei lesen
    const localPath = `public/mp3/${track.fileName}`;
    let buffer;
    try {
      buffer = readFileSync(localPath);
    } catch {
      console.error(`  ✗ Datei nicht gefunden: ${localPath}`);
      continue;
    }

    // Auf WebDAV hochladen
    const remoteName = `${Date.now()}-${randomUUID()}.mp3`;
    const remotePath = `${REMOTE_DIR}/${remoteName}`;
    console.log(`  Lade hoch: ${remotePath}`);
    await putWebdav(remotePath, buffer);

    // Öffentliche URL über interne Next.js-Route (kein Passwort nötig)
    const fileUrl = `/api/musik/audio?path=${encodeURIComponent(remotePath)}`;

    // MongoDB-Eintrag
    await col.insertOne({
      title: track.title,
      style: track.style,
      description: track.description,
      fileUrl,
      fileName: track.fileName,
      fileSize: buffer.length,
      uploadedBy: "system",
      createdAt: new Date(),
    });

    console.log(`  ✓ Hochgeladen (${(buffer.length / (1024 * 1024)).toFixed(1)} MB)`);
  }

  await client.close();
  console.log("\n✅ Fertig.");
}

main().catch((err) => { console.error(err); process.exit(1); });
