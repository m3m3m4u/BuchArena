/**
 * Liefert eine PDF-Datei mit On-Demand-Wasserzeichen.
 * Nur für Teilnehmer und Veranstalter zugänglich.
 * 
 * GET /api/buchzirkel/[id]/datei/[dateiId]
 * 
 * Das Wasserzeichen enthält: Username + Datum + "BuchArena – Vertraulich"
 */
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import JSZip from "jszip";
import {
  getBuchzirkelCollection,
  getBuchzirkelTeilnahmenCollection,
} from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { davGet } from "@/lib/bucharena-webdav";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; dateiId: string }> }
) {
  try {
    const { id, dateiId } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
    }

    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const zirkelCol = await getBuchzirkelCollection();
    const zirkel = await zirkelCol.findOne({ _id: new ObjectId(id) });

    if (!zirkel) {
      return NextResponse.json({ message: "Buchzirkel nicht gefunden." }, { status: 404 });
    }

    const isVeranstalter = zirkel.veranstalterUsername === account.username;
    let isTeilnehmer = false;

    if (!isVeranstalter) {
      const teilnahmen = await getBuchzirkelTeilnahmenCollection();
      const t = await teilnahmen.findOne({
        buchzirkelId: new ObjectId(id),
        teilnehmerUsername: account.username,
      });
      isTeilnehmer = !!t;
    }

    if (!isVeranstalter && !isTeilnehmer) {
      return NextResponse.json({ message: "Kein Zugang." }, { status: 403 });
    }

    const datei = zirkel.dateien.find((d) => d.id === dateiId);
    if (!datei) {
      return NextResponse.json({ message: "Datei nicht gefunden." }, { status: 404 });
    }

    // EPUB: Wasserzeichen in alle HTML/XHTML-Inhalte injizieren
    const isEpub = datei.webdavPath.toLowerCase().endsWith(".epub");
    if (isEpub) {
      const bytes = await davGet(datei.webdavPath);
      if (!bytes) {
        return NextResponse.json({ message: "Datei nicht verfügbar." }, { status: 404 });
      }

      const watermarkText = `${account.username} - ${new Date().toLocaleDateString("de-AT")} - BuchArena Vertraulich`;
      // CSS ::after in <head> injizieren – keine Strukturaenderung am Body,
      // kompatibel mit striktem XHTML/XML in EPUBs
      const watermarkStyle = `<style>body::after{content:"${watermarkText}";position:fixed;bottom:6px;left:0;right:0;text-align:center;font-size:10px;color:rgba(0,0,0,0.3);font-family:sans-serif;pointer-events:none;display:block;z-index:9999;}</style>`;

      const zip = await JSZip.loadAsync(bytes);

      const htmlFiles = Object.keys(zip.files).filter((name) =>
        /\.(html|xhtml|htm)$/i.test(name)
      );

      for (const filename of htmlFiles) {
        const file = zip.files[filename];
        if (file.dir) continue;
        let content = await file.async("string");

        // <style> vor </head> injizieren – kein Body-Eingriff, XML-sicher
        if (/<\/head>/i.test(content)) {
          content = content.replace(/<\/head>/i, `${watermarkStyle}</head>`);
        }

        zip.file(filename, content);
      }

      const watermarkedBuffer = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });

      return new Response(watermarkedBuffer.buffer as ArrayBuffer, {
        headers: {
          "Content-Type": "application/epub+zip",
          "Content-Disposition": `inline; filename="${datei.originalName}"`,
          "Cache-Control": "no-store, private",
          "X-Robots-Tag": "noindex",
        },
      });
    }

    // PDF laden
    const bytes = await davGet(datei.webdavPath);
    if (!bytes) {
      return NextResponse.json({ message: "Datei nicht verfügbar." }, { status: 404 });
    }

    // Wasserzeichen einbetten
    const pdfDoc = await PDFDocument.load(bytes);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();
    const watermarkText = `${account.username} · ${new Date().toLocaleDateString("de-AT")} · BuchArena – Vertraulich`;

    for (const page of pages) {
      const { width, height } = page.getSize();

      // Diagonales Wasserzeichen (mittig)
      page.drawText(watermarkText, {
        x: width / 2 - 200,
        y: height / 2,
        size: 18,
        font,
        color: rgb(0.85, 0.85, 0.85),
        opacity: 0.35,
        rotate: degrees(45),
      });

      // Fußzeile
      page.drawText(watermarkText, {
        x: 30,
        y: 20,
        size: 8,
        font,
        color: rgb(0.6, 0.6, 0.6),
        opacity: 0.6,
      });
    }

    const pdfBytes = await pdfDoc.save();

    return new Response(pdfBytes.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${datei.originalName}"`,
        "Cache-Control": "no-store, private",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (err) {
    console.error("buchzirkel datei GET:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
