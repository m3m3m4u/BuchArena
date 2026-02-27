import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/server-auth";
import {
  getWebdavClient,
  getWebdavUploadDir,
} from "@/lib/webdav-storage";

export const runtime = "nodejs";

/**
 * GET  – Liste aller Videos im Review-Ordner
 * POST – Video löschen (body: { fileName })
 */

export async function GET() {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
    }

    const client = getWebdavClient();
    const uploadDir = getWebdavUploadDir();
    const dirPath = `/${uploadDir}/review-videos`;

    // Verzeichnis existiert ggf. noch nicht
    try {
      await client.stat(dirPath);
    } catch {
      return NextResponse.json({ videos: [] });
    }

    const items = await client.getDirectoryContents(dirPath, { deep: false });
    const rawList = Array.isArray(items) ? items : (items as { data: typeof items }).data;
    const files = (rawList as { type: string; basename: string; size: number; lastmod: string }[])
      .filter((f) => f.type === "file")
      .map((f) => ({
        fileName: f.basename,
        size: f.size,
        uploadedAt: f.lastmod,
      }))
      .sort(
        (a, b) =>
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
      );

    return NextResponse.json({ videos: files });
  } catch {
    return NextResponse.json(
      { message: "Videos konnten nicht geladen werden." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
    }

    const body = (await request.json()) as { fileName?: string };
    const fileName = body.fileName?.trim();

    if (!fileName) {
      return NextResponse.json(
        { message: "Dateiname fehlt." },
        { status: 400 },
      );
    }

    // Sicherheitsprüfung: kein Pfad-Traversal
    if (fileName.includes("/") || fileName.includes("\\") || fileName.includes("..")) {
      return NextResponse.json(
        { message: "Ungültiger Dateiname." },
        { status: 400 },
      );
    }

    const client = getWebdavClient();
    const uploadDir = getWebdavUploadDir();
    const remotePath = `/${uploadDir}/review-videos/${fileName}`;

    await client.deleteFile(remotePath);

    return NextResponse.json({ message: "Video gelöscht." });
  } catch {
    return NextResponse.json(
      { message: "Video konnte nicht gelöscht werden." },
      { status: 500 },
    );
  }
}
