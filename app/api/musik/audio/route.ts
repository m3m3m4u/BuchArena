import { NextRequest, NextResponse } from "next/server";
import {
  getWebdavClient,
  getWebdavUploadDir,
} from "@/lib/webdav-storage";

/** GET /api/musik/audio?path=… – streamt eine MP3 aus WebDAV ohne Auth */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const remotePath = searchParams.get("path") ?? "";

    // Pfad muss im erlaubten Verzeichnis liegen
    const uploadDir = getWebdavUploadDir();
    const allowedPrefix = `/${uploadDir}/musik/`;
    const normalized = remotePath.replace(/\\/g, "/");

    if (!normalized.startsWith(allowedPrefix) || normalized.includes("..")) {
      return NextResponse.json({ message: "Ungültiger Pfad." }, { status: 400 });
    }

    const client = getWebdavClient();
    const content = (await client.getFileContents(remotePath, {
      format: "binary",
    })) as Buffer;

    const total = content.length;
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
            "Content-Type": "audio/mpeg",
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
        "Content-Type": "audio/mpeg",
        "Accept-Ranges": "bytes",
        "Content-Length": String(total),
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    console.error("Musik-Audio Fehler:", err);
    return NextResponse.json({ message: "Datei nicht gefunden." }, { status: 404 });
  }
}
