import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  getWebdavClient,
  getWebdavUploadDir,
  toInternalImageUrl,
} from "@/lib/webdav-storage";
import { getServerAccount } from "@/lib/server-auth";

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
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "Datei fehlt." },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { message: "Nur Bilddateien sind erlaubt." },
        { status: 400 }
      );
    }

    const username = sanitizeUsername(account.username);

    const extension = inferExtension(file.name, file.type);
    const fileName = `${Date.now()}-${randomUUID()}.${extension}`;
    const uploadDir = getWebdavUploadDir();
    const remoteDirPath = `/${uploadDir}/book-covers/${username}`;
    const remoteFilePath = `${remoteDirPath}/${fileName}`;

    const client = getWebdavClient();
    await client.createDirectory(remoteDirPath, { recursive: true });

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await client.putFileContents(remoteFilePath, fileBuffer, {
      overwrite: true,
    });

    return NextResponse.json({
      message: "Cover hochgeladen.",
      imageUrl: toInternalImageUrl(remoteFilePath),
      remotePath: remoteFilePath,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unbekannter Fehler";
    return NextResponse.json(
      { message: `Cover-Upload fehlgeschlagen: ${detail}` },
      { status: 500 }
    );
  }
}
