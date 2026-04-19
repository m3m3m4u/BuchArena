import { NextResponse } from "next/server";
import { getBucharenaReviewsCollection } from "@/lib/bucharena-db";
import { requireSuperAdmin } from "@/lib/server-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Keine Berechtigung" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    const col = await getBucharenaReviewsCollection();
    const query = statusFilter ? { status: statusFilter } : {};
    const reviews = await col.find(query).sort({ createdAt: -1 }).limit(5000).toArray();

    const headers = ["Buchtitel", "Autor", "Instagram", "Rezension"];
    const rows = reviews.map((r) => [
      r.bookTitle,
      r.authorName || "",
      r.instagram || "",
      r.review,
    ]);

    const csvContent = [headers.join("\t"), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""').replace(/\n/g, " ")}"`).join("\t"))].join("\n");
    const bom = "\uFEFF";
    const timestamp = new Date().toISOString().split("T")[0];
    const filenameSuffix = statusFilter === "pending" ? "-ausstehend" : statusFilter === "processed" ? "-bearbeitet" : "";

    return new NextResponse(bom + csvContent, {
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="bucharena-rezensionen${filenameSuffix}-${timestamp}.xls"`,
      },
    });
  } catch (error) {
    console.error("Fehler beim Exportieren:", error);
    return NextResponse.json({ success: false, error: "Export fehlgeschlagen." }, { status: 500 });
  }
}
