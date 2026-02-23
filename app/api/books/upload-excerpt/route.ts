import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getBooksCollection } from "@/lib/mongodb";
import type { BookExcerpt } from "@/lib/books";
import {
  getWebdavClient,
  getWebdavUploadDir,
  toInternalImageUrl,
} from "@/lib/webdav-storage";

export const runtime = "nodejs";

function sanitizeUsername(input: string) {
  return input.replace(/[^a-zA-Z0-9_-]/g, "-");
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const bookId = formData.get("bookId");
    const username = formData.get("username");
    const excerptTitle = formData.get("title");
    const excerptType = formData.get("type"); // "text" | "mp3"

    if (
      typeof bookId !== "string" ||
      typeof username !== "string" ||
      typeof excerptTitle !== "string" ||
      typeof excerptType !== "string"
    ) {
      return NextResponse.json(
        { message: "Pflichtfelder fehlen." },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(bookId.trim())) {
      return NextResponse.json(
        { message: "Ungültige Buch-ID." },
        { status: 400 }
      );
    }

    const trimmedTitle = excerptTitle.trim();
    if (!trimmedTitle) {
      return NextResponse.json(
        { message: "Bitte einen Titel für den Textausschnitt angeben." },
        { status: 400 }
      );
    }

    const excerpt: BookExcerpt = {
      id: randomUUID(),
      type: excerptType === "mp3" ? "mp3" : "text",
      title: trimmedTitle.slice(0, 200),
      createdAt: new Date(),
    };

    if (excerptType === "mp3") {
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json(
          { message: "MP3-Datei fehlt." },
          { status: 400 }
        );
      }

      const allowedTypes = ["audio/mpeg", "audio/mp3", "audio/x-mpeg"];
      if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith(".mp3")) {
        return NextResponse.json(
          { message: "Nur MP3-Dateien sind erlaubt." },
          { status: 400 }
        );
      }

      // Max 50 MB
      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json(
          { message: "Die Datei darf maximal 50 MB groß sein." },
          { status: 400 }
        );
      }

      const safeUsername = sanitizeUsername(username.trim());
      const fileName = `${Date.now()}-${randomUUID()}.mp3`;
      const uploadDir = getWebdavUploadDir();
      const remoteDirPath = `/${uploadDir}/book-excerpts/${safeUsername}`;
      const remoteFilePath = `${remoteDirPath}/${fileName}`;

      const client = getWebdavClient();
      await client.createDirectory(remoteDirPath, { recursive: true });

      const fileBuffer = Buffer.from(await file.arrayBuffer());
      await client.putFileContents(remoteFilePath, fileBuffer, {
        overwrite: true,
      });

      excerpt.fileUrl = toInternalImageUrl(remoteFilePath);
    } else {
      // Text excerpt
      const content = formData.get("content");
      if (typeof content !== "string" || !content.trim()) {
        return NextResponse.json(
          { message: "Bitte einen Textinhalt angeben." },
          { status: 400 }
        );
      }
      excerpt.content = content.trim().slice(0, 10000);
    }

    const books = await getBooksCollection();
    const result = await books.updateOne(
      { _id: new ObjectId(bookId.trim()), ownerUsername: username.trim() },
      { $push: { excerpts: excerpt } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Buch nicht gefunden." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Textausschnitt hinzugefügt.",
      excerpt,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unbekannter Fehler";
    return NextResponse.json(
      { message: `Textausschnitt konnte nicht hochgeladen werden: ${detail}` },
      { status: 500 }
    );
  }
}
