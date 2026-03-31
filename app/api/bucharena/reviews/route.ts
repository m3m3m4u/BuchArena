import { NextResponse } from "next/server";
import { getBucharenaReviewsCollection } from "@/lib/bucharena-db";
import { getServerAccount } from "@/lib/server-auth";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ success: false, error: "Nicht eingeloggt" }, { status: 401 });
    }

    // Rate-Limiting: max 10 Rezensionen pro Stunde
    if (!checkRateLimit(`review:${account.username}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json({ success: false, error: "Zu viele Rezensionen. Bitte warte etwas." }, { status: 429 });
    }

    const body = await request.json();
    const { bookTitle, review, authorName: submittedAuthorName, instagram } = body;

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
      authorName: (typeof submittedAuthorName === "string" && submittedAuthorName.trim()) ? submittedAuthorName.trim() : (account?.username || undefined),
      instagram: (typeof instagram === "string" && instagram.trim()) ? instagram.trim() : undefined,
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
    return NextResponse.json({ success: false, error: "Rezension konnte nicht gespeichert werden." }, { status: 500 });
  }
}
