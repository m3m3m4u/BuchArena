import { NextResponse } from "next/server";
import { getBucharenaReviewsCollection } from "@/lib/bucharena-db";
import { requireSuperAdmin } from "@/lib/server-auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Keine Berechtigung" }, { status: 403 });

    const col = await getBucharenaReviewsCollection();
    const reviews = await col.find().sort({ createdAt: -1 }).toArray();

    const headers = ["Datum", "Buchtitel", "Rezension", "Autor Email", "Autor Name", "Status", "Bearbeitet von", "Bearbeitet am"];
    const rows = reviews.map((r) => [
      new Date(r.createdAt).toLocaleDateString("de-DE"),
      r.bookTitle,
      r.review,
      r.authorEmail || "",
      r.authorName || "",
      r.status === "pending" ? "Ausstehend" : "Bearbeitet",
      r.processedBy || "",
      r.processedAt ? new Date(r.processedAt).toLocaleDateString("de-DE") : "",
    ]);

    const csvContent = [headers.join("\t"), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""').replace(/\n/g, " ")}"`).join("\t"))].join("\n");
    const bom = "\uFEFF";
    const timestamp = new Date().toISOString().split("T")[0];

    return new NextResponse(bom + csvContent, {
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="bucharena-rezensionen-${timestamp}.xls"`,
      },
    });
  } catch (error) {
    console.error("Fehler beim Exportieren:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unbekannter Fehler" }, { status: 500 });
  }
}
