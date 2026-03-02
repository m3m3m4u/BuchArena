import { NextResponse } from "next/server";
import { davGet } from "@/lib/bucharena-webdav";

export const runtime = "nodejs";

/**
 * Proxy-Endpunkt zum Herunterladen von Sprecher-Dateien (PDF / MP3).
 * Holt die Datei serverseitig vom WebDAV-Speicher, damit Benutzer
 * keine WebDAV-Zugangsdaten benötigen.
 *
 * Query-Parameter:
 *   path  – der relative WebDAV-Schlüssel (z.B. bucharena-sprecher/pdf/1234_Datei.pdf)
 *   name  – optionaler Download-Dateiname
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path") ?? "";
    const downloadName = searchParams.get("name") ?? "";

    // Nur Dateien aus dem Sprecher-Verzeichnis erlauben
    if (!path || !path.startsWith("bucharena-sprecher/")) {
      return NextResponse.json(
        { success: false, error: "Ungültiger Dateipfad" },
        { status: 400 },
      );
    }

    const bytes = await davGet(path);
    if (!bytes) {
      return NextResponse.json(
        { success: false, error: "Datei nicht gefunden" },
        { status: 404 },
      );
    }

    // Content-Type bestimmen
    const lower = path.toLowerCase();
    let contentType = "application/octet-stream";
    if (lower.endsWith(".pdf")) contentType = "application/pdf";
    else if (lower.endsWith(".mp3")) contentType = "audio/mpeg";

    // Dateiname für Download
    const fileName =
      downloadName || path.split("/").pop() || "download";

    return new NextResponse(bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "public, max-age=3600",
        "Content-Length": String(bytes.byteLength),
      },
    });
  } catch (error) {
    console.error("Fehler beim Download:", error);
    return NextResponse.json(
      { success: false, error: "Fehler beim Herunterladen" },
      { status: 500 },
    );
  }
}
