import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireSuperAdmin } from "@/lib/server-auth";
import { davPut, davGet, davDelete } from "@/lib/bucharena-webdav";
import {
  getWebdavClient,
  getWebdavUploadDir,
} from "@/lib/webdav-storage";

export const runtime = "nodejs";

const MAX_SIZE = 500 * 1024 * 1024; // 500 MB

export async function POST(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
    }

    const formData = await request.formData();
    const uploadId = formData.get("uploadId") as string;
    const chunkIndex = parseInt(formData.get("chunkIndex") as string);
    const totalChunks = parseInt(formData.get("totalChunks") as string);
    const chunk = formData.get("chunk") as File;
    const originalName = formData.get("originalName") as string | null;
    const fileSize = parseInt(formData.get("fileSize") as string) || 0;

    if (!uploadId || isNaN(chunkIndex) || isNaN(totalChunks) || !chunk) {
      return NextResponse.json(
        { message: "Fehlende Chunk-Daten." },
        { status: 400 },
      );
    }

    if (fileSize > MAX_SIZE) {
      return NextResponse.json(
        { message: "Die Datei darf maximal 500 MB groß sein." },
        { status: 400 },
      );
    }

    // Chunk temporär auf WebDAV speichern
    const chunkKey = `bucharena-temp/video-${uploadId}/chunk_${chunkIndex.toString().padStart(4, "0")}`;
    const chunkBytes = await chunk.arrayBuffer();
    await davPut(chunkKey, new Uint8Array(chunkBytes));

    // Metadaten beim ersten Chunk speichern
    if (chunkIndex === 0 && originalName) {
      const metaKey = `bucharena-temp/video-${uploadId}/metadata.json`;
      await davPut(
        metaKey,
        new TextEncoder().encode(
          JSON.stringify({ originalName, fileSize, totalChunks }),
        ),
        "application/json",
      );
    }

    // Letzter Chunk → Video zusammenführen
    if (chunkIndex === totalChunks - 1) {
      return await assembleVideo(uploadId, totalChunks);
    }

    return NextResponse.json({
      message: `Chunk ${chunkIndex + 1}/${totalChunks} empfangen.`,
      received: chunkIndex + 1,
      total: totalChunks,
    });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "unbekannter Fehler";
    return NextResponse.json(
      { message: `Chunk-Upload fehlgeschlagen: ${detail}` },
      { status: 500 },
    );
  }
}

async function assembleVideo(uploadId: string, totalChunks: number) {
  const metaKey = `bucharena-temp/video-${uploadId}/metadata.json`;
  try {
    // Metadaten lesen
    const metaBytes = await davGet(metaKey);
    const meta = metaBytes
      ? JSON.parse(new TextDecoder().decode(metaBytes))
      : {};
    const originalName: string = meta.originalName || "video.mp4";

    // Alle Chunks lesen und zusammenführen
    const chunks: Uint8Array[] = [];
    for (let i = 0; i < totalChunks; i++) {
      const chunkKey = `bucharena-temp/video-${uploadId}/chunk_${i.toString().padStart(4, "0")}`;
      const data = await davGet(chunkKey);
      if (!data) throw new Error(`Chunk ${i} nicht gefunden.`);
      chunks.push(data);
    }

    const totalSize = chunks.reduce((sum, c) => sum + c.length, 0);
    const combined = new Uint8Array(totalSize);
    let offset = 0;
    for (const c of chunks) {
      combined.set(c, offset);
      offset += c.length;
    }

    // Video auf WebDAV hochladen
    const ext = originalName.split(".").pop()?.toLowerCase() || "mp4";
    const fileName = `${Date.now()}-${randomUUID()}.${ext}`;
    const uploadDir = getWebdavUploadDir();
    const remoteDirPath = `/${uploadDir}/review-videos`;
    const remoteFilePath = `${remoteDirPath}/${fileName}`;

    const client = getWebdavClient();
    await client.createDirectory(remoteDirPath, { recursive: true });
    await client.putFileContents(remoteFilePath, Buffer.from(combined), {
      overwrite: true,
    });

    // Originalen Dateinamen als Metadaten speichern
    const videoMetaPath = `${remoteFilePath}.meta.json`;
    await client.putFileContents(
      videoMetaPath,
      JSON.stringify({ originalName }),
      { overwrite: true },
    );

    // Temp-Dateien aufräumen
    await cleanupTemp(uploadId, totalChunks);

    return NextResponse.json({
      message: "Video hochgeladen.",
      video: {
        fileName,
        originalName,
        remotePath: remoteFilePath,
        size: totalSize,
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    await cleanupTemp(uploadId, totalChunks);
    const detail =
      error instanceof Error ? error.message : "unbekannter Fehler";
    return NextResponse.json(
      { message: `Video-Zusammenführung fehlgeschlagen: ${detail}` },
      { status: 500 },
    );
  }
}

async function cleanupTemp(uploadId: string, totalChunks: number) {
  for (let i = 0; i < totalChunks; i++) {
    const chunkKey = `bucharena-temp/video-${uploadId}/chunk_${i.toString().padStart(4, "0")}`;
    await davDelete(chunkKey).catch(() => {});
  }
  await davDelete(`bucharena-temp/video-${uploadId}/metadata.json`).catch(
    () => {},
  );
}
