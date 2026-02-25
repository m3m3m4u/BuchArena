import { NextResponse } from "next/server";
import { getBucharenaBooksCollection } from "@/lib/bucharena-db";
import { requireSuperAdmin } from "@/lib/server-auth";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Keine Berechtigung" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ success: false, error: "Keine Datei hochgeladen" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const sheetName = "LINKS";
    if (!workbook.SheetNames.includes(sheetName)) {
      return NextResponse.json({ success: false, error: `Tabellenblatt "${sheetName}" nicht gefunden` }, { status: 400 });
    }

    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
    const rows = data.slice(1);

    const col = await getBucharenaBooksCollection();
    const results = { updated: 0, created: 0, skipped: 0, errors: [] as string[] };

    for (const row of rows) {
      try {
        const titel = row[1]?.toString().trim() || "";
        const autor = row[2]?.toString().trim() || "";
        const sprecher = row[3]?.toString().trim() || undefined;
        const autorInsta = row[4]?.toString().trim() || undefined;
        const amazonLink = row[5]?.toString().trim() || undefined;

        if (!titel || !autor) { results.skipped++; continue; }

        let publishDate: string | undefined;
        if (row[6]) {
          const dateStr = row[6].toString().trim();
          if (dateStr) {
            let parsedDate: Date | null = null;
            const dateTimeMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})$/);
            if (dateTimeMatch) {
              const [, day, month, year, hour, minute] = dateTimeMatch;
              parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), 0, 0);
            } else if (!isNaN(Number(dateStr))) {
              const excelDate = Number(dateStr);
              const days = Math.floor(excelDate);
              const timeFraction = excelDate - days;
              const excelEpoch = new Date(Date.UTC(1899, 11, 30));
              const dateValue = new Date(excelEpoch.getTime() + days * 86400 * 1000);
              const hours = Math.round(timeFraction * 24);
              parsedDate = new Date(Date.UTC(dateValue.getUTCFullYear(), dateValue.getUTCMonth(), dateValue.getUTCDate(), hours, 0, 0, 0));
            } else {
              parsedDate = new Date(dateStr);
            }
            if (parsedDate && !isNaN(parsedDate.getTime())) {
              publishDate = parsedDate.toISOString();
            }
          }
        }

        const bookData = {
          title: titel,
          author: autor,
          speaker: sprecher,
          authorInstagram: autorInsta,
          amazonUrl: amazonLink,
          youtubeLangUrl: row[7]?.toString().trim() || undefined,
          youtubeShortUrl: row[8]?.toString().trim() || undefined,
          redditUrl: row[9]?.toString().trim() || undefined,
          tiktokUrl: row[10]?.toString().trim() || undefined,
          publishDate,
          isActive: true,
          updatedAt: new Date(),
        };

        const existingBook = await col.findOne({
          title: { $regex: new RegExp(`^${titel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
          author: { $regex: new RegExp(`^${autor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        });

        if (existingBook) {
          await col.updateOne({ _id: existingBook._id }, { $set: { ...bookData, updatedBy: admin.username } });
          results.updated++;
        } else {
          await col.insertOne({ ...bookData, createdBy: admin.username, createdAt: new Date() });
          results.created++;
        }
      } catch (err) {
        const error = err as Error;
        results.errors.push(`Fehler bei "${row[1]}": ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `${results.updated} aktualisiert, ${results.created} erstellt, ${results.skipped} übersprungen, ${results.errors.length} Fehler`,
    });
  } catch (error) {
    console.error("Fehler beim Excel-Upload:", error);
    return NextResponse.json({ success: false, error: "Interner Serverfehler" }, { status: 500 });
  }
}
