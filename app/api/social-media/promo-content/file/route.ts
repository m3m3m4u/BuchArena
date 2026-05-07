import { NextRequest, NextResponse } from "next/server";
import { davGet } from "@/lib/bucharena-webdav";

export const runtime = "nodejs";

function mimeTypeFromPath(path: string) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".jpeg") || lower.endsWith(".jpg")) return "image/jpeg";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".mov")) return "video/quicktime";
  return "application/octet-stream";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = (searchParams.get("path") ?? "").trim().replace(/^\/+/, "");

    if (!key.startsWith("social-media-promo-content/") || key.includes("..")) {
      return NextResponse.json({ message: "Ungültiger Pfad." }, { status: 400 });
    }

    const content = await davGet(key);
    if (!content) {
      return NextResponse.json({ message: "Datei nicht gefunden." }, { status: 404 });
    }

    const total = content.length;
    const mimeType = mimeTypeFromPath(key);
    const rangeHeader = request.headers.get("range");

    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : total - 1;
        const chunk = content.slice(start, end + 1);
        return new NextResponse(new Uint8Array(chunk), {
          status: 206,
          headers: {
            "Content-Type": mimeType,
            "Content-Range": `bytes ${start}-${end}/${total}`,
            "Accept-Ranges": "bytes",
            "Content-Length": String(chunk.length),
            "Cache-Control": "public, max-age=86400",
          },
        });
      }
    }

    return new NextResponse(new Uint8Array(content), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Accept-Ranges": "bytes",
        "Content-Length": String(total),
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Promo-Content-Proxy Fehler:", error);
    return NextResponse.json({ message: "Datei konnte nicht geladen werden." }, { status: 404 });
  }
}