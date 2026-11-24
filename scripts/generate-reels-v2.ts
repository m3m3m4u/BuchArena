#!/usr/bin/env node
/**
 * Regenerates all completed (done) Reels with Version 02 (Kurzvideo2.pptx)
 * and exports an Excel table with:
 * Title, Autor, Insta, Caption, Beschreibung
 *
 * Usage:
 *   npx tsx scripts/generate-reels-v2.ts
 *   npx tsx scripts/generate-reels-v2.ts --dry-run
 *   npx tsx scripts/generate-reels-v2.ts --limit 5
 *   npx tsx scripts/generate-reels-v2.ts --all
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import fs from "fs/promises";
import path from "path";
import { MongoClient } from "mongodb";
import { buildKurzVideoPptx } from "../lib/pptx-vorlage";
import type { BucharenaReelVorlageDoc } from "../lib/bucharena-db";
import {
  cleanInstagramHandle,
  buildReelFileName,
  generateReelsExcelBuffer,
  type ReelExportItem,
} from "../lib/reel-export-utils";

const DRY_RUN = process.argv.includes("--dry-run");
const ALL_STATUSES = process.argv.includes("--all");

const limitIdx = process.argv.indexOf("--limit");
const LIMIT = limitIdx !== -1 ? parseInt(process.argv[limitIdx + 1], 10) : 0;

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || "bucharena";

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI fehlt in .env / .env.local");
  process.exit(1);
}

const OUTPUT_DIR = path.resolve(process.cwd(), "output", "reels-v2");

async function run() {
  console.log("🎬 BuchArena – Version 02 Reel Generator");
  console.log(`📁 Template: public/Kurzvideo2.pptx`);
  console.log(`📂 Output-Verzeichnis: ${OUTPUT_DIR}`);
  if (DRY_RUN) console.log("🔍 Dry-Run Modus aktiv (Dateien werden nicht geschrieben)");

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const client = new MongoClient(MONGODB_URI!);
  await client.connect();
  const db = client.db(DB_NAME);

  const query: Record<string, unknown> = { type: "reel" };
  if (!ALL_STATUSES) {
    query.status = "done";
  }

  const subCol = db.collection("bucharenasubmissions");
  let submissions = await subCol.find(query).sort({ createdAt: -1 }).toArray();

  if (LIMIT > 0) {
    submissions = submissions.slice(0, LIMIT);
  }

  console.log(`📊 Gefundene Einreichungen (${ALL_STATUSES ? "alle" : "nur erledigt"}): ${submissions.length}`);

  if (submissions.length === 0) {
    console.log("Keine passenden Einreichungen gefunden.");
    await client.close();
    return;
  }

  // Look up Instagram handles
  const usernames = [...new Set(submissions.map((s) => s.submittedBy as string).filter(Boolean))];
  const igMap = new Map<string, string>();
  if (usernames.length > 0) {
    const usersCol = db.collection("users");
    const docs = await usersCol
      .find({
        $or: [{ username: { $in: usernames } }, { email: { $in: usernames } }],
      })
      .project({ username: 1, email: 1, "profile.socialInstagram.value": 1 })
      .toArray();

    for (const u of docs) {
      const ig = (u.profile as Record<string, { value?: string }> | undefined)?.socialInstagram?.value?.trim();
      if (ig) {
        if (u.username) igMap.set(u.username as string, ig);
        if (u.email) igMap.set(u.email as string, ig);
      }
    }
  }

  // Look up Vorlagen
  const subIds = submissions.map((s) => s._id.toString());
  const vorlagenCol = db.collection<BucharenaReelVorlageDoc>("bucharenareelvorlagen");
  const vorlagen = await vorlagenCol.find({ submissionId: { $in: subIds } }).toArray();
  const vorlageMap = new Map(vorlagen.map((v) => [v.submissionId as string, v]));

  // Build items list
  const items: ReelExportItem[] = submissions.map((s) => {
    const sid = s._id.toString();
    const v = vorlageMap.get(sid);
    return {
      _id: sid,
      bookTitle: s.bookTitle,
      author: s.author,
      genre: s.genre,
      geschlecht: s.geschlecht || v?.geschlecht,
      instagram: s.instagram,
      authorInstagram: igMap.get(s.submittedBy as string) || null,
      beschreibung: s.beschreibung || v?.beschreibung,
      notes: s.notes,
      status: s.status,
      vorlage: v
        ? {
            thema: v.thema,
            hauptfigur: v.hauptfigur,
            inhalte: v.inhalte,
            autorHerkunft: v.autorHerkunft,
            autorBeruf: v.autorBeruf,
            autorStil: v.autorStil,
            erscheinungsjahr: v.erscheinungsjahr,
            verlag: v.verlag,
          }
        : null,
    };
  });

  // 1. Generate Excel table
  console.log("\n📑 Generiere Excel-Tabelle (Title, Autor, Insta, Caption, Beschreibung)...");
  const excelBuf = generateReelsExcelBuffer(items, "v2");
  const excelPath = path.join(
    OUTPUT_DIR,
    `Reels_Version02_${ALL_STATUSES ? "Alle" : "Erledigt"}_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
  if (!DRY_RUN) {
    await fs.writeFile(excelPath, excelBuf);
    console.log(`✅ Excel gespeichert: ${excelPath}`);
  } else {
    console.log(`[Dry-Run] Excel würde gespeichert werden: ${excelPath}`);
  }

  // 2. Generate PPTX files
  console.log("\n🎬 Generiere Version 02 PPTX Dateien mit Vorlage Kurzvideo2.pptx...");
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const vDoc = vorlageMap.get(item._id!);
    const fileName = buildReelFileName(item.bookTitle, item.author, "v2");
    const outFilePath = path.join(OUTPUT_DIR, fileName);

    if (!vDoc) {
      console.warn(`⚠️ [${i + 1}/${items.length}] Keine Vorlage gefunden für ID ${item._id} (${item.bookTitle})`);
      failCount++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`[Dry-Run] [${i + 1}/${items.length}] Erzeuge ${fileName}`);
      successCount++;
      continue;
    }

    try {
      const pptxBuffer = await buildKurzVideoPptx(vDoc, { version: "v2" });
      await fs.writeFile(outFilePath, pptxBuffer);
      console.log(`✓ [${i + 1}/${items.length}] ${fileName} (${(pptxBuffer.length / (1024 * 1024)).toFixed(1)} MB)`);
      successCount++;
    } catch (err) {
      console.error(`❌ [${i + 1}/${items.length}] Fehler bei ${fileName}:`, err instanceof Error ? err.message : err);
      failCount++;
    }
  }

  console.log("\n🎉 Fertig!");
  console.log(`   Erfolgreich: ${successCount}`);
  console.log(`   Fehler:      ${failCount}`);
  console.log(`   Excel-Pfad:  ${excelPath}`);
  console.log(`   Dateien in:  ${OUTPUT_DIR}\n`);

  await client.close();
}

run().catch((err) => {
  console.error("Kritischer Fehler:", err);
  process.exit(1);
});
