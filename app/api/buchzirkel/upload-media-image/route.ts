import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getWebdavClient, getWebdavUploadDir, toInternalImageUrl } from "@/lib/webdav-storage";
import { getServerAccount } from "@/lib/server-auth";

export const runtime = "nodejs";

function sanitizeUsername(input: string) {
  return input.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function inferExtension(fileName: string, mimeType: string) {
  const fromName = fileName.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
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
      return NextResponse.json({ message: "Datei fehlt." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ message: "Nur Bilddateien sind erlaubt." }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ message: "Die Datei darf maximal 10 MB groß sein." }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const magic = fileBuffer.subarray(0, 12);
    const isJpeg = magic[0] === 0xFF && magic[1] === 0xD8;
    const isPng  = magic[0] === 0x89 && magic[1] === 0x50 && magic[2] === 0x4E && magic[3] === 0x47;
    const isGif  = magic[0] === 0x47 && magic[1] === 0x49 && magic[2] === 0x46;
    const isWebp = magic[0] === 0x52 && magic[1] === 0x49 && magic[2] === 0x46 && magic[3] === 0x46
                && magic[8] === 0x57 && magic[9] === 0x45 && magic[10] === 0x42 && magic[11] === 0x50;

    if (!isJpeg && !isPng && !isGif && !isWebp) {
      return NextResponse.json({ message: "Ungültiges Bildformat. Erlaubt: JPEG, PNG, GIF, WebP." }, { status: 400 });
    }

    const username = sanitizeUsername(account.username);
    const ext = inferExtension(file.name, file.type);
    const fileName = `${Date.now()}-${randomUUID()}.${ext}`;
    const uploadDir = getWebdavUploadDir();
    const remoteDirPath = `/${uploadDir}/buchzirkel-media/${username}`;
    const remoteFilePath = `${remoteDirPath}/${fileName}`;

    const client = getWebdavClient();
    await client.createDirectory(remoteDirPath, { recursive: true });
    await client.putFileContents(remoteFilePath, fileBuffer, { overwrite: true });

    return NextResponse.json({
      message: "Bild hochgeladen.",
      imageUrl: toInternalImageUrl(remoteFilePath),
    });
  } catch (error) {
    console.error("buchzirkel/upload-media-image:", error instanceof Error ? error.message : error);
    return NextResponse.json({ message: "Upload fehlgeschlagen." }, { status: 500 });
  }
}
