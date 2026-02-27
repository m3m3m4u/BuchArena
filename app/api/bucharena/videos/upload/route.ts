import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireSuperAdmin } from "@/lib/server-auth";
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
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "Videodatei fehlt." },
        { status: 400 },
      );
    }

    if (!file.type.startsWith("video/")) {
      return NextResponse.json(
        { message: "Nur Videodateien sind erlaubt." },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { message: "Die Datei darf maximal 500 MB groß sein." },
        { status: 400 },
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
    const fileName = `${Date.now()}-${randomUUID()}.${ext}`;
    const uploadDir = getWebdavUploadDir();
    const remoteDirPath = `/${uploadDir}/review-videos`;
    const remoteFilePath = `${remoteDirPath}/${fileName}`;

    const client = getWebdavClient();
    await client.createDirectory(remoteDirPath, { recursive: true });

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await client.putFileContents(remoteFilePath, fileBuffer, {
      overwrite: true,
    });

    // Originalen Dateinamen als Metadaten speichern
    const metaPath = `${remoteFilePath}.meta.json`;
    await client.putFileContents(
      metaPath,
      JSON.stringify({ originalName: file.name }),
      { overwrite: true },
    );

    return NextResponse.json({
      message: "Video hochgeladen.",
      video: {
        fileName,
        originalName: file.name,
        remotePath: remoteFilePath,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unbekannter Fehler";
    return NextResponse.json(
      { message: `Video-Upload fehlgeschlagen: ${detail}` },
      { status: 500 },
    );
  }
}
