#!/usr/bin/env node
/**
 * Migriert bucharenavorlagen-Einträge deren coverImg/autorImg eine data-URL ist
 * auf WebDAV-Speicher und aktualisiert die Datenbank-Einträge.
 *
 * Ausführen:  node migrate-vorlagen-to-webdav.mjs
 * Dry-Run:    node migrate-vorlagen-to-webdav.mjs --dry
 */

import { readFileSync } from "fs";
import { randomUUID } from "crypto";
import { MongoClient, ObjectId } from "mongodb";
import { createClient } from "webdav";

const DRY_RUN = process.argv.includes("--dry");

// ── .env laden ──────────────────────────────────────────────────────────────
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
const DB_NAME     = process.env.MONGODB_DB_NAME ?? "bucharena";
const WEBDAV_URL  = process.env.WEBDAV_URL ?? "";
const WEBDAV_USER = process.env.WEBDAV_USERNAME ?? "";
const WEBDAV_PASS = process.env.WEBDAV_PASSWORD ?? "";
const UPLOAD_DIR  = (process.env.WEBDAV_UPLOAD_DIR ?? "bucharena-profile-images").replace(/^\/+/, "").replace(/\/+$/, "");

if (!MONGODB_URI) { console.error("❌  MONGODB_URI fehlt");      process.exit(1); }
if (!WEBDAV_URL)  { console.error("❌  WEBDAV_URL fehlt");       process.exit(1); }
if (!WEBDAV_USER) { console.error("❌  WEBDAV_USERNAME fehlt");  process.exit(1); }
if (!WEBDAV_PASS) { console.error("❌  WEBDAV_PASSWORD fehlt");  process.exit(1); }

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────
function dataUrlToBuffer(dataUrl) {
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx === -1) throw new Error("Ungültige data-URL");
  const meta   = dataUrl.slice(5, commaIdx);
  const base64 = dataUrl.slice(commaIdx + 1);
  const mime   = meta.split(";")[0];
  const buffer = Buffer.from(base64, "base64");
  return { buffer, mime };
}

function mimeToExt(mime) {
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/png")  return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif")  return "gif";
  return "jpg";
}

async function uploadField(webdav, remoteDir, dataUrl, label) {
  const { buffer, mime } = dataUrlToBuffer(dataUrl);
  const ext        = mimeToExt(mime);
  const fileName   = `${Date.now()}-${randomUUID()}.${ext}`;
  const remotePath = `${remoteDir}/${fileName}`;
  const newUrl     = `/api/profile/image?path=${encodeURIComponent(remotePath)}`;
  console.log(`       WebDAV: ${remotePath} (${Math.round(buffer.length / 1024)} KB, ${mime}) [${label}]`);
  if (!DRY_RUN) {
    await webdav.putFileContents(remotePath, buffer, { overwrite: true });
  }
  return newUrl;
}

// ── Haupt-Migration ──────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? "🔍  DRY-RUN – keine Änderungen werden gespeichert\n" : "🚀  Starte Migration…\n");

  const mongo  = new MongoClient(MONGODB_URI);
  await mongo.connect();
  const col    = mongo.db(DB_NAME).collection("bucharenavorlagen");
  const webdav = createClient(WEBDAV_URL, { username: WEBDAV_USER, password: WEBDAV_PASS });

  // Alle Dokumente laden, die mindestens ein data-URL-Feld haben
  const allDocs = await col.find({
    $or: [
      { coverImg: { $regex: "^data:" } },
      { autorImg: { $regex: "^data:" } },
    ],
  }).toArray();

  console.log(`📋  ${allDocs.length} Vorlagen mit data-URL-Bildern gefunden\n`);

  if (allDocs.length === 0) {
    console.log("✅  Nichts zu tun – alle Bilder sind bereits auf WebDAV.");
    await mongo.close();
    return;
  }

  // Verzeichnis auf WebDAV anlegen (pro Username)
  const usernames = [...new Set(allDocs.map(d => d.username).filter(Boolean))];
  const remoteBaseDir = `/${UPLOAD_DIR}/bucharena-vorlagen`;

  if (!DRY_RUN) {
    try {
      await webdav.createDirectory(remoteBaseDir, { recursive: true });
    } catch { /* existiert bereits */ }
    for (const username of usernames) {
      try {
        await webdav.createDirectory(`${remoteBaseDir}/${username}`, { recursive: true });
      } catch { /* existiert bereits */ }
    }
  }

  let migrated = 0;
  let failed   = 0;

  for (const doc of allDocs) {
    const id    = doc._id.toString();
    const title = doc.buchtitel ?? "(kein Titel)";
    const user  = doc.username ?? "unknown";
    const remoteDir = `${remoteBaseDir}/${user}`;

    console.log(`  → [${id}] "${title}" (${user})`);

    try {
      const update = {};

      if (typeof doc.coverImg === "string" && doc.coverImg.startsWith("data:")) {
        const url = await uploadField(webdav, remoteDir, doc.coverImg, "coverImg");
        update.coverImg = url;
        console.log(`       ✅  coverImg → ${url}`);
      }

      if (typeof doc.autorImg === "string" && doc.autorImg.startsWith("data:")) {
        const url = await uploadField(webdav, remoteDir, doc.autorImg, "autorImg");
        update.autorImg = url;
        console.log(`       ✅  autorImg → ${url}`);
      }

      if (!DRY_RUN && Object.keys(update).length > 0) {
        await col.updateOne({ _id: new ObjectId(id) }, { $set: update });
      }

      migrated++;
    } catch (err) {
      console.error(`     ❌  Fehler: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Migriert: ${migrated}  |  Fehler: ${failed}  |  Gesamt: ${allDocs.length}`);
  if (DRY_RUN) console.log("(DRY-RUN – keine Daten wurden verändert)");

  await mongo.close();
}

main().catch((err) => {
  console.error("Unerwarteter Fehler:", err);
  process.exit(1);
});
