import { NextResponse } from "next/server";
import {
  getWebdavClient,
  getWebdavUploadDir,
} from "@/lib/webdav-storage";

/** GET /api/musik/audio?path=… – streamt eine MP3 aus WebDAV ohne Auth */
export async function GET(request: Request) {
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

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="${normalized.split("/").pop() ?? "track.mp3"}"`,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    console.error("Musik-Audio Fehler:", err);
    return NextResponse.json({ message: "Datei nicht gefunden." }, { status: 404 });
  }
}
