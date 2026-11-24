import { NextResponse } from "next/server";

import JSZip from "jszip";
import {
  getBucharenaSubmissionsCollection,
  getBucharenaReelVorlagenCollection,
  toObjectId,
} from "@/lib/bucharena-db";
import { requireAdmin } from "@/lib/server-auth";
import { getUsersCollection } from "@/lib/mongodb";
import { buildKurzVideoPptx } from "@/lib/pptx-vorlage";
import { generateReelsExcelBuffer, buildReelFileName, type ReelExportItem } from "@/lib/reel-export-utils";

export const runtime = "nodejs";
export const maxDuration = 300;

async function fetchEnrichedReels(query: Record<string, unknown>): Promise<ReelExportItem[]> {
  const col = await getBucharenaSubmissionsCollection();
  const submissions = await col.find(query).sort({ createdAt: -1 }).toArray();

  const usernames = [...new Set(submissions.map((s) => s.submittedBy as string).filter(Boolean))];
  const igMap = new Map<string, string>();
  if (usernames.length > 0) {
    const users = await getUsersCollection();
    const docs = await users
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

  const subIds = submissions.map((s) => s._id.toString());
  const vorlagenCol = await getBucharenaReelVorlagenCollection();
  const vorlagen = await vorlagenCol
    .find({ submissionId: { $in: subIds } })
    .project({
      submissionId: 1,
      thema: 1,
      hauptfigur: 1,
      inhalte: 1,
      autorHerkunft: 1,
      autorBeruf: 1,
      autorStil: 1,
      erscheinungsjahr: 1,
      verlag: 1,
      coverDesign: 1,
      hintergrund: 1,
      geschlecht: 1,
      notiz: 1,
      beschreibung: 1,
    })
    .toArray();
  const vorlageMap = new Map(vorlagen.map((v) => [v.submissionId as string, v as Record<string, unknown>]));

  return submissions.map((s) => {
    const sid = s._id.toString();
    const v = vorlageMap.get(sid);
    return {
      _id: sid,
      bookTitle: s.bookTitle,
      author: s.author,
      genre: s.genre,
      geschlecht: s.geschlecht,
      instagram: s.instagram,
      authorInstagram: igMap.get(s.submittedBy as string) || null,
      beschreibung: s.beschreibung,
      notes: s.notes,
      status: s.status,
      vorlage: v
        ? {
            thema: v.thema as string,
            hauptfigur: v.hauptfigur as string,
            inhalte: v.inhalte as string,
            autorHerkunft: v.autorHerkunft as string,
            autorBeruf: v.autorBeruf as string,
            autorStil: v.autorStil as string,
            erscheinungsjahr: v.erscheinungsjahr as string,
            verlag: v.verlag as string,
          }
        : null,
    };
  });
}

/**
 * GET /api/bucharena/submissions/admin/batch-v2?format=excel&status=done
 * Allows direct download of Excel table for completed reels.
 */
export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Keine Berechtigung" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "done";
    const format = searchParams.get("format") || "excel";

    const query: Record<string, unknown> = { type: "reel" };
    if (status !== "all") query.status = status;

    const items = await fetchEnrichedReels(query);
    const today = new Date().toISOString().slice(0, 10);

    if (format === "excel") {
      const excelBuf = generateReelsExcelBuffer(items, "v2");
      const fileName = `Reels_Version02_${status === "done" ? "Erledigt" : status}_${today}.xlsx`;
      return new NextResponse(Buffer.from(excelBuf) as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        },
      });
    }

    return NextResponse.json({ success: true, count: items.length, items });
  } catch (error) {
    console.error("Fehler in batch-v2 GET:", error);
    return NextResponse.json({ success: false, error: "Interner Serverfehler" }, { status: 500 });
  }
}

/**
 * POST /api/bucharena/submissions/admin/batch-v2
 * Body: { ids?: string[]; allDone?: boolean; includeExcel?: boolean; maxCount?: number }
 * Generates a ZIP file with all requested Version 02 PPTX files (Kurzvideo2.pptx) + Excel sheet.
 */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Keine Berechtigung" }, { status: 403 });

    const body = (await request.json().catch(() => ({}))) as {
      ids?: string[];
      allDone?: boolean;
      status?: string;
      includeExcel?: boolean;
      maxCount?: number;
    };

    const query: Record<string, unknown> = { type: "reel" };
    if (Array.isArray(body.ids) && body.ids.length > 0) {
      query._id = { $in: body.ids.map((id) => toObjectId(id)) };
    } else if (body.allDone || body.status === "done") {
      query.status = "done";
    } else if (body.status && body.status !== "all") {
      query.status = body.status;
    }

    const items = await fetchEnrichedReels(query);
    if (items.length === 0) {
      return NextResponse.json({ success: false, error: "Keine Einreichungen gefunden" }, { status: 404 });
    }

    // Limit to max 30 per ZIP request to avoid Node memory spikes
    const maxCount = Math.min(body.maxCount || 30, 50);
    const selectedItems = items.slice(0, maxCount);

    const vorlagenCol = await getBucharenaReelVorlagenCollection();
    const subIds = selectedItems.map((i) => i._id).filter(Boolean) as string[];
    const vorlagen = await vorlagenCol.find({ submissionId: { $in: subIds } }).toArray();
    const vorlageMap = new Map(vorlagen.map((v) => [v.submissionId as string, v]));

    const zip = new JSZip();
    let generatedCount = 0;

    for (const item of selectedItems) {
      const vDoc = vorlageMap.get(item._id!);
      if (!vDoc) continue;
      try {
        const pptxBuffer = await buildKurzVideoPptx(vDoc, { version: "v2" });
        const fileName = buildReelFileName(item.bookTitle, item.author, "v2");
        zip.file(fileName, pptxBuffer);
        generatedCount++;
      } catch (err) {
        console.error(`Fehler bei Generierung von Reel ${item.bookTitle}:`, err);
      }
    }

    // Add Excel table to the ZIP
    if (body.includeExcel !== false) {
      const excelBuf = generateReelsExcelBuffer(selectedItems, "v2");
      const today = new Date().toISOString().slice(0, 10);
      zip.file(`Reels_Version02_Tabelle_${today}.xlsx`, excelBuf);
    }

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    const today = new Date().toISOString().slice(0, 10);
    const zipName = `Reels_Version02_${generatedCount}_Dateien_${today}.zip`;

    return new NextResponse(zipBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(zipName)}"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Fehler in batch-v2 POST:", error);
    return NextResponse.json({ success: false, error: "Interner Serverfehler" }, { status: 500 });
  }
}
