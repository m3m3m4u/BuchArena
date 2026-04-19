import { NextResponse } from "next/server";
import {
  getBucharenaReelVorlagenCollection,
  getBucharenaSubmissionsCollection,
  toObjectId,
} from "@/lib/bucharena-db";
import { davPut } from "@/lib/bucharena-webdav";
import { getServerAccount } from "@/lib/server-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { ObjectId } from "mongodb";
import { buildKurzVideoPptx } from "@/lib/pptx-vorlage";

export const runtime = "nodejs";
export const maxDuration = 120;

function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * POST /api/bucharena/reel-vorlagen/[id]/submit
 * Generates the Kurzvideo PPTX server-side and creates a submission entry.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const account = await getServerAccount();
    if (!account?.username) {
      return NextResponse.json({ success: false, error: "Nicht eingeloggt" }, { status: 401 });
    }
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Ungültige ID" }, { status: 400 });
    }

    const allowed = checkRateLimit(`reel-submit:${account.username}`, 5, 60_000);
    if (!allowed) {
      return NextResponse.json({ success: false, error: "Zu viele Einreichungen. Bitte warte etwas." }, { status: 429 });
    }

    const vorlagenCol = await getBucharenaReelVorlagenCollection();
    const vorlage = await vorlagenCol.findOne({ _id: toObjectId(id), username: account.username });
    if (!vorlage) {
      return NextResponse.json({ success: false, error: "Vorlage nicht gefunden" }, { status: 404 });
    }

    if (vorlage.submissionId) {
      return NextResponse.json({ success: false, error: "Diese Vorlage wurde bereits eingereicht" }, { status: 400 });
    }

    const pptxBuffer = await buildKurzVideoPptx(vorlage);

    const timestamp = Date.now();
    const autorFull = vorlage.autorName?.trim() || "Unbekannt";
    const safeTitle = sanitizeFileName(vorlage.buchtitel || "Reel");
    const safeAutor = sanitizeFileName(autorFull);
    const generatedName = `Reel ${safeTitle} von ${safeAutor}.pptx`;
    const uniqueFileName = `${timestamp}_${generatedName.replace(/[^a-zA-Z0-9äöüÄÖÜß .-]/g, "_")}`;
    const webdavKey = `bucharena-reel-submissions/${uniqueFileName}`;

    let filePath = `local:${uniqueFileName}`;
    try {
      const contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
      const uploadResult = await davPut(webdavKey, new Uint8Array(pptxBuffer), contentType);
      if (uploadResult) filePath = webdavKey;
    } catch (uploadErr) {
      console.error("WebDAV-Upload fehlgeschlagen:", uploadErr);
    }

    const subCol = await getBucharenaSubmissionsCollection();
    const now = new Date();
    const subResult = await subCol.insertOne({
      bookTitle: vorlage.buchtitel,
      author: autorFull,
      genre: vorlage.genre || "Sonstiges",
      ageRange: "Alle Altersgruppen",
      fileName: generatedName,
      fileSize: pptxBuffer.length,
      filePath,
      files: [{ fileName: generatedName, fileSize: pptxBuffer.length, filePath }],
      notes: vorlage.notiz || "Erstellt mit dem Reel-Editor",
      beschreibung: vorlage.beschreibung || "",
      submittedBy: account.username,
      status: "pending",
      type: "reel",
      createdAt: now,
      updatedAt: now,
    });

    await vorlagenCol.updateOne(
      { _id: toObjectId(id) },
      { $set: { submissionId: subResult.insertedId.toHexString(), updatedAt: now } },
    );

    return NextResponse.json({
      success: true,
      submissionId: subResult.insertedId.toHexString(),
      message: "Reel erfolgreich eingereicht!",
    });
  } catch (error) {
    console.error("Fehler beim Einreichen:", error);
    return NextResponse.json({ success: false, error: "Interner Serverfehler" }, { status: 500 });
  }
}

/**
 * DELETE /api/bucharena/reel-vorlagen/[id]/submit
 * Withdraws a submitted reel (sets submission status to "withdrawn" and clears submissionId).
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const account = await getServerAccount();
    if (!account?.username) {
      return NextResponse.json({ success: false, error: "Nicht eingeloggt" }, { status: 401 });
    }
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Ungültige ID" }, { status: 400 });
    }

    const vorlagenCol = await getBucharenaReelVorlagenCollection();
    const vorlage = await vorlagenCol.findOne({ _id: toObjectId(id), username: account.username });
    if (!vorlage) {
      return NextResponse.json({ success: false, error: "Vorlage nicht gefunden" }, { status: 404 });
    }
    if (!vorlage.submissionId) {
      return NextResponse.json({ success: false, error: "Keine aktive Einreichung" }, { status: 400 });
    }

    const subCol = await getBucharenaSubmissionsCollection();
    const subId = toObjectId(vorlage.submissionId);
    const sub = await subCol.findOne({ _id: subId });
    if (sub && sub.status !== "approved" && sub.status !== "done") {
      await subCol.updateOne({ _id: subId }, { $set: { status: "withdrawn", updatedAt: new Date() } });
    }

    await vorlagenCol.updateOne(
      { _id: toObjectId(id) },
      { $unset: { submissionId: "" }, $set: { updatedAt: new Date() } },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Fehler beim Zurückziehen:", error);
    return NextResponse.json({ success: false, error: "Interner Serverfehler" }, { status: 500 });
  }
}
