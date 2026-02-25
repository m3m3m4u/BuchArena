import { NextResponse } from "next/server";
import { getBucharenaSnippetsCollection } from "@/lib/bucharena-db";
import { requireSuperAdmin } from "@/lib/server-auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Keine Berechtigung" }, { status: 403 });

    const col = await getBucharenaSnippetsCollection();
    const snippets = await col.find().sort({ createdAt: -1 }).toArray();

    const headers = ["Datum", "Buchtitel", "Text", "Hat Audio", "Audio-Datei", "Autor Email", "Autor Name", "Status", "Bearbeitet von", "Bearbeitet am"];
    const rows = snippets.map((s) => [
      new Date(s.createdAt).toLocaleDateString("de-DE"),
      s.bookTitle, s.text, s.audioFileName ? "Ja" : "Nein", s.audioFileName || "",
      s.authorEmail || "", s.authorName || "",
      s.status === "pending" ? "Ausstehend" : "Bearbeitet",
      s.processedBy || "", s.processedAt ? new Date(s.processedAt).toLocaleDateString("de-DE") : "",
    ]);

    const csvContent = [headers.join("\t"), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""').replace(/\n/g, " ")}"`).join("\t"))].join("\n");
    const timestamp = new Date().toISOString().split("T")[0];

    return new NextResponse("\uFEFF" + csvContent, {
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="bucharena-schnipsel-${timestamp}.xls"`,
      },
    });
  } catch (error) {
    console.error("Fehler beim Exportieren:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unbekannter Fehler" }, { status: 500 });
  }
}
