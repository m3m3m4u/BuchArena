import { NextResponse } from "next/server";
import {
  getWebdavClient,
  isAllowedRemotePath,
} from "@/lib/webdav-storage";

function mimeTypeFromPath(path: string) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) {
    return "image/png";
  }
  if (lower.endsWith(".webp")) {
    return "image/webp";
  }
  if (lower.endsWith(".gif")) {
    return "image/gif";
  }
  if (lower.endsWith(".jpeg") || lower.endsWith(".jpg")) {
    return "image/jpeg";
  }
  return "application/octet-stream";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const remotePath = searchParams.get("path") ?? "";

    if (!remotePath || !isAllowedRemotePath(remotePath)) {
      return NextResponse.json(
        { message: "Ungültiger Bildpfad." },
        { status: 400 }
      );
    }

    const client = getWebdavClient();
    const content = (await client.getFileContents(remotePath, {
      format: "binary",
    })) as Buffer;
    const bytes = new Uint8Array(content);

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": mimeTypeFromPath(remotePath),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Bild konnte nicht geladen werden." },
      { status: 404 }
    );
  }
}
