import { NextResponse } from "next/server";
import { getBucharenaSubmissionsCollection } from "@/lib/bucharena-db";
import { davPut } from "@/lib/bucharena-webdav";
import { getServerAccount } from "@/lib/server-auth";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "").replace(/\s+/g, " ").trim();
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const bookTitle = formData.get("bookTitle") as string;
    const author = formData.get("author") as string;
    const genre = formData.get("genre") as string;
    const ageRange = formData.get("ageRange") as string;
    const notes = formData.get("notes") as string;
    const contact = formData.get("contact") as string;
    const contactType = formData.get("contactType") as string;
    const instagram = formData.get("instagram") as string;
    const file = formData.get("file") as File;

    if (!bookTitle || !author || !genre || !ageRange || !contact || !file) {
      return NextResponse.json({ success: false, error: "Alle Pflichtfelder müssen ausgefüllt werden" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
      return NextResponse.json({ success: false, error: "Ungültige E-Mail-Adresse" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".pptx") && !fileName.endsWith(".ppt")) {
      return NextResponse.json({ success: false, error: "Nur PowerPoint-Dateien (.pptx, .ppt) sind erlaubt" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: "Die Datei darf maximal 50MB groß sein" }, { status: 400 });
    }

    const fileExtension = file.name.toLowerCase().endsWith(".pptx") ? ".pptx" : ".ppt";
    const generatedName = `${sanitizeFileName(bookTitle.trim())} von ${sanitizeFileName(author.trim())}${fileExtension}`;
    const timestamp = Date.now();
    const safeFileName = generatedName.replace(/[^a-zA-Z0-9äöüÄÖÜß .-]/g, "_");
    const uniqueFileName = `${timestamp}_${safeFileName}`;
    const webdavKey = `bucharena-submissions/${uniqueFileName}`;

    const bytes = await file.arrayBuffer();
    const contentType = fileExtension === ".pptx"
      ? "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      : "application/vnd.ms-powerpoint";

    const uploadResult = await davPut(webdavKey, new Uint8Array(bytes), contentType);
    if (!uploadResult) {
      return NextResponse.json({ success: false, error: "Fehler beim Hochladen der Datei." }, { status: 500 });
    }

    const col = await getBucharenaSubmissionsCollection();
    const now = new Date();
    const account = await getServerAccount();
    const result = await col.insertOne({
      bookTitle: bookTitle.trim(),
      author: author.trim(),
      genre: genre.trim(),
      ageRange: ageRange.trim(),
      fileName: generatedName,
      fileSize: file.size,
      filePath: webdavKey,
      notes: notes?.trim() || undefined,
      contact: contact.trim(),
      contactType: (contactType as "email" | "instagram") || "email",
      instagram: instagram?.trim() || undefined,
      submittedBy: account?.username || undefined,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ success: true, message: "Einreichung erfolgreich!", submissionId: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error("Fehler beim Upload:", error);
    return NextResponse.json({ success: false, error: "Fehler beim Hochladen der Datei" }, { status: 500 });
  }
}
