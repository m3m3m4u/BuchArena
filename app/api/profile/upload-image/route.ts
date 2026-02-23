import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  getWebdavClient,
  getWebdavUploadDir,
  toInternalImageUrl,
} from "@/lib/webdav-storage";

export const runtime = "nodejs";

function sanitizeUsername(input: string) {
  return input.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function inferExtension(fileName: string, mimeType: string) {
  const fromName = fileName.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) {
    return fromName;
  }

  if (mimeType === "image/png") {
    return "png";
  }
  if (mimeType === "image/webp") {
    return "webp";
  }
  if (mimeType === "image/gif") {
    return "gif";
  }

  return "jpg";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const usernameValue = formData.get("username");

    if (!(file instanceof File) || typeof usernameValue !== "string") {
      return NextResponse.json(
        { message: "Datei oder Benutzername fehlt." },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { message: "Nur Bilddateien sind erlaubt." },
        { status: 400 }
      );
    }

    const username = sanitizeUsername(usernameValue.trim());
    if (!username) {
      return NextResponse.json(
        { message: "Ungültiger Benutzername." },
        { status: 400 }
      );
    }

    const extension = inferExtension(file.name, file.type);
    const fileName = `${Date.now()}-${randomUUID()}.${extension}`;
    const uploadDir = getWebdavUploadDir();
    const remoteDirPath = `/${uploadDir}/${username}`;
    const remoteFilePath = `${remoteDirPath}/${fileName}`;

    const client = getWebdavClient();
    await client.createDirectory(remoteDirPath, { recursive: true });

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await client.putFileContents(remoteFilePath, fileBuffer, {
      overwrite: true,
    });

    return NextResponse.json({
      message: "Bild hochgeladen.",
      imageUrl: toInternalImageUrl(remoteFilePath),
      remotePath: remoteFilePath,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unbekannter Fehler";
    return NextResponse.json(
      { message: `Bild-Upload fehlgeschlagen: ${detail}` },
      { status: 500 }
    );
  }
}
