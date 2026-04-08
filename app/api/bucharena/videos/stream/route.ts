import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { ReadableStream as WebReadableStream } from "node:stream/web";
import {
  getWebdavClient,
  getWebdavUploadDir,
} from "@/lib/webdav-storage";

export const runtime = "nodejs";

/** Maximale Chunk-Größe für Range-Responses (2 MB) */
const MAX_CHUNK = 2 * 1024 * 1024;

function nodeToWeb(nodeStream: Readable): ReadableStream<Uint8Array> {
  return Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;
}

/**
 * Streamt ein Review-Video als Video-Response.
 * Unterstützt Range-Requests für Seek im Player.
 * Verwendet echtes Streaming (createReadStream) statt alles in den Speicher zu laden.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get("file")?.trim() ?? "";

    if (
      !fileName ||
      fileName.includes("/") ||
      fileName.includes("\\") ||
      fileName.includes("..")
    ) {
      return NextResponse.json(
        { message: "Ungültiger Dateiname." },
        { status: 400 },
      );
    }

    const client = getWebdavClient();
    const uploadDir = getWebdavUploadDir();
    const remotePath = `/${uploadDir}/review-videos/${fileName}`;

    // Dateigröße abfragen
    const stat = (await client.stat(remotePath)) as { size: number };
    const totalSize = stat.size;

    // MIME-Type bestimmen
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    const mimeMap: Record<string, string> = {
      mp4: "video/mp4",
      webm: "video/webm",
      mov: "video/quicktime",
      avi: "video/x-msvideo",
      mkv: "video/x-matroska",
    };
    const contentType = mimeMap[ext] ?? "video/mp4";

    // Range-Header prüfen
    const rangeHeader = request.headers.get("range");

    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const start = parseInt(match[1], 10);
        const requestedEnd = match[2] ? parseInt(match[2], 10) : undefined;
        // Chunk-Größe begrenzen, damit der Browser schnell Daten bekommt
        const end = Math.min(
          requestedEnd ?? start + MAX_CHUNK - 1,
          totalSize - 1,
        );
        const chunkSize = end - start + 1;

        const nodeStream = client.createReadStream(remotePath, {
          range: { start, end },
        });

        return new Response(nodeToWeb(nodeStream), {
          status: 206,
          headers: {
            "Content-Type": contentType,
            "Content-Length": String(chunkSize),
            "Content-Range": `bytes ${start}-${end}/${totalSize}`,
            "Accept-Ranges": "bytes",
            "Cache-Control": "private, no-store",
            "Content-Disposition": "inline",
          },
        });
      }
    }

    // Kein Range → Stream mit Accept-Ranges Header (Browser wird danach Range-Requests senden)
    const nodeStream = client.createReadStream(remotePath);

    return new Response(nodeToWeb(nodeStream), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(totalSize),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, no-store",
        "Content-Disposition": "inline",
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Video konnte nicht geladen werden." },
      { status: 500 },
    );
  }
}
