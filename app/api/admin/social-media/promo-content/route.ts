import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/server-auth";
import { getSocialMediaPromoContentCollection } from "@/lib/mongodb";
import { davPut } from "@/lib/bucharena-webdav";

export const runtime = "nodejs";

type StoredPromoFile = {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
};

function normalizePromoFiles(item: {
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  files?: StoredPromoFile[];
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

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 250 * 1024 * 1024;

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

function isAllowedImage(file: File, buffer: Buffer) {
  if (!file.type.startsWith("image/")) return false;
  const mb = buffer.subarray(0, 12);
  const isJpeg = mb[0] === 0xff && mb[1] === 0xd8;
  const isPng = mb[0] === 0x89 && mb[1] === 0x50 && mb[2] === 0x4e && mb[3] === 0x47;
  const isWebp = mb[0] === 0x52 && mb[1] === 0x49 && mb[2] === 0x46 && mb[3] === 0x46 && mb[8] === 0x57 && mb[9] === 0x45 && mb[10] === 0x42 && mb[11] === 0x50;
  return isJpeg || isPng || isWebp;
}

function isAllowedVideo(file: File) {
  const allowedMimeTypes = ["video/mp4", "video/webm", "video/quicktime"];
  const lowerName = file.name.toLowerCase();
  return allowedMimeTypes.includes(file.type) || /\.(mp4|webm|mov)$/.test(lowerName);
}

export async function GET() {
  const account = await requireAdmin();
  if (!account) {
    return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
  }

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

export async function POST(request: NextRequest) {
  const account = await requireAdmin();
  if (!account) {
    return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
  }

  const formData = await request.formData();
  const title = ((formData.get("title") as string | null) ?? "").trim();
  const captions = [1, 2, 3].map((index) => ((formData.get(`caption${index}`) as string | null) ?? "").trim()) as [string, string, string];
  const uploadedFiles = formData.getAll("file").filter((value): value is File => value instanceof File);

  if (!title) {
    return NextResponse.json({ message: "Titel fehlt." }, { status: 400 });
  }
  if (captions.some((caption) => !caption)) {
    return NextResponse.json({ message: "Bitte alle drei Caption-Vorschläge ausfüllen." }, { status: 400 });
  }
  if (uploadedFiles.length === 0) {
    return NextResponse.json({ message: "Datei fehlt." }, { status: 400 });
  }
  const preparedFiles = await Promise.all(uploadedFiles.map(async (file) => {
    const buffer = Buffer.from(await file.arrayBuffer());
    return {
      file,
      buffer,
      image: isAllowedImage(file, buffer),
      video: isAllowedVideo(file),
    };
  }));

  if (preparedFiles.some(({ image, video }) => !image && !video)) {
    return NextResponse.json({ message: "Erlaubt sind JPG, PNG, WebP, MP4, WebM oder MOV." }, { status: 400 });
  }

  const allImages = preparedFiles.every(({ image }) => image);
  const allVideos = preparedFiles.every(({ video }) => video);
  if (!allImages && !allVideos) {
    return NextResponse.json({ message: "Bitte nur Bilder oder nur Videos hochladen, nicht gemischt." }, { status: 400 });
  }
  if (allVideos && preparedFiles.length > 1) {
    return NextResponse.json({ message: "Für Reels ist nur eine Videodatei erlaubt." }, { status: 400 });
  }
  if (preparedFiles.some(({ image, file }) => image && file.size > MAX_IMAGE_SIZE)) {
    return NextResponse.json({ message: "Bilder dürfen maximal 10 MB groß sein." }, { status: 400 });
  }
  if (preparedFiles.some(({ video, file }) => video && file.size > MAX_VIDEO_SIZE)) {
    return NextResponse.json({ message: "Videos dürfen maximal 250 MB groß sein." }, { status: 400 });
  }

  const storedFiles: StoredPromoFile[] = [];
  for (const { file, buffer, image } of preparedFiles) {
    const ext = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : undefined;
    const safeExt = ext || (image ? "jpg" : "mp4");
    const webdavKey = `social-media-promo-content/${Date.now()}-${randomUUID()}.${safeExt}`;
    const uploaded = await davPut(webdavKey, buffer, file.type || undefined);
    if (!uploaded) {
      return NextResponse.json({ message: "WebDAV ist nicht konfiguriert." }, { status: 500 });
    }
    storedFiles.push({
      fileUrl: uploaded.url,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || (image ? "image/jpeg" : "video/mp4"),
    });
  }

  const col = await getSocialMediaPromoContentCollection();
  const result = await col.insertOne({
    title,
    mediaType: allImages ? "image" : "video",
    fileUrl: storedFiles[0]?.fileUrl,
    fileName: storedFiles[0]?.fileName,
    fileSize: storedFiles[0]?.fileSize,
    mimeType: storedFiles[0]?.mimeType,
    files: storedFiles,
    captions,
    createdAt: new Date(),
    uploadedBy: account.username,
  });

  return NextResponse.json({
    item: {
      id: result.insertedId.toString(),
      title,
      mediaType: allImages ? "image" : "video",
      files: storedFiles.map((file) => ({
        fileUrl: toPublicPromoContentUrl(file.fileUrl),
        fileName: file.fileName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
      })),
      fileUrl: toPublicPromoContentUrl(storedFiles[0]?.fileUrl ?? ""),
      fileName: storedFiles[0]?.fileName ?? "",
      fileSize: storedFiles[0]?.fileSize ?? 0,
      mimeType: storedFiles[0]?.mimeType ?? "",
      captions,
      createdAt: new Date(),
    },
    message: "Inhalt hochgeladen.",
  }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const account = await requireAdmin();
  if (!account) {
    return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
  }

  const body = await request.json() as {
    id?: string;
    title?: string;
    captions?: string[];
  };

  const id = body.id?.trim();
  const title = body.title?.trim();
  const captions = body.captions?.map((caption) => caption.trim());

  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ message: "Titel fehlt." }, { status: 400 });
  }
  if (!captions || captions.length !== 3 || captions.some((caption) => !caption)) {
    return NextResponse.json({ message: "Bitte genau drei Caption-Vorschläge ausfüllen." }, { status: 400 });
  }

  const col = await getSocialMediaPromoContentCollection();
  const result = await col.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { title, captions: captions as [string, string, string] } },
    { returnDocument: "after" },
  );

  if (!result) {
    return NextResponse.json({ message: "Inhalt nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({
    item: {
      id: result._id?.toString(),
      title: result.title,
      mediaType: result.mediaType,
      files: normalizePromoFiles(result),
      fileUrl: normalizePromoFiles(result)[0]?.fileUrl ?? "",
      fileName: normalizePromoFiles(result)[0]?.fileName ?? "",
      fileSize: normalizePromoFiles(result)[0]?.fileSize ?? 0,
      mimeType: normalizePromoFiles(result)[0]?.mimeType ?? "",
      captions: result.captions,
      createdAt: result.createdAt,
    },
    message: "Inhalt aktualisiert.",
  });
}