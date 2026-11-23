import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getWebdavClient, getWebdavUploadDir } from "@/lib/webdav-storage";
import { getServerAccount } from "@/lib/server-auth";

export const runtime = "nodejs";

const MAX_AUDIO_SIZE = 250 * 1024 * 1024; // 250 MB
const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/mp3", "audio/x-mpeg"];

function isAdmin(role: string) {
  return role === "ADMIN" || role === "SUPERADMIN";
}

function toPodcastAudioUrl(remotePath: string): string {
  return `/api/podcast/audio?path=${encodeURIComponent(remotePath)}`;
}

function isValidMp3(name: string, mimeType: string): boolean {
  return (
    ALLOWED_AUDIO_TYPES.includes(mimeType) ||
    name.toLowerCase().endsWith(".mp3")
  );
}

async function cleanupTempChunks(
  tempDir: string,
  totalChunks: number
): Promise<void> {
  const client = getWebdavClient();
  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = `${tempDir}/chunk_${i.toString().padStart(4, "0")}`;
    await client.deleteFile(chunkPath).catch(() => {});
  }
  await client.deleteFile(tempDir).catch(() => {});
}

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account || !isAdmin(account.role)) {
      return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
    }

    const formData = await request.formData();
    const uploadDir = getWebdavUploadDir();

    // Chunked Upload (für größere MP3s > 40 MB)
    const uploadId = (formData.get("uploadId") as string | null)?.trim();
    const chunk = formData.get("chunk");

    if (uploadId && chunk instanceof File) {
      if (!/^[a-zA-Z0-9_-]{8,64}$/.test(uploadId)) {
        return NextResponse.json({ message: "Ungültige Upload-ID." }, { status: 400 });
      }
      const chunkIndex = parseInt(formData.get("chunkIndex") as string, 10);
      const totalChunks = parseInt(formData.get("totalChunks") as string, 10);
      const originalName =
        (formData.get("originalName") as string | null)?.trim() || "podcast.mp3";
      const fileSize = parseInt(formData.get("fileSize") as string, 10) || 0;
      const mimeType = (formData.get("mimeType") as string | null)?.trim() || "";

      if (
        Number.isNaN(chunkIndex) ||
        Number.isNaN(totalChunks) ||
        chunkIndex < 0 ||
        totalChunks < 1 ||
        chunkIndex >= totalChunks
      ) {
        return NextResponse.json({ message: "Ungültige Chunk-Daten." }, { status: 400 });
      }

      if (!isValidMp3(originalName, mimeType)) {
        return NextResponse.json(
          { message: "Nur MP3-Dateien sind erlaubt." },
          { status: 400 }
        );
      }

      if (fileSize > MAX_AUDIO_SIZE) {
        return NextResponse.json(
          { message: "Die MP3-Datei darf maximal 250 MB groß sein." },
          { status: 400 }
        );
      }

      const client = getWebdavClient();
      const tempDir = `/${uploadDir}/podcast-temp/${uploadId}`;
      await client.createDirectory(tempDir, { recursive: true });

      const chunkPath = `${tempDir}/chunk_${chunkIndex.toString().padStart(4, "0")}`;
      const chunkBuffer = Buffer.from(await chunk.arrayBuffer());
      await client.putFileContents(chunkPath, chunkBuffer, { overwrite: true });

      if (chunkIndex < totalChunks - 1) {
        return NextResponse.json({
          message: `Chunk ${chunkIndex + 1}/${totalChunks} empfangen.`,
          received: chunkIndex + 1,
          total: totalChunks,
        });
      }

      // Letzter Chunk → zusammenführen
      try {
        const chunks: Buffer[] = [];
        for (let i = 0; i < totalChunks; i++) {
          const p = `${tempDir}/chunk_${i.toString().padStart(4, "0")}`;
          const part = (await client.getFileContents(p, {
            format: "binary",
          })) as Buffer;
          chunks.push(Buffer.from(part));
        }

        const combined = Buffer.concat(chunks);
        const fileName = `${Date.now()}-${randomUUID()}.mp3`;
        const remoteDirPath = `/${uploadDir}/podcast-audio`;
        const remoteFilePath = `${remoteDirPath}/${fileName}`;

        await client.createDirectory(remoteDirPath, { recursive: true });
        await client.putFileContents(remoteFilePath, combined, {
          overwrite: true,
        });

        await cleanupTempChunks(tempDir, totalChunks);

        return NextResponse.json({
          message: "MP3 hochgeladen.",
          audioUrl: toPodcastAudioUrl(remoteFilePath),
          fileName: originalName,
          fileSize: combined.length,
        });
      } catch (err) {
        await cleanupTempChunks(tempDir, totalChunks);
        throw err;
      }
    }

    // Direkter Upload (für Dateien <= 45 MB)
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ message: "MP3-Datei fehlt." }, { status: 400 });
    }

    if (!isValidMp3(file.name, file.type)) {
      return NextResponse.json(
        { message: "Nur MP3-Dateien sind erlaubt." },
        { status: 400 }
      );
    }

    if (file.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { message: "Die MP3-Datei darf maximal 250 MB groß sein." },
        { status: 400 }
      );
    }

    const fileName = `${Date.now()}-${randomUUID()}.mp3`;
    const remoteDirPath = `/${uploadDir}/podcast-audio`;
    const remoteFilePath = `${remoteDirPath}/${fileName}`;

    const client = getWebdavClient();
    await client.createDirectory(remoteDirPath, { recursive: true });

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await client.putFileContents(remoteFilePath, fileBuffer, { overwrite: true });

    return NextResponse.json({
      message: "MP3 hochgeladen.",
      audioUrl: toPodcastAudioUrl(remoteFilePath),
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (err) {
    console.error("Podcast-Audio-Upload Fehler:", err);
    return NextResponse.json(
      { message: "MP3-Upload fehlgeschlagen." },
      { status: 500 }
    );
  }
}
