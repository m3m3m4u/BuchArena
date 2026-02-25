import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fileName, bookTitle } = body;

    if (!fileName || !bookTitle) {
      return NextResponse.json({ success: false, error: "Dateiname und Buchtitel erforderlich" }, { status: 400 });
    }

    const timestamp = Date.now();
    const sanitized = bookTitle.replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, "_").replace(/_+/g, "_").substring(0, 100);
    const generatedName = `${sanitized}_${timestamp}.mp3`;
    const webdavPath = `bucharena-snippets/${generatedName}`;

    const baseUrl = process.env.WEBDAV_URL;
    const username = process.env.WEBDAV_USERNAME;
    const password = process.env.WEBDAV_PASSWORD;
    const publicUrl = process.env.WEBDAV_PUBLIC_BASE_URL || baseUrl;

    if (!baseUrl || !username || !password) {
      return NextResponse.json({ success: false, error: "WebDAV nicht konfiguriert" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      uploadUrl: `${baseUrl}/${webdavPath}`,
      publicUrl: `${publicUrl}/${webdavPath}`,
      fileName: generatedName,
      filePath: webdavPath,
      credentials: { username, password },
    });
  } catch (error) {
    console.error("Fehler:", error);
    return NextResponse.json({ success: false, error: "Fehler beim Generieren der Upload-URL" }, { status: 500 });
  }
}
