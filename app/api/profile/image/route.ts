import { NextResponse } from "next/server";
import sharp from "sharp";
import {
  getWebdavClient,
  isAllowedRemotePath,
} from "@/lib/webdav-storage";

function mimeTypeFromPath(path: string) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) {
    return "image/png";
  }
  if (lower.endsWith(".webp")) {
    return "image/webp";
  }
  if (lower.endsWith(".gif")) {
    return "image/gif";
  }
  if (lower.endsWith(".jpeg") || lower.endsWith(".jpg")) {
    return "image/jpeg";
  }
  return "application/octet-stream";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const remotePath = searchParams.get("path") ?? "";

    if (!remotePath || !isAllowedRemotePath(remotePath)) {
      return NextResponse.json(
        { message: "Ungültiger Bildpfad." },
        { status: 400 }
      );
    }

    const client = getWebdavClient();
    const content = (await client.getFileContents(remotePath, {
      format: "binary",
    })) as Buffer;

    // Optional: resize wenn w-Parameter angegeben
    const widthParam = searchParams.get("w");
    const maxWidth = widthParam ? Math.min(Math.max(parseInt(widthParam, 10), 32), 1200) : 0;

    let outputBytes: Uint8Array;
    let outputMime: string;

    if (maxWidth > 0 && !Number.isNaN(maxWidth)) {
      // Bild verkleinern und als WebP ausgeben
      const resized = await sharp(content)
        .resize({ width: maxWidth, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      outputBytes = new Uint8Array(resized);
      outputMime = "image/webp";
    } else {
      outputBytes = new Uint8Array(content);
      outputMime = mimeTypeFromPath(remotePath);
    }

    return new NextResponse(outputBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": outputMime,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Bild konnte nicht geladen werden." },
      { status: 404 }
    );
  }
}
