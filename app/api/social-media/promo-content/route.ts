import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSocialMediaPromoContentCollection } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/server-auth";
import { davDelete } from "@/lib/bucharena-webdav";

export const runtime = "nodejs";

function normalizePromoFiles(item: {
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  files?: Array<{
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }>;
}) {
  if (Array.isArray(item.files) && item.files.length > 0) {
    return item.files.map((file) => ({
      fileUrl: toPublicPromoContentUrl(file.fileUrl),
      fileName: file.fileName,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
    }));
  }

  if (!item.fileUrl || !item.fileName || typeof item.fileSize !== "number" || !item.mimeType) {
    return [];
  }

  return [{
    fileUrl: toPublicPromoContentUrl(item.fileUrl),
    fileName: item.fileName,
    fileSize: item.fileSize,
    mimeType: item.mimeType,
  }];
}

function getStoredPromoFiles(item: {
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  files?: Array<{
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }>;
}) {
  if (Array.isArray(item.files) && item.files.length > 0) {
    return item.files;
  }

  if (!item.fileUrl || !item.fileName || typeof item.fileSize !== "number" || !item.mimeType) {
    return [];
  }

  return [{
    fileUrl: item.fileUrl,
    fileName: item.fileName,
    fileSize: item.fileSize,
    mimeType: item.mimeType,
  }];
}

function toPublicPromoContentUrl(fileUrl: string) {
  const keyPrefix = "/medien/";
  if (fileUrl.startsWith(keyPrefix)) {
    const key = fileUrl.slice(keyPrefix.length);
    return `/api/social-media/promo-content/file?path=${encodeURIComponent(key)}`;
  }

  try {
    const url = new URL(fileUrl);
    const marker = "/social-media-promo-content/";
    const index = url.pathname.indexOf(marker);
    if (index >= 0) {
      const key = url.pathname.slice(index + 1);
      return `/api/social-media/promo-content/file?path=${encodeURIComponent(key)}`;
    }
  } catch {
    // ignore malformed absolute url and fall back
  }

  return fileUrl;
}

export async function GET() {
  const col = await getSocialMediaPromoContentCollection();
  const items = await col.find({}).sort({ createdAt: -1 }).toArray();

  return NextResponse.json({
    items: items.map((item) => ({
      files: normalizePromoFiles(item),
      id: item._id?.toString(),
      title: item.title,
      mediaType: item.mediaType,
      fileUrl: normalizePromoFiles(item)[0]?.fileUrl ?? "",
      fileName: normalizePromoFiles(item)[0]?.fileName ?? "",
      fileSize: normalizePromoFiles(item)[0]?.fileSize ?? 0,
      mimeType: normalizePromoFiles(item)[0]?.mimeType ?? "",
      captions: item.captions,
      createdAt: item.createdAt,
    })),
  });
}

export async function DELETE(request: Request) {
  const account = await requireAdmin();
  if (!account) {
    return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();
  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
  }

  const col = await getSocialMediaPromoContentCollection();
  const existing = await col.findOne({ _id: new ObjectId(id) });
  if (!existing) {
    return NextResponse.json({ message: "Inhalt nicht gefunden." }, { status: 404 });
  }

  const keyPrefix = "/medien/";
  for (const file of getStoredPromoFiles(existing)) {
    if (file.fileUrl.startsWith(keyPrefix)) {
      const webdavKey = file.fileUrl.slice(keyPrefix.length);
      await davDelete(webdavKey).catch(() => undefined);
    }
  }

  await col.deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ message: "Inhalt gelöscht." });
}