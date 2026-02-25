import { NextResponse } from "next/server";
import { getBucharenaReviewsCollection } from "@/lib/bucharena-db";
import { getServerAccount } from "@/lib/server-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    const body = await request.json();
    const { bookTitle, review } = body;

    if (!bookTitle || !review) {
      return NextResponse.json({ success: false, error: "Buchtitel und Rezension sind erforderlich" }, { status: 400 });
    }

    const trimmedTitle = bookTitle.trim();
    const trimmedReview = review.trim();

    if (trimmedTitle.length < 2) {
      return NextResponse.json({ success: false, error: "Buchtitel ist zu kurz (mindestens 2 Zeichen)" }, { status: 400 });
    }
    if (trimmedReview.length < 10) {
      return NextResponse.json({ success: false, error: "Rezension ist zu kurz (mindestens 10 Zeichen)" }, { status: 400 });
    }

    const col = await getBucharenaReviewsCollection();
    const now = new Date();
    const result = await col.insertOne({
      bookTitle: trimmedTitle,
      review: trimmedReview,
      authorEmail: account?.email || undefined,
      authorName: account?.username || undefined,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      review: { id: result.insertedId.toHexString(), bookTitle: trimmedTitle, review: trimmedReview, status: "pending", createdAt: now },
    });
  } catch (error) {
    console.error("Fehler beim Erstellen der Rezension:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unbekannter Fehler" }, { status: 500 });
  }
}
