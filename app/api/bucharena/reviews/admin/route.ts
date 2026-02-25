import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getBucharenaReviewsCollection } from "@/lib/bucharena-db";
import { requireSuperAdmin } from "@/lib/server-auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Keine Berechtigung" }, { status: 403 });

    const col = await getBucharenaReviewsCollection();
    const reviews = await col.find().sort({ createdAt: -1 }).toArray();

    const formatted = reviews.map((r) => ({
      id: r._id.toHexString(),
      bookTitle: r.bookTitle,
      review: r.review,
      authorEmail: r.authorEmail,
      authorName: r.authorName,
      status: r.status,
      processedBy: r.processedBy,
      processedAt: r.processedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return NextResponse.json({ success: true, reviews: formatted, count: formatted.length });
  } catch (error) {
    console.error("Fehler beim Laden der Rezensionen:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unbekannter Fehler" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Keine Berechtigung" }, { status: 403 });

    const body = await request.json();
    const { id, status } = body;

    if (!id) return NextResponse.json({ success: false, error: "ID ist erforderlich" }, { status: 400 });
    if (status && !["pending", "processed"].includes(status)) return NextResponse.json({ success: false, error: "Ungültiger Status" }, { status: 400 });

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (status) {
      updateData.status = status;
      if (status === "processed") {
        updateData.processedBy = admin.email;
        updateData.processedAt = new Date();
      }
    }

    const col = await getBucharenaReviewsCollection();
    const result = await col.findOneAndUpdate({ _id: new ObjectId(id) }, { $set: updateData }, { returnDocument: "after" });

    if (!result) return NextResponse.json({ success: false, error: "Rezension nicht gefunden" }, { status: 404 });

    return NextResponse.json({
      success: true,
      review: { id: result._id.toHexString(), bookTitle: result.bookTitle, review: result.review, status: result.status, processedBy: result.processedBy, processedAt: result.processedAt },
    });
  } catch (error) {
    console.error("Fehler beim Aktualisieren der Rezension:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unbekannter Fehler" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Keine Berechtigung" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "ID ist erforderlich" }, { status: 400 });

    const col = await getBucharenaReviewsCollection();
    const result = await col.findOneAndDelete({ _id: new ObjectId(id) });
    if (!result) return NextResponse.json({ success: false, error: "Rezension nicht gefunden" }, { status: 404 });

    return NextResponse.json({ success: true, message: "Rezension erfolgreich gelöscht" });
  } catch (error) {
    console.error("Fehler beim Löschen der Rezension:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unbekannter Fehler" }, { status: 500 });
  }
}
