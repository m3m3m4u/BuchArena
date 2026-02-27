/**
 * Server-seitiger Upload-Proxy für Schnipsel-Audio-Dateien.
 * Die Datei wird vom Client als FormData an diese Route gesendet
 * und serverseitig an WebDAV weitergeleitet – Credentials bleiben
 * niemals auf dem Client sichtbar.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const bookTitle = formData.get("bookTitle") as string | null;
    const file = formData.get("file") as File | null;

    if (!bookTitle || !file) {
      return NextResponse.json(
        { success: false, error: "Buchtitel und Datei erforderlich" },
        { status: 400 },
      );
    }

    const timestamp = Date.now();
    const sanitized = bookTitle
      .replace(/[<>:"/\\|?*]/g, "_")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .substring(0, 100);
    const generatedName = `${sanitized}_${timestamp}.mp3`;
    const webdavPath = `bucharena-snippets/${generatedName}`;

    const baseUrl = process.env.WEBDAV_URL;
    const username = process.env.WEBDAV_USERNAME;
    const password = process.env.WEBDAV_PASSWORD;
    const publicUrl = process.env.WEBDAV_PUBLIC_BASE_URL || baseUrl;

    if (!baseUrl || !username || !password) {
      return NextResponse.json(
        { success: false, error: "WebDAV nicht konfiguriert" },
        { status: 500 },
      );
    }

    // Server-seitig an WebDAV hochladen
    const uploadRes = await fetch(`${baseUrl}/${webdavPath}`, {
      method: "PUT",
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${username}:${password}`).toString("base64"),
        "Content-Type": file.type || "audio/mpeg",
      },
      body: file.stream(),
      // @ts-expect-error – Node.js fetch unterstützt duplex
      duplex: "half",
    });

    if (!uploadRes.ok) {
      console.error("WebDAV upload failed:", uploadRes.status, await uploadRes.text().catch(() => ""));
      return NextResponse.json(
        { success: false, error: "Fehler beim Hochladen der Audio-Datei" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      publicUrl: `${publicUrl}/${webdavPath}`,
      fileName: generatedName,
      filePath: webdavPath,
    });
  } catch (error) {
    console.error("Fehler:", error);
    return NextResponse.json(
      { success: false, error: "Fehler beim Hochladen" },
      { status: 500 },
    );
  }
}
