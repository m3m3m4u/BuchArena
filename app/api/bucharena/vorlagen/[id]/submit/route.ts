import { NextResponse } from "next/server";
import {
  getBucharenaVorlagenCollection,
  getBucharenaSubmissionsCollection,
  toObjectId,
} from "@/lib/bucharena-db";
import { davPut } from "@/lib/bucharena-webdav";
import { getServerAccount } from "@/lib/server-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { ObjectId } from "mongodb";
import { buildVorlagePptx, buildShortsVorlagePptx, getAutorFull } from "@/lib/pptx-vorlage";

export const runtime = "nodejs";
export const maxDuration = 120;

function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * POST /api/bucharena/vorlagen/[id]/submit
 * Generates the PPTX server-side from the stored vorlage and creates a submission entry.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const account = await getServerAccount();
    if (!account?.username) {
      return NextResponse.json({ success: false, error: "Nicht eingeloggt" }, { status: 401 });
    }
    if (!ObjectId.isValid(id) || new ObjectId(id).toHexString() !== id) {
      return NextResponse.json({ success: false, error: "Ungültige ID" }, { status: 400 });
    }

    // Rate limiting
    const allowed = checkRateLimit(`submit:${account.username}`, 5, 60_000);
    if (!allowed) {
      return NextResponse.json({ success: false, error: "Zu viele Einreichungen. Bitte warte etwas." }, { status: 429 });
    }

    // Verify vorlage belongs to user
    const vorlagenCol = await getBucharenaVorlagenCollection();
    const vorlage = await vorlagenCol.findOne({ _id: toObjectId(id), username: account.username });
    if (!vorlage) {
      return NextResponse.json({ success: false, error: "Vorlage nicht gefunden" }, { status: 404 });
    }

    // Check if already submitted
    if (vorlage.submissionId) {
      return NextResponse.json({ success: false, error: "Diese Vorlage wurde bereits eingereicht" }, { status: 400 });
    }

    // Generate PPTX files server-side
    const autorFull = getAutorFull(vorlage);
    const [pptxQuer, pptxHoch] = await Promise.all([
      buildVorlagePptx(vorlage),
      buildShortsVorlagePptx(vorlage),
    ]);

    // Upload to WebDAV
    const timestamp = Date.now();
    const contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    const uploadedFiles: { fileName: string; fileSize: number; filePath: string }[] = [];

    const filesToUpload: [Buffer, string][] = [
      [pptxQuer, `${sanitizeFileName(vorlage.buchtitel)} von ${sanitizeFileName(autorFull)}.pptx`],
      [pptxHoch, `Shorts ${sanitizeFileName(vorlage.buchtitel)} von ${sanitizeFileName(autorFull)}.pptx`],
    ];

    for (const [bytes, generatedName] of filesToUpload) {
      const safeFileName = generatedName.replace(/[^a-zA-Z0-9äöüÄÖÜß .-]/g, "_");
      const uniqueFileName = `${timestamp}_${safeFileName}`;
      const webdavKey = `bucharena-submissions/${uniqueFileName}`;

      let filePath = `local:${uniqueFileName}`;
      try {
        const uploadResult = await davPut(webdavKey, new Uint8Array(bytes), contentType);
        if (uploadResult) filePath = webdavKey;
      } catch (uploadErr) {
        console.error("WebDAV-Upload fehlgeschlagen:", uploadErr);
      }
      uploadedFiles.push({ fileName: generatedName, fileSize: bytes.length, filePath });
    }

    // Create submission
    const subCol = await getBucharenaSubmissionsCollection();
    const now = new Date();
    const primary = uploadedFiles[0];
    const subResult = await subCol.insertOne({
      bookTitle: vorlage.buchtitel,
      author: autorFull,
      genre: vorlage.genre || "Sonstiges",
      ageRange: "Alle Altersgruppen",
      fileName: primary.fileName,
      fileSize: primary.fileSize,
      filePath: primary.filePath,
      files: uploadedFiles,
      notes: vorlage.notiz || "Erstellt mit dem Vorlagen-Editor",
      submittedBy: account.username,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    // Link submission to vorlage
    await vorlagenCol.updateOne(
      { _id: toObjectId(id) },
      { $set: { submissionId: subResult.insertedId.toHexString(), updatedAt: now } },
    );

    return NextResponse.json({
      success: true,
      submissionId: subResult.insertedId.toHexString(),
      message: "Vorlage erfolgreich eingereicht!",
    });
  } catch (error) {
    console.error("Fehler beim Einreichen:", error);
    return NextResponse.json({ success: false, error: "Interner Serverfehler" }, { status: 500 });
  }
}

/**
 * DELETE /api/bucharena/vorlagen/[id]/submit
 * Withdraws a submission (sets status to "withdrawn" and unlinks from vorlage).
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const account = await getServerAccount();
    if (!account?.username) {
      return NextResponse.json({ success: false, error: "Nicht eingeloggt" }, { status: 401 });
    }
    if (!ObjectId.isValid(id) || new ObjectId(id).toHexString() !== id) {
      return NextResponse.json({ success: false, error: "Ungültige ID" }, { status: 400 });
    }

    const vorlagenCol = await getBucharenaVorlagenCollection();
    const vorlage = await vorlagenCol.findOne({ _id: toObjectId(id), username: account.username });
    if (!vorlage) {
      return NextResponse.json({ success: false, error: "Vorlage nicht gefunden" }, { status: 404 });
    }
    if (!vorlage.submissionId) {
      return NextResponse.json({ success: false, error: "Keine Einreichung vorhanden" }, { status: 400 });
    }

    // Mark submission as withdrawn
    const subCol = await getBucharenaSubmissionsCollection();
    await subCol.updateOne(
      { _id: toObjectId(vorlage.submissionId) },
      { $set: { status: "withdrawn", updatedAt: new Date() } },
    );

    // Unlink from vorlage
    await vorlagenCol.updateOne(
      { _id: toObjectId(id) },
      { $unset: { submissionId: "" }, $set: { updatedAt: new Date() } },
    );

    return NextResponse.json({ success: true, message: "Einreichung zurückgezogen" });
  } catch (error) {
    console.error("Fehler beim Zurückziehen:", error);
    return NextResponse.json({ success: false, error: "Interner Serverfehler" }, { status: 500 });
  }
}
