#!/usr/bin/env node
/**
 * Regeneriert alle eingereichten PPTX-Dateien mit korrekten Notizen.
 *
 * Ablauf:
 * 1. Alle Vorlagen mit submissionId laden
 * 2. Für jede: PPTX (Quer + Hochformat) neu generieren
 * 3. Neue Dateien auf WebDAV hochladen
 * 4. Submission-Dokument aktualisieren
 *
 * Ausführen:  node regenerate-pptx.mjs
 * Dry-Run:    node regenerate-pptx.mjs --dry-run
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();
import { MongoClient, ObjectId } from "mongodb";
import JSZip from "jszip";
import { readFileSync } from "fs";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";

const DRY_RUN = process.argv.includes("--dry-run");

/* ═══ MongoDB ═══ */
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME ?? "bucharena";
if (!MONGODB_URI) { console.error("MONGODB_URI fehlt"); process.exit(1); }

/* ═══ WebDAV ═══ */
const WEBDAV_URL = (process.env.WEBDAV_URL ?? "").replace(/\/$/, "");
const WEBDAV_USERNAME = process.env.WEBDAV_USERNAME ?? "";
const WEBDAV_PASSWORD = process.env.WEBDAV_PASSWORD ?? "";
const WEBDAV_AUTH = "Basic " + Buffer.from(`${WEBDAV_USERNAME}:${WEBDAV_PASSWORD}`).toString("base64");

/* ═══ PPTX Templates ═══ */
const TEMPLATE_QUER = readFileSync("public/Buchempfehlung_vorlage.pptx");
const TEMPLATE_HOCH = readFileSync("public/Shorts.pptx");

/* ═══ XML Namespaces ═══ */
const A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main";
const P_NS = "http://schemas.openxmlformats.org/presentationml/2006/main";

/* ═══════════════ XML Helpers ═══════════════ */

function replaceParagraphTexts(xml, replacements) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  const paragraphs = doc.getElementsByTagNameNS(A_NS, "p");

  for (let pi = 0; pi < paragraphs.length; pi++) {
    const para = paragraphs[pi];
    const runs = para.getElementsByTagNameNS(A_NS, "r");
    if (runs.length === 0) continue;

    let fullText = "";
    const tElements = [];
    for (let ri = 0; ri < runs.length; ri++) {
      const t = runs[ri].getElementsByTagNameNS(A_NS, "t")[0];
      if (t) {
        fullText += t.textContent || "";
        tElements.push(t);
      }
    }

    const leading = fullText.match(/^(\s*)/)?.[1] || "";
    const trimmed = fullText.trim();
    for (const [oldText, newText] of replacements) {
      if (trimmed === oldText) {
        if (tElements.length > 0) {
          tElements[0].textContent = leading + newText;
          for (let i = 1; i < tElements.length; i++) {
            tElements[i].textContent = "";
          }
        }
        break;
      }
    }
  }

  return new XMLSerializer().serializeToString(doc);
}

function replaceBulletParagraphs(xml, firstBulletText, newTexts) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  const paragraphs = doc.getElementsByTagNameNS(A_NS, "p");

  let targetBody = null;
  let templatePara = null;

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const runs = para.getElementsByTagNameNS(A_NS, "r");
    let text = "";
    for (let ri = 0; ri < runs.length; ri++) {
      const t = runs[ri].getElementsByTagNameNS(A_NS, "t")[0];
      if (t) text += t.textContent || "";
    }
    if (text.trim() === firstBulletText) {
      templatePara = para;
      targetBody = para.parentNode;
      break;
    }
  }

  if (!targetBody || !templatePara) return xml;

  const bodyParas = [];
  for (let i = 0; i < targetBody.childNodes.length; i++) {
    const child = targetBody.childNodes[i];
    if (child.localName === "p" && child.namespaceURI === A_NS) {
      bodyParas.push(child);
    }
  }

  for (const p of bodyParas) {
    if (p !== templatePara) targetBody.removeChild(p);
  }

  setParaText(templatePara, newTexts[0] || "", A_NS);

  for (let i = 1; i < newTexts.length; i++) {
    const clone = templatePara.cloneNode(true);
    setParaText(clone, newTexts[i], A_NS);
    targetBody.appendChild(clone);
  }

  return new XMLSerializer().serializeToString(doc);
}

function setParaText(para, text, ns) {
  const runs = para.getElementsByTagNameNS(ns, "r");
  if (runs.length > 0) {
    const t = runs[0].getElementsByTagNameNS(ns, "t")[0];
    if (t) t.textContent = text;
    for (let i = runs.length - 1; i > 0; i--) {
      runs[i].parentNode?.removeChild(runs[i]);
    }
  }
}

function replaceNotesText(xml, newNotes) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  const bodies = doc.getElementsByTagNameNS(P_NS, "txBody");

  for (let bi = 0; bi < bodies.length; bi++) {
    const body = bodies[bi];
    const paras = body.getElementsByTagNameNS(A_NS, "p");
    let bodyText = "";
    for (let pi = 0; pi < paras.length; pi++) bodyText += paras[pi].textContent || "";
    if (bodyText.trim().length > 5) {
      const first = paras[0];
      const runs = first.getElementsByTagNameNS(A_NS, "r");
      if (runs.length > 0) {
        const t = runs[0].getElementsByTagNameNS(A_NS, "t")[0];
        if (t) t.textContent = newNotes;
        for (let i = runs.length - 1; i > 0; i--) {
          runs[i].parentNode?.removeChild(runs[i]);
        }
      }
      for (let i = paras.length - 1; i > 0; i--) {
        body.removeChild(paras[i]);
      }
      break;
    }
  }

  return new XMLSerializer().serializeToString(doc);
}

function dataUrlToUint8Array(dataUrl) {
  const parts = dataUrl.split(",");
  const raw = Buffer.from(parts[1], "base64");
  return new Uint8Array(raw);
}

/* ═══════════════ PPTX Generators ═══════════════ */

async function buildQuerformat(form, autorFull, coverImg, autorImg) {
  const zip = await JSZip.loadAsync(TEMPLATE_QUER);

  /* Slide 1 */
  let s1 = await zip.file("ppt/slides/slide1.xml").async("string");
  s1 = replaceParagraphTexts(s1, [
    ["Hüter in Ausbildung", form.buchtitel],
    ["Eine Episode endet. Eine neue beginnt.", form.untertitel || ""],
    ["Martina Zöchinger", autorFull],
  ]);
  zip.file("ppt/slides/slide1.xml", s1);

  /* Slide 2 */
  const coverDesignText = form.coverDesign
    ? "Coverdesign: " + form.coverDesign
    : (form.geschlecht || "Autorin") + " & Coverdesign: " + autorFull;
  let s2 = await zip.file("ppt/slides/slide2.xml").async("string");
  s2 = replaceParagraphTexts(s2, [
    ["Autorin: Martina Zöchinger", (form.geschlecht || "Autorin") + ": " + autorFull],
    ["Erscheinungsjahr: 2025", "Erscheinungsjahr: " + (form.erscheinungsjahr || "")],
    ["Genre: Fantasy, Spiritualität", "Genre: " + (form.genre || "")],
    ["Hintergrund: basiert auf einer wahren Begebenheit", "Hintergrund: " + (form.hintergrund || "")],
    ["Hüter - Die Ausbildung beginnt", form.buchtitel],
    ["Autorin & Coverdesign: Martina Zöchinger", coverDesignText],
    ["Verlag: Independently published", "Verlag: " + (form.verlag || "")],
  ]);
  zip.file("ppt/slides/slide2.xml", s2);

  /* Slide 3 */
  let s3 = await zip.file("ppt/slides/slide3.xml").async("string");
  s3 = replaceParagraphTexts(s3, [
    ["Hauptfigur: ein Verstorbener auf dem Weg zum Hüter", "Hauptfigur: " + (form.hauptfigur || "")],
    ["Thema: Tod & Jenseits", "Thema: " + (form.thema || "")],
    ["Inhalte: Wahrheitssuche, Prüfungen", "Inhalte: " + (form.inhalte || "")],
    ["Schwerpunkt: Trauerbewältigung, Leben nach dem Tod", "Schwerpunkt: " + (form.schwerpunkt || "")],
  ]);
  zip.file("ppt/slides/slide3.xml", s3);

  /* Slide 4 */
  let s4 = await zip.file("ppt/slides/slide4.xml").async("string");
  s4 = replaceParagraphTexts(s4, [
    ["Über die Autorin", "Über " + (form.geschlecht === "Autor" ? "den Autor" : "die Autorin")],
    ["Martina Zöchinger", autorFull],
    ["Österreich, Steiermark", form.autorHerkunft || ""],
    ["Mutter, Medienfachfrau, Mentaltrainerin", form.autorBeruf || ""],
    ["Stil: authentisch, autobiografisch", "Stil: " + (form.autorStil || "")],
  ]);
  zip.file("ppt/slides/slide4.xml", s4);

  /* Slide 5 */
  const bullets = (form.zusammenfassung || []).filter((b) => b.trim());
  let s5 = await zip.file("ppt/slides/slide5.xml").async("string");
  s5 = replaceBulletParagraphs(s5, "Hüter in Ausbildung", bullets.length > 0 ? bullets : [""]);
  zip.file("ppt/slides/slide5.xml", s5);

  /* Images */
  if (coverImg) zip.file("ppt/media/image3.jpeg", dataUrlToUint8Array(coverImg));
  if (autorImg) zip.file("ppt/media/image6.jpeg", dataUrlToUint8Array(autorImg));

  /* Notes */
  const notesMap = [
    ["ppt/notesSlides/notesSlide1.xml", form.notes1],
    ["ppt/notesSlides/notesSlide2.xml", form.notes2],
    ["ppt/notesSlides/notesSlide3.xml", form.notes3],
    ["ppt/notesSlides/notesSlide4.xml", form.notes4],
    ["ppt/notesSlides/notesSlide5.xml", form.notes5],
  ];
  for (const [path, notes] of notesMap) {
    if (notes && zip.file(path)) {
      let xml = await zip.file(path).async("string");
      xml = replaceNotesText(xml, notes);
      zip.file(path, xml);
    }
  }

  return await zip.generateAsync({ type: "uint8array" });
}

async function buildHochformat(form, autorFull, coverImg, autorImg) {
  const zip = await JSZip.loadAsync(TEMPLATE_HOCH);

  function replacePlaceholders(xml, replacements) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "application/xml");
    const paragraphs = doc.getElementsByTagNameNS(A_NS, "p");

    for (let pi = 0; pi < paragraphs.length; pi++) {
      const para = paragraphs[pi];
      const runs = para.getElementsByTagNameNS(A_NS, "r");
      if (runs.length === 0) continue;

      let fullText = "";
      const tElements = [];
      for (let ri = 0; ri < runs.length; ri++) {
        const t = runs[ri].getElementsByTagNameNS(A_NS, "t")[0];
        if (t) {
          fullText += t.textContent || "";
          tElements.push(t);
        }
      }

      const trimmed = fullText.trim();
      for (const [oldText, newText] of replacements) {
        if (trimmed === oldText) {
          if (tElements.length > 0) {
            tElements[0].textContent = newText;
            for (let i = 1; i < tElements.length; i++) {
              tElements[i].textContent = "";
            }
          }
          break;
        }
      }
    }

    return new XMLSerializer().serializeToString(doc);
  }

  /* Slide 1 */
  let s1 = await zip.file("ppt/slides/slide1.xml").async("string");
  s1 = replacePlaceholders(s1, [
    ["#Titel", form.buchtitel],
    ["#Untertitel", form.untertitel || ""],
    ["#Autor", autorFull],
  ]);
  zip.file("ppt/slides/slide1.xml", s1);

  /* Slide 2 */
  let s2 = await zip.file("ppt/slides/slide2.xml").async("string");
  s2 = replacePlaceholders(s2, [
    ["#1", (form.geschlecht || "Autorin") + ": " + autorFull],
    ["#2", "Erscheinungsjahr: " + (form.erscheinungsjahr || "")],
    ["#3", "Genre: " + (form.genre || "")],
    ["#4", "Hintergrund: " + (form.hintergrund || "")],
    ["#Titel", form.buchtitel],
    ["Cover: #Cover", "Cover: " + (form.coverDesign || autorFull)],
    ["#Verlag", form.verlag || ""],
    ["Verlag: #Verlag", "Verlag: " + (form.verlag || "")],
  ]);
  zip.file("ppt/slides/slide2.xml", s2);

  /* Slide 3 */
  let s3 = await zip.file("ppt/slides/slide3.xml").async("string");
  s3 = replacePlaceholders(s3, [
    ["#1", "Hauptfigur: " + (form.hauptfigur || "")],
    ["#2", "Thema: " + (form.thema || "")],
    ["#3", "Inhalte: " + (form.inhalte || "")],
    ["#4", "Schwerpunkt: " + (form.schwerpunkt || "")],
  ]);
  zip.file("ppt/slides/slide3.xml", s3);

  /* Slide 4 */
  let s4 = await zip.file("ppt/slides/slide4.xml").async("string");
  s4 = replacePlaceholders(s4, [
    ["Über die Autorin", "Über " + (form.geschlecht === "Autor" ? "den Autor" : "die Autorin")],
    ["#1", autorFull],
    ["#2", form.autorHerkunft || ""],
    ["#3", form.autorBeruf || ""],
    ["#4", "Stil: " + (form.autorStil || "")],
  ]);
  zip.file("ppt/slides/slide4.xml", s4);

  /* Slide 5 */
  const bullets = (form.zusammenfassung || []).filter((b) => b.trim());
  const s5replacements = [];
  for (let i = 0; i < 5; i++) {
    s5replacements.push([`#${i + 1}`, bullets[i] || ""]);
  }
  let s5 = await zip.file("ppt/slides/slide5.xml").async("string");
  s5 = replacePlaceholders(s5, s5replacements);
  zip.file("ppt/slides/slide5.xml", s5);

  /* Images */
  if (coverImg) zip.file("ppt/media/image3.jpeg", dataUrlToUint8Array(coverImg));
  if (autorImg) zip.file("ppt/media/image5.jpeg", dataUrlToUint8Array(autorImg));

  /* Notes */
  const notesMap = [
    ["ppt/notesSlides/notesSlide1.xml", form.notes1],
    ["ppt/notesSlides/notesSlide2.xml", form.notes2],
    ["ppt/notesSlides/notesSlide3.xml", form.notes3],
    ["ppt/notesSlides/notesSlide4.xml", form.notes4],
    ["ppt/notesSlides/notesSlide5.xml", form.notes5],
  ];
  for (const [path, notes] of notesMap) {
    if (notes && zip.file(path)) {
      let xml = await zip.file(path).async("string");
      xml = replaceNotesText(xml, notes);
      zip.file(path, xml);
    }
  }

  return await zip.generateAsync({ type: "uint8array" });
}

/* ═══════════════ WebDAV Upload ═══════════════ */

async function ensureDir(dirPath) {
  const parts = dirPath.split("/").filter(Boolean);
  let acc = "";
  for (const part of parts) {
    acc += (acc ? "/" : "") + part;
    const uri = `${WEBDAV_URL}/${encodeURIComponent(acc).replace(/%2F/g, "/")}`;
    await fetch(uri, {
      method: "MKCOL",
      headers: { Authorization: WEBDAV_AUTH },
    }).catch(() => {});
  }
}

async function webdavPut(key, data) {
  const target = `${WEBDAV_URL}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
  const contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

  await ensureDir(key.substring(0, key.lastIndexOf("/")));

  const res = await fetch(target, {
    method: "PUT",
    headers: {
      Authorization: WEBDAV_AUTH,
      "Content-Type": contentType,
    },
    body: data,
  });

  if (!res.ok) throw new Error(`WebDAV PUT failed: ${res.status} for ${key}`);
  return key;
}

/* ═══════════════ Main ═══════════════ */

async function main() {
  console.log(DRY_RUN ? "=== DRY RUN ===" : "=== REGENERATING PPTXs ===");

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const vorlagenCol = db.collection("bucharenavorlagen");
  const submissionsCol = db.collection("bucharenasubmissions");

  // Finde alle Vorlagen die submitted wurden
  const vorlagen = await vorlagenCol.find({ submissionId: { $exists: true, $ne: null } }).toArray();
  console.log(`Gefunden: ${vorlagen.length} eingereichte Vorlagen\n`);

  let success = 0;
  let skipped = 0;
  let errors = 0;

  for (const vorlage of vorlagen) {
    const autorFull = vorlage.autorName?.trim() || [vorlage.autorVorname, vorlage.autorNachname].filter(Boolean).join(" ") || "Unbekannt";
    const label = `"${vorlage.buchtitel}" von ${autorFull}`;

    try {
      // Prüfe ob Submission existiert und nicht withdrawn ist
      const submission = await submissionsCol.findOne({
        _id: new ObjectId(vorlage.submissionId),
      });
      if (!submission) {
        console.log(`⏩ ${label} – Submission nicht gefunden, überspringe`);
        skipped++;
        continue;
      }
      if (submission.status === "withdrawn") {
        console.log(`⏩ ${label} – Submission zurückgezogen, überspringe`);
        skipped++;
        continue;
      }

      console.log(`🔄 ${label}`);
      console.log(`   Notes1: ${(vorlage.notes1 || "").substring(0, 60)}...`);

      if (DRY_RUN) {
        console.log(`   [DRY RUN] Würde 2 PPTXs generieren und hochladen\n`);
        success++;
        continue;
      }

      // Generiere beide Formate
      const pptxQuer = await buildQuerformat(vorlage, autorFull, vorlage.coverImg, vorlage.autorImg);
      const pptxHoch = await buildHochformat(vorlage, autorFull, vorlage.coverImg, vorlage.autorImg);

      // Upload
      const timestamp = Date.now();
      const safeName = (str) =>
        (str || "").replace(/[^a-zA-Z0-9äöüÄÖÜß .-]/g, "_").replace(/\s+/g, " ").trim();
      const querName = `${safeName(vorlage.buchtitel)} von ${safeName(autorFull)}.pptx`;
      const hochName = `Shorts ${safeName(vorlage.buchtitel)} von ${safeName(autorFull)}.pptx`;
      const querKey = `bucharena-submissions/${timestamp}_${querName}`;
      const hochKey = `bucharena-submissions/${timestamp}_${hochName}`;

      await webdavPut(querKey, pptxQuer);
      await webdavPut(hochKey, pptxHoch);

      // Submission aktualisieren
      const newFiles = [
        { fileName: querName, fileSize: pptxQuer.length, filePath: querKey },
        { fileName: hochName, fileSize: pptxHoch.length, filePath: hochKey },
      ];

      await submissionsCol.updateOne(
        { _id: new ObjectId(vorlage.submissionId) },
        {
          $set: {
            fileName: querName,
            fileSize: pptxQuer.length,
            filePath: querKey,
            files: newFiles,
            updatedAt: new Date(),
          },
        },
      );

      console.log(`   ✅ Hochgeladen & aktualisiert\n`);
      success++;
    } catch (err) {
      console.error(`   ❌ Fehler bei ${label}:`, err.message, "\n");
      errors++;
    }
  }

  console.log("═══════════════════════════");
  console.log(`Fertig! Erfolg: ${success}, Übersprungen: ${skipped}, Fehler: ${errors}`);

  await client.close();
}

main().catch((err) => {
  console.error("Fataler Fehler:", err);
  process.exit(1);
});
