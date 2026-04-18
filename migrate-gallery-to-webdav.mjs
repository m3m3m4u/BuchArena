#!/usr/bin/env node
/**
 * Migriert social_media_gallery-Einträge deren src eine data-URL ist
 * auf WebDAV-Speicher und aktualisiert die Datenbank-Einträge.
 *
 * Ausführen:  node migrate-gallery-to-webdav.mjs
 * Dry-Run:    node migrate-gallery-to-webdav.mjs --dry
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

const MONGODB_URI  = process.env.MONGODB_URI;
const DB_NAME      = process.env.MONGODB_DB_NAME ?? "bucharena";
const WEBDAV_URL   = process.env.WEBDAV_URL ?? "";
const WEBDAV_USER  = process.env.WEBDAV_USERNAME ?? "";
const WEBDAV_PASS  = process.env.WEBDAV_PASSWORD ?? "";
const UPLOAD_DIR   = (process.env.WEBDAV_UPLOAD_DIR ?? "bucharena-profile-images").replace(/^\/+/, "").replace(/\/+$/, "");

if (!MONGODB_URI)  { console.error("❌  MONGODB_URI fehlt");  process.exit(1); }
if (!WEBDAV_URL)   { console.error("❌  WEBDAV_URL fehlt");   process.exit(1); }
if (!WEBDAV_USER)  { console.error("❌  WEBDAV_USERNAME fehlt"); process.exit(1); }
if (!WEBDAV_PASS)  { console.error("❌  WEBDAV_PASSWORD fehlt"); process.exit(1); }

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────
function dataUrlToBuffer(dataUrl) {
  // Format: data:<mime>;base64,<data>
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx === -1) throw new Error("Ungültige data-URL");
  const meta    = dataUrl.slice(5, commaIdx); // nach "data:"
  const base64  = dataUrl.slice(commaIdx + 1);
  const mime    = meta.split(";")[0];
  const buffer  = Buffer.from(base64, "base64");
  return { buffer, mime };
}

function mimeToExt(mime) {
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/png")  return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif")  return "gif";
  return "jpg";
}

// ── Haupt-Migration ──────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? "🔍  DRY-RUN – keine Änderungen werden gespeichert\n" : "🚀  Starte Migration…\n");

  const mongo  = new MongoClient(MONGODB_URI);
  await mongo.connect();
  const col    = mongo.db(DB_NAME).collection("social_media_gallery");

  const webdav = createClient(WEBDAV_URL, { username: WEBDAV_USER, password: WEBDAV_PASS });
  const remoteDir = `/${UPLOAD_DIR}/social-media-gallery`;

  // Alle Dokumente holen
  const allDocs = await col.find({}).toArray();
  console.log(`📋  ${allDocs.length} Einträge in social_media_gallery gefunden`);

  const dataUrlDocs  = allDocs.filter(d => typeof d.src === "string" && d.src.startsWith("data:"));
  const normalDocs   = allDocs.filter(d => typeof d.src === "string" && !d.src.startsWith("data:"));

  console.log(`   ✅  ${normalDocs.length} bereits mit URL (kein Handlungsbedarf)`);
  console.log(`   ⚠️   ${dataUrlDocs.length} mit data-URL (werden migriert)\n`);

  if (dataUrlDocs.length === 0) {
    console.log("✅  Nichts zu tun – alle Bilder sind bereits auf WebDAV.");
    await mongo.close();
    return;
  }

  // Verzeichnis auf WebDAV anlegen
  if (!DRY_RUN) {
    try {
      await webdav.createDirectory(remoteDir, { recursive: true });
    } catch { /* existiert bereits */ }
  }

  let migrated = 0;
  let failed   = 0;

  for (const doc of dataUrlDocs) {
    const id    = doc._id.toString();
    const label = doc.label ?? "(kein Label)";
    const sizeKb = Math.round(doc.src.length / 1024);

    console.log(`  → [${id}] "${label}" (${sizeKb} KB data-URL)`);

    try {
      const { buffer, mime } = dataUrlToBuffer(doc.src);
      const ext              = mimeToExt(mime);
      const fileName         = `${Date.now()}-${randomUUID()}.${ext}`;
      const remotePath       = `${remoteDir}/${fileName}`;
      const newSrc           = `/api/profile/image?path=${encodeURIComponent(remotePath)}`;

      console.log(`     WebDAV: ${remotePath} (${Math.round(buffer.length / 1024)} KB, ${mime})`);

      if (!DRY_RUN) {
        await webdav.putFileContents(remotePath, buffer, { overwrite: true });
        await col.updateOne(
          { _id: new ObjectId(id) },
          { $set: { src: newSrc } }
        );
      }

      console.log(`     ✅  Neu: ${newSrc}`);
      migrated++;
    } catch (err) {
      console.error(`     ❌  Fehler: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Migriert: ${migrated}  |  Fehler: ${failed}  |  Gesamt: ${dataUrlDocs.length}`);
  if (DRY_RUN) console.log("(DRY-RUN – keine Daten wurden verändert)");

  await mongo.close();
}

main().catch((err) => {
  console.error("Unerwarteter Fehler:", err);
  process.exit(1);
});
