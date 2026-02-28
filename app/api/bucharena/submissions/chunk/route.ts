import { NextResponse } from "next/server";
import { getBucharenaSubmissionsCollection } from "@/lib/bucharena-db";
import { davPut, davGet, davDelete, davList } from "@/lib/bucharena-webdav";
import { getServerAccount } from "@/lib/server-auth";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "").replace(/\s+/g, " ").trim();
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const uploadId = formData.get("uploadId") as string;
    const chunkIndex = parseInt(formData.get("chunkIndex") as string);
    const totalChunks = parseInt(formData.get("totalChunks") as string);
    const chunk = formData.get("chunk") as File;

    const bookTitle = formData.get("bookTitle") as string;
    const author = formData.get("author") as string;
    const genre = formData.get("genre") as string;
    const ageRange = formData.get("ageRange") as string;
    const notes = formData.get("notes") as string;
    const contact = formData.get("contact") as string;
    const contactType = formData.get("contactType") as string;
    const instagram = formData.get("instagram") as string;
    const fileName = formData.get("fileName") as string;
    const fileSize = parseInt(formData.get("fileSize") as string) || 0;

    if (!uploadId || chunkIndex === undefined || !totalChunks || !chunk) {
      return NextResponse.json({ success: false, error: "Fehlende Chunk-Daten" }, { status: 400 });
    }

    const chunkKey = `bucharena-temp/${uploadId}/chunk_${chunkIndex.toString().padStart(4, "0")}`;
    const chunkBytes = await chunk.arrayBuffer();
    await davPut(chunkKey, new Uint8Array(chunkBytes));

    if (chunkIndex === 0) {
      const account = await getServerAccount();
      const metaKey = `bucharena-temp/${uploadId}/metadata.json`;
      const metaData = JSON.stringify({ bookTitle, author, genre, ageRange, notes, contact, contactType, instagram, fileName, fileSize, totalChunks, submittedBy: account?.username });
      await davPut(metaKey, new TextEncoder().encode(metaData), "application/json");
    }

    if (chunkIndex === totalChunks - 1) {
      return await finalizeUpload(uploadId, totalChunks);
    }

    return NextResponse.json({ success: true, message: `Chunk ${chunkIndex + 1}/${totalChunks} empfangen`, received: chunkIndex + 1, total: totalChunks });
  } catch (error) {
    console.error("Chunk-Upload-Fehler:", error);
    return NextResponse.json({ success: false, error: "Fehler beim Chunk-Upload" }, { status: 500 });
  }
}

async function finalizeUpload(uploadId: string, totalChunks: number) {
  try {
    const metaKey = `bucharena-temp/${uploadId}/metadata.json`;
    const metaBytes = await davGet(metaKey);
    if (!metaBytes) return NextResponse.json({ success: false, error: "Metadaten nicht gefunden" }, { status: 400 });

    const meta = JSON.parse(new TextDecoder().decode(metaBytes));
    if (!meta.bookTitle || !meta.author || !meta.genre || !meta.ageRange) {
      await cleanupTempFiles(uploadId);
      return NextResponse.json({ success: false, error: "Fehlende Pflichtfelder" }, { status: 400 });
    }
    if (meta.contactType && meta.contactType !== "email" && meta.contactType !== "instagram") {
      await cleanupTempFiles(uploadId);
      return NextResponse.json({ success: false, error: "Ungültiger Kontakttyp" }, { status: 400 });
    }
    if (meta.contact && meta.contactType === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(meta.contact)) {
      await cleanupTempFiles(uploadId);
      return NextResponse.json({ success: false, error: "Ungültige E-Mail-Adresse" }, { status: 400 });
    }

    const fileNameLower = meta.fileName.toLowerCase();
    if (!fileNameLower.endsWith(".pptx") && !fileNameLower.endsWith(".ppt")) {
      await cleanupTempFiles(uploadId);
      return NextResponse.json({ success: false, error: "Nur PowerPoint-Dateien erlaubt" }, { status: 400 });
    }

    const chunks: Uint8Array[] = [];
    for (let i = 0; i < totalChunks; i++) {
      const chunkKey = `bucharena-temp/${uploadId}/chunk_${i.toString().padStart(4, "0")}`;
      const chunkData = await davGet(chunkKey);
      if (!chunkData) {
        await cleanupTempFiles(uploadId);
        return NextResponse.json({ success: false, error: `Chunk ${i} nicht gefunden` }, { status: 400 });
      }
      chunks.push(chunkData);
    }

    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    const fullFile = new Uint8Array(totalLength);
    let offset = 0;
    for (const c of chunks) { fullFile.set(c, offset); offset += c.length; }

    if (fullFile.length > MAX_FILE_SIZE) {
      await cleanupTempFiles(uploadId);
      return NextResponse.json({ success: false, error: "Datei zu groß (max 50MB)" }, { status: 400 });
    }

    const fileExtension = meta.fileName.toLowerCase().endsWith(".pptx") ? ".pptx" : ".ppt";
    const generatedName = `${sanitizeFileName(meta.bookTitle)} von ${sanitizeFileName(meta.author)}${fileExtension}`;
    const timestamp = Date.now();
    const safeFileName = generatedName.replace(/[^a-zA-Z0-9äöüÄÖÜß .-]/g, "_");
    const webdavKey = `bucharena-submissions/${timestamp}_${safeFileName}`;

    const contentType = fileExtension === ".pptx"
      ? "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      : "application/vnd.ms-powerpoint";

    const uploadResult = await davPut(webdavKey, fullFile, contentType);
    if (!uploadResult) {
      await cleanupTempFiles(uploadId);
      return NextResponse.json({ success: false, error: "Upload fehlgeschlagen" }, { status: 500 });
    }

    const col = await getBucharenaSubmissionsCollection();
    const now = new Date();
    const result = await col.insertOne({
      bookTitle: meta.bookTitle.trim(),
      author: meta.author.trim(),
      genre: meta.genre.trim(),
      ageRange: meta.ageRange.trim(),
      fileName: generatedName,
      fileSize: fullFile.length,
      filePath: webdavKey,
      notes: meta.notes?.trim() || undefined,
      contact: meta.contact?.trim() || undefined,
      contactType: meta.contactType || undefined,
      instagram: meta.instagram?.trim() || undefined,
      submittedBy: meta.submittedBy || undefined,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    await cleanupTempFiles(uploadId);
    return NextResponse.json({ success: true, message: "Einreichung erfolgreich!", submissionId: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error("Finalisierung fehlgeschlagen:", error);
    await cleanupTempFiles(uploadId).catch(() => {});
    return NextResponse.json({ success: false, error: "Fehler beim Abschließen des Uploads" }, { status: 500 });
  }
}

async function cleanupTempFiles(uploadId: string) {
  try {
    const tempFiles = await davList(`bucharena-temp/${uploadId}/`);
    for (const file of tempFiles) { await davDelete(file.key).catch(() => {}); }
    await davDelete(`bucharena-temp/${uploadId}`).catch(() => {});
  } catch (e) { console.warn("Cleanup fehlgeschlagen:", e); }
}
