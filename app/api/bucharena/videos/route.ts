import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/server-auth";
import {
  getWebdavClient,
  getWebdavUploadDir,
} from "@/lib/webdav-storage";

export const runtime = "nodejs";

type VideoMeta = {
  originalName?: string;
  reviewStatus?: "pending" | "approved" | "rejected";
  reviewNote?: string;
  reviewedAt?: string;
};

/**
 * GET   – Liste aller Videos im Review-Ordner
 * PATCH – Review-Status setzen (body: { fileName, status, note? })
 * DELETE – Video löschen (body: { fileName })
 */

export async function GET() {
  try {
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
    const allFiles = rawList as { type: string; basename: string; size: number; lastmod: string }[];

    // Video-Dateien (ohne .meta.json)
    const videoFiles = allFiles
      .filter((f) => f.type === "file" && !f.basename.endsWith(".meta.json"))
      .sort(
        (a, b) =>
          new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime(),
      );

    // Metadaten aus .meta.json lesen
    const files = await Promise.all(
      videoFiles.map(async (f) => {
        let meta: VideoMeta = {};
        try {
          const metaContent = (await client.getFileContents(
            `${dirPath}/${f.basename}.meta.json`,
            { format: "text" },
          )) as string;
          meta = JSON.parse(metaContent) as VideoMeta;
        } catch {
          /* Kein Metafile vorhanden */
        }
        return {
          fileName: f.basename,
          originalName: meta.originalName ?? f.basename,
          reviewStatus: meta.reviewStatus ?? "pending",
          reviewNote: meta.reviewNote ?? "",
          reviewedAt: meta.reviewedAt,
          size: f.size,
          uploadedAt: f.lastmod,
        };
      }),
    );

    return NextResponse.json({ videos: files });
  } catch {
    return NextResponse.json(
      { message: "Videos konnten nicht geladen werden." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
    }

    const body = (await request.json()) as {
      fileName?: string;
      status?: string;
      note?: string;
    };
    const fileName = body.fileName?.trim();
    const status = body.status?.trim();

    if (!fileName || !status) {
      return NextResponse.json(
        { message: "Dateiname und Status erforderlich." },
        { status: 400 },
      );
    }

    if (!["approved", "rejected", "pending"].includes(status)) {
      return NextResponse.json(
        { message: "Ungültiger Status." },
        { status: 400 },
      );
    }

    if (fileName.includes("/") || fileName.includes("\\") || fileName.includes("..")) {
      return NextResponse.json(
        { message: "Ungültiger Dateiname." },
        { status: 400 },
      );
    }

    const client = getWebdavClient();
    const uploadDir = getWebdavUploadDir();
    const metaPath = `/${uploadDir}/review-videos/${fileName}.meta.json`;

    // Bestehende Meta laden oder neue anlegen
    let meta: VideoMeta = {};
    try {
      const existing = (await client.getFileContents(metaPath, {
        format: "text",
      })) as string;
      meta = JSON.parse(existing) as VideoMeta;
    } catch {
      /* Noch kein Metafile */
    }

    meta.reviewStatus = status as VideoMeta["reviewStatus"];
    meta.reviewNote = body.note?.trim() ?? "";
    meta.reviewedAt = new Date().toISOString();

    await client.putFileContents(metaPath, JSON.stringify(meta), {
      overwrite: true,
    });

    return NextResponse.json({
      message:
        status === "approved"
          ? "Video als OK markiert."
          : status === "rejected"
            ? "Feedback gespeichert."
            : "Status zurückgesetzt.",
      reviewStatus: meta.reviewStatus,
      reviewNote: meta.reviewNote,
      reviewedAt: meta.reviewedAt,
    });
  } catch {
    return NextResponse.json(
      { message: "Review-Status konnte nicht gespeichert werden." },
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

    // Auch Metadaten-Datei löschen, falls vorhanden
    try {
      await client.deleteFile(`${remotePath}.meta.json`);
    } catch {
      /* Meta-Datei existiert evtl. nicht */
    }

    return NextResponse.json({ message: "Video gelöscht." });
  } catch {
    return NextResponse.json(
      { message: "Video konnte nicht gelöscht werden." },
      { status: 500 },
    );
  }
}
