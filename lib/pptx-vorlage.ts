/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Server-side PPTX generation for BuchArena Vorlagen.
 * Uses @xmldom/xmldom (Node.js DOM) and jszip to manipulate PPTX templates.
 */
import path from "path";
import fs from "fs/promises";
import JSZip from "jszip";
import sharp from "sharp";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import type { BucharenaVorlageDoc, BucharenaReelVorlageDoc } from "./bucharena-db";
import { getWebdavClient } from "./webdav-storage";

const A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main";
const P_NS = "http://schemas.openxmlformats.org/presentationml/2006/main";

function dataUrlToBytes(dataUrl: string): Buffer {
  const base64 = dataUrl.split(",")[1];
  return Buffer.from(base64, "base64");
}

async function imageToBytes(src: string): Promise<Buffer> {
  if (src.startsWith("data:")) return dataUrlToBytes(src);
  // WebDAV-interne URL: /api/profile/image?path=...
  const remotePath = new URL(src, "http://localhost").searchParams.get("path") ?? "";
  if (!remotePath) throw new Error("Ungültige Bild-URL: " + src);
  const client = getWebdavClient();
  const data = await client.getFileContents(remotePath);
  return Buffer.from(data as ArrayBuffer);
}

/** Crop an image to a centered square using sharp */
async function cropToSquare(src: string): Promise<Buffer> {
  const raw = await imageToBytes(src);
  const meta = await sharp(raw).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  const size = Math.min(w, h);
  const left = Math.floor((w - size) / 2);
  const top = Math.floor((h - size) / 2);
  return sharp(raw)
    .extract({ left, top, width: size, height: size })
    .jpeg({ quality: 90 })
    .toBuffer();
}

export function getAutorFull(vorlage: Pick<BucharenaVorlageDoc, "autorName" | "autorVorname" | "autorNachname">): string {
  if (vorlage.autorName?.trim()) return vorlage.autorName.trim();
  return [vorlage.autorVorname, vorlage.autorNachname].filter(Boolean).join(" ") || "Unbekannt";
}

function nodeList(nl: any): any[] {
  const result: any[] = [];
  for (let i = 0; i < nl.length; i++) result.push(nl.item(i));
  return result;
}

function replaceParagraphTexts(xml: string, replacements: [string, string][]): string {
  const doc: any = new DOMParser().parseFromString(xml, "application/xml");
  const paragraphs = nodeList(doc.getElementsByTagNameNS(A_NS, "p"));

  for (const para of paragraphs) {
    const runs = nodeList(para.getElementsByTagNameNS(A_NS, "r"));
    if (runs.length === 0) continue;

    let fullText = "";
    const tElements: any[] = [];
    for (const run of runs) {
      const ts = nodeList(run.getElementsByTagNameNS(A_NS, "t"));
      if (ts.length > 0) {
        fullText += ts[0].textContent || "";
        tElements.push(ts[0]);
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

function replaceBulletParagraphs(xml: string, firstBulletText: string, newTexts: string[]): string {
  const doc: any = new DOMParser().parseFromString(xml, "application/xml");
  const paragraphs = nodeList(doc.getElementsByTagNameNS(A_NS, "p"));

  let targetBody: any = null;
  let templatePara: any = null;

  for (const para of paragraphs) {
    const runs = nodeList(para.getElementsByTagNameNS(A_NS, "r"));
    let text = "";
    for (const run of runs) {
      const ts = nodeList(run.getElementsByTagNameNS(A_NS, "t"));
      if (ts.length > 0) text += ts[0].textContent || "";
    }
    if (text.trim() === firstBulletText) {
      templatePara = para;
      targetBody = para.parentNode;
      break;
    }
  }

  if (!targetBody || !templatePara) return xml;

  const bodyParas: any[] = [];
  for (let ci = 0; ci < targetBody.childNodes.length; ci++) {
    const child = targetBody.childNodes.item(ci);
    if (child && child.localName === "p" && child.namespaceURI === A_NS) {
      bodyParas.push(child);
    }
  }

  for (const p of bodyParas) {
    if (p !== templatePara) targetBody.removeChild(p);
  }

  setParaText(templatePara, newTexts[0] || "");

  for (let i = 1; i < newTexts.length; i++) {
    const clone = templatePara.cloneNode(true);
    setParaText(clone, newTexts[i]);
    targetBody.appendChild(clone);
  }

  return new XMLSerializer().serializeToString(doc);
}

function setParaText(para: any, text: string): void {
  const runs = nodeList(para.getElementsByTagNameNS(A_NS, "r"));
  if (runs.length > 0) {
    const ts = nodeList(runs[0].getElementsByTagNameNS(A_NS, "t"));
    if (ts.length > 0) ts[0].textContent = text;
    for (let i = runs.length - 1; i > 0; i--) {
      runs[i].parentNode?.removeChild(runs[i]);
    }
  }
}

function replaceNotesText(xml: string, newNotes: string): string {
  const doc: any = new DOMParser().parseFromString(xml, "application/xml");
  const bodies = nodeList(doc.getElementsByTagNameNS(P_NS, "txBody"));

  for (const body of bodies) {
    const paras = nodeList(body.getElementsByTagNameNS(A_NS, "p"));
    let bodyText = "";
    for (const p of paras) bodyText += p.textContent || "";
    if (bodyText.trim().length > 5) {
      const first = paras[0];
      const runs = nodeList(first.getElementsByTagNameNS(A_NS, "r"));
      if (runs.length > 0) {
        const ts = nodeList(runs[0].getElementsByTagNameNS(A_NS, "t"));
        if (ts.length > 0) ts[0].textContent = newNotes;
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

async function applyNotesMap(zip: JSZip, vorlage: BucharenaVorlageDoc): Promise<void> {
  const notesMap: [string, string][] = [
    ["ppt/notesSlides/notesSlide1.xml", vorlage.notes1],
    ["ppt/notesSlides/notesSlide2.xml", vorlage.notes2],
    ["ppt/notesSlides/notesSlide3.xml", vorlage.notes3],
    ["ppt/notesSlides/notesSlide4.xml", vorlage.notes4],
    ["ppt/notesSlides/notesSlide5.xml", vorlage.notes5],
  ];
  for (const [filePath, notes] of notesMap) {
    if (notes && zip.file(filePath)) {
      let xml = await zip.file(filePath)!.async("string");
      xml = replaceNotesText(xml, notes);
      zip.file(filePath, xml);
    }
  }
}

/** Generate the landscape (Querformat) PPTX from the Buchempfehlung template */
export async function buildVorlagePptx(vorlage: BucharenaVorlageDoc): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), "public", "Buchempfehlung_vorlage.pptx");
  const templateBytes = await fs.readFile(templatePath);
  const zip = await JSZip.loadAsync(templateBytes);

  const autorFull = getAutorFull(vorlage);
  const geschlecht = vorlage.geschlecht || "Autorin";

  /* Slide 1 */
  let s1 = await zip.file("ppt/slides/slide1.xml")!.async("string");
  s1 = replaceParagraphTexts(s1, [
    ["Hüter in Ausbildung", vorlage.buchtitel],
    ["Eine Episode endet. Eine neue beginnt.", vorlage.untertitel],
    ["Martina Zöchinger", autorFull],
  ]);
  zip.file("ppt/slides/slide1.xml", s1);

  /* Slide 2 */
  const coverDesignText = vorlage.coverDesign?.trim()
    ? "Coverdesign: " + vorlage.coverDesign
    : geschlecht + " & Coverdesign: " + autorFull;
  let s2 = await zip.file("ppt/slides/slide2.xml")!.async("string");
  s2 = replaceParagraphTexts(s2, [
    ["Autorin: Martina Zöchinger", geschlecht + ": " + autorFull],
    ["Erscheinungsjahr: 2025", "Erscheinungsjahr: " + vorlage.erscheinungsjahr],
    ["Genre: Fantasy, Spiritualität", vorlage.genre?.trim() ? "Genre: " + vorlage.genre : ""],
    ["Hintergrund: basiert auf einer wahren Begebenheit", vorlage.hintergrund?.trim() ? "Hintergrund: " + vorlage.hintergrund : ""],
    ["Hüter - Die Ausbildung beginnt", vorlage.buchtitel],
    ["Autorin & Coverdesign: Martina Zöchinger", coverDesignText],
    ["Verlag: Independently published", vorlage.verlag?.trim() ? "Verlag: " + vorlage.verlag : ""],
  ]);
  zip.file("ppt/slides/slide2.xml", s2);

  /* Slide 3 */
  let s3 = await zip.file("ppt/slides/slide3.xml")!.async("string");
  s3 = replaceParagraphTexts(s3, [
    ["Hauptfigur: ein Verstorbener auf dem Weg zum Hüter", vorlage.hauptfigur?.trim() ? "Hauptfigur: " + vorlage.hauptfigur : ""],
    ["Thema: Tod & Jenseits", vorlage.thema?.trim() ? "Thema: " + vorlage.thema : ""],
    ["Inhalte: Wahrheitssuche, Prüfungen", vorlage.inhalte?.trim() ? "Inhalte: " + vorlage.inhalte : ""],
    ["Schwerpunkt: Trauerbewältigung, Leben nach dem Tod", vorlage.schwerpunkt?.trim() ? "Schwerpunkt: " + vorlage.schwerpunkt : ""],
  ]);
  zip.file("ppt/slides/slide3.xml", s3);

  /* Slide 4 */
  let s4 = await zip.file("ppt/slides/slide4.xml")!.async("string");
  s4 = replaceParagraphTexts(s4, [
    ["Über die Autorin", "Über " + (vorlage.geschlecht === "Autor" ? "den Autor" : vorlage.geschlecht === "Autorin" ? "die Autorin" : autorFull)],
    ["Martina Zöchinger", autorFull],
    ["Österreich, Steiermark", vorlage.autorHerkunft],
    ["Mutter, Medienfachfrau, Mentaltrainerin", vorlage.autorBeruf],
    ["Stil: authentisch, autobiografisch", vorlage.autorStil?.trim() ? "Stil: " + vorlage.autorStil : ""],
  ]);
  zip.file("ppt/slides/slide4.xml", s4);

  /* Slide 5 */
  const bullets = (vorlage.zusammenfassung || []).filter((b) => b.trim());
  let s5 = await zip.file("ppt/slides/slide5.xml")!.async("string");
  s5 = replaceBulletParagraphs(s5, "Hüter in Ausbildung", bullets.length > 0 ? bullets : [""]);
  zip.file("ppt/slides/slide5.xml", s5);

  /* Images */
  if (vorlage.coverImg) zip.file("ppt/media/image3.jpeg", await imageToBytes(vorlage.coverImg));
  if (vorlage.autorImg) zip.file("ppt/media/image6.jpeg", await imageToBytes(vorlage.autorImg));

  /* Notes */
  await applyNotesMap(zip, vorlage);

  return zip.generateAsync({ type: "nodebuffer" }) as Promise<Buffer>;
}

/** Generate the portrait (Hochformat / Shorts) PPTX */
export async function buildShortsVorlagePptx(vorlage: BucharenaVorlageDoc): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), "public", "Shorts.pptx");
  const templateBytes = await fs.readFile(templatePath);
  const zip = await JSZip.loadAsync(templateBytes);

  const autorFull = getAutorFull(vorlage);
  const geschlecht = vorlage.geschlecht || "Autorin";

  function replacePlaceholders(xml: string, replacements: [string, string][]): string {
    const doc: any = new DOMParser().parseFromString(xml, "application/xml");
    const paragraphs = nodeList(doc.getElementsByTagNameNS(A_NS, "p"));

    for (const para of paragraphs) {
      const runs = nodeList(para.getElementsByTagNameNS(A_NS, "r"));
      if (runs.length === 0) continue;

      let fullText = "";
      const tElements: any[] = [];
      for (const run of runs) {
        const ts = nodeList(run.getElementsByTagNameNS(A_NS, "t"));
        if (ts.length > 0) {
          fullText += ts[0].textContent || "";
          tElements.push(ts[0]);
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
  let s1 = await zip.file("ppt/slides/slide1.xml")!.async("string");
  s1 = replacePlaceholders(s1, [
    ["#Titel", vorlage.buchtitel],
    ["#Untertitel", vorlage.untertitel],
    ["#Autor", autorFull],
  ]);
  zip.file("ppt/slides/slide1.xml", s1);

  /* Slide 2 */
  let s2 = await zip.file("ppt/slides/slide2.xml")!.async("string");
  s2 = replacePlaceholders(s2, [
    ["#1", geschlecht + ": " + autorFull],
    ["#2", "Erscheinungsjahr: " + vorlage.erscheinungsjahr],
    ["#3", vorlage.genre?.trim() ? "Genre: " + vorlage.genre : ""],
    ["#4", vorlage.hintergrund?.trim() ? "Hintergrund: " + vorlage.hintergrund : ""],
    ["#Titel", vorlage.buchtitel],
    ["Cover: #Cover", vorlage.coverDesign?.trim() ? "Cover: " + vorlage.coverDesign : ""],
    ["Verlag: #Verlag", vorlage.verlag?.trim() ? "Verlag: " + vorlage.verlag : ""],
  ]);
  zip.file("ppt/slides/slide2.xml", s2);

  /* Slide 3 */
  let s3 = await zip.file("ppt/slides/slide3.xml")!.async("string");
  s3 = replacePlaceholders(s3, [
    ["#1", vorlage.hauptfigur?.trim() ? "Hauptfigur: " + vorlage.hauptfigur : ""],
    ["#2", vorlage.thema?.trim() ? "Thema: " + vorlage.thema : ""],
    ["#3", vorlage.inhalte?.trim() ? "Inhalte: " + vorlage.inhalte : ""],
    ["#4", vorlage.schwerpunkt?.trim() ? "Schwerpunkt: " + vorlage.schwerpunkt : ""],
  ]);
  zip.file("ppt/slides/slide3.xml", s3);

  /* Slide 4 */
  let s4 = await zip.file("ppt/slides/slide4.xml")!.async("string");
  s4 = replacePlaceholders(s4, [
    ["Über die Autorin", "Über " + (vorlage.geschlecht === "Autor" ? "den Autor" : vorlage.geschlecht === "Autorin" ? "die Autorin" : autorFull)],
    ["#1", autorFull],
    ["#2", vorlage.autorHerkunft],
    ["#3", vorlage.autorBeruf],
    ["#4", vorlage.autorStil?.trim() ? "Stil: " + vorlage.autorStil : ""],
  ]);
  zip.file("ppt/slides/slide4.xml", s4);

  /* Slide 5 */
  const bullets5 = (vorlage.zusammenfassung || []).filter((b) => b.trim());
  const s5Replacements: [string, string][] = [];
  for (let i = 0; i < 5; i++) s5Replacements.push([`#${i + 1}`, bullets5[i] || ""]);
  let s5 = await zip.file("ppt/slides/slide5.xml")!.async("string");
  s5 = replacePlaceholders(s5, s5Replacements);
  zip.file("ppt/slides/slide5.xml", s5);

  /* Images */
  if (vorlage.coverImg) zip.file("ppt/media/image3.jpeg", await imageToBytes(vorlage.coverImg));
  if (vorlage.autorImg) zip.file("ppt/media/image5.jpeg", await imageToBytes(vorlage.autorImg));

  /* Notes */
  await applyNotesMap(zip, vorlage);

  return zip.generateAsync({ type: "nodebuffer" }) as Promise<Buffer>;
}

/** Generate the Kurzvideo (Reel, portrait 9:16) PPTX from the Kurzvideo template */
export async function buildKurzVideoPptx(vorlage: BucharenaReelVorlageDoc): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), "public", "Kurzvideo.pptx");
  const templateBytes = await fs.readFile(templatePath);
  const zip = await JSZip.loadAsync(templateBytes);

  const autorFull = vorlage.autorName?.trim() || "Unbekannt";
  const geschlecht = vorlage.geschlecht || "Autorin";

  /* Slide 1: Allgemeine Infos */
  const coverDesignText = vorlage.coverDesign?.trim()
    ? "Coverdesign: " + vorlage.coverDesign
    : geschlecht + " & Coverdesign: " + autorFull;
  let s1 = await zip.file("ppt/slides/slide1.xml")!.async("string");
  s1 = replaceParagraphTexts(s1, [
    ["Autorin: Martina Z�chinger", geschlecht + ": " + autorFull],
    ["Erscheinungsjahr: 2025", "Erscheinungsjahr: " + vorlage.erscheinungsjahr],
    ["Genre: Fantasy, Spiritualit�t", vorlage.genre?.trim() ? "Genre: " + vorlage.genre : ""],
    ["Hintergrund: basiert auf einer wahren Begebenheit", vorlage.hintergrund?.trim() ? "Hintergrund: " + vorlage.hintergrund : ""],
    ["H�ter - Die Ausbildung beginnt", vorlage.buchtitel],
    ["Autorin & Coverdesign: Martina Z�chinger", coverDesignText],
    ["Verlag: Independently published", vorlage.verlag?.trim() ? "Verlag: " + vorlage.verlag : ""],
  ]);
  zip.file("ppt/slides/slide1.xml", s1);

  /* Slide 2: Worum geht's? */
  let s2 = await zip.file("ppt/slides/slide2.xml")!.async("string");
  s2 = replaceParagraphTexts(s2, [
    ["Thema: Tod & Jenseits", vorlage.thema?.trim() ? "Thema: " + vorlage.thema : ""],
    ["Hauptfigur: ein Verstorbener auf dem Weg zum H�ter", vorlage.hauptfigur?.trim() ? "Hauptfigur: " + vorlage.hauptfigur : ""],
    ["Inhalte: Wahrheitssuche, Pr�fungen", vorlage.inhalte?.trim() ? "Inhalte: " + vorlage.inhalte : ""],
  ]);
  zip.file("ppt/slides/slide2.xml", s2);

  /* Slide 3: �ber die Autorin */
  let s3 = await zip.file("ppt/slides/slide3.xml")!.async("string");
  s3 = replaceParagraphTexts(s3, [
    ["Über die Autorin", geschlecht === "Autorin" ? "Über die Autorin" : geschlecht === "Autor" ? "Über den Autor" : "Über " + geschlecht],
    ["Martina Z�chinger", autorFull],
    ["�sterreich, Steiermark", vorlage.autorHerkunft || ""],
    ["Mutter, Medienfachfrau, Mentaltrainerin", vorlage.autorBeruf || ""],
    ["Stil: authentisch, autobiografisch", vorlage.autorStil?.trim() ? "Stil: " + vorlage.autorStil : ""],
  ]);
  zip.file("ppt/slides/slide3.xml", s3);

  /* Images: cover → image2.jpeg, author → image6.jpeg */
  if (vorlage.coverImg) zip.file("ppt/media/image2.jpeg", await imageToBytes(vorlage.coverImg));
  if (vorlage.autorImg) zip.file("ppt/media/image6.jpeg", await cropToSquare(vorlage.autorImg));

  return zip.generateAsync({ type: "nodebuffer" }) as Promise<Buffer>;
}
