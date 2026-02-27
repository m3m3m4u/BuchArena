import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/server-auth";
import {
  getWebdavClient,
  getWebdavUploadDir,
} from "@/lib/webdav-storage";

export const runtime = "nodejs";

/**
 * Streamt ein Review-Video als Video-Response.
 * Unterstützt Range-Requests für Seek im Player.
 * Kein Content-Disposition: attachment → kein Download-Dialog.
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
    const stat = await client.stat(remotePath) as { size: number };
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
        const end = match[2] ? parseInt(match[2], 10) : totalSize - 1;
        const chunkSize = end - start + 1;

        const content = (await client.getFileContents(remotePath, {
          format: "binary",
          headers: { Range: `bytes=${start}-${end}` },
        })) as Buffer;

        return new NextResponse(new Uint8Array(content) as unknown as BodyInit, {
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

    // Kein Range → ganzes File
    const content = (await client.getFileContents(remotePath, {
      format: "binary",
    })) as Buffer;

    return new NextResponse(new Uint8Array(content) as unknown as BodyInit, {
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
