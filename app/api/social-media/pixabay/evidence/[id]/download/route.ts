import JSZip from "jszip";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { getSocialMediaPixabayLicenseSafesCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { getWebdavClient } from "@/lib/webdav-storage";

export const runtime = "nodejs";

function sanitizeFileName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "pixabay";
}

function fileNameFromPath(remotePath: string) {
  const segments = remotePath.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? "file";
}

async function readRemoteFile(remotePath: string) {
  const client = getWebdavClient();
  const content = await client.getFileContents(remotePath, { format: "binary" });
  return Buffer.from(content as Buffer);
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const account = await getServerAccount();
  if (!account) {
    return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
  }

  const { id } = await context.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Ungültige Evidence-ID." }, { status: 400 });
  }

  const collection = await getSocialMediaPixabayLicenseSafesCollection();
  const evidence = await collection.findOne({ _id: new ObjectId(id) });
  if (!evidence) {
    return NextResponse.json({ message: "Lizenz-Safe nicht gefunden." }, { status: 404 });
  }

  const isAdmin = account.role === "ADMIN" || account.role === "SUPERADMIN";
  if (evidence.username !== account.username && !isAdmin) {
    return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
  }

  const zip = new JSZip();
  const [imageBuffer, apiResponseBuffer, detailHtmlBuffer, profileHtmlBuffer, manifestBuffer] = await Promise.all([
    readRemoteFile(evidence.imagePath),
    readRemoteFile(evidence.apiResponsePath),
    readRemoteFile(evidence.htmlSnapshotPath),
    readRemoteFile(evidence.profileSnapshotPath),
    readRemoteFile(evidence.manifestPath),
  ]);

  zip.file(fileNameFromPath(evidence.imagePath), imageBuffer);
  zip.file(fileNameFromPath(evidence.apiResponsePath), apiResponseBuffer);
  zip.file(fileNameFromPath(evidence.htmlSnapshotPath), detailHtmlBuffer);
  zip.file(fileNameFromPath(evidence.profileSnapshotPath), profileHtmlBuffer);
  zip.file(fileNameFromPath(evidence.manifestPath), manifestBuffer);

  const readme = [
    "Pixabay Lizenz-Safe",
    "",
    `Evidence-ID: ${id}`,
    `Bild-ID: ${evidence.imageId}`,
    `Uploader: ${evidence.uploaderName} (${evidence.uploaderUserId})`,
    `Erstellt am: ${evidence.createdAt.toISOString()}`,
    `Paket-Hash: ${evidence.packageHash}`,
    "",
    "Enthalten:",
    `- ${fileNameFromPath(evidence.imagePath)} (Originalbild)`,
    `- ${fileNameFromPath(evidence.apiResponsePath)} (Pixabay API-Response)`,
    `- ${fileNameFromPath(evidence.htmlSnapshotPath)} (HTML der Detailseite)`,
    `- ${fileNameFromPath(evidence.profileSnapshotPath)} (HTML des Uploader-Profils)`,
    `- ${fileNameFromPath(evidence.manifestPath)} (Hashes und Verifikationsdaten)`,
  ].join("\n");
  zip.file("README.txt", readme);

  const archive = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 9 } });
  const downloadName = `pixabay-license-safe-${evidence.imageId}-${sanitizeFileName(evidence.uploaderName)}.zip`;

  return new NextResponse(archive as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${downloadName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}