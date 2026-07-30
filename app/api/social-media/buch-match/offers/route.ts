import { NextResponse } from "next/server";
import { type MatchPlatform } from "@/lib/buchmatch";
import { getBuchMatchOffersCollection } from "@/lib/buchmatch-db";
import { getServerAccount } from "@/lib/server-auth";
import { getBooksCollection } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const myOnly = searchParams.get("myOnly") === "true";
    const platformFilter = searchParams.get("platform");
    const genreFilter = searchParams.get("genre");

    const account = await getServerAccount();

    const collection = await getBuchMatchOffersCollection();

    const query: Record<string, unknown> = {};

    if (myOnly) {
      if (!account) {
        return NextResponse.json({ success: false, message: "Nicht angemeldet." }, { status: 401 });
      }
      query.authorUsername = account.username;
    } else {
      query.status = "active";
      if (platformFilter && platformFilter !== "all") {
        query.$or = [{ offeredPlatform: platformFilter }, { requestedPlatform: platformFilter }];
      }
      if (genreFilter && genreFilter !== "all") {
        query.preferredGenres = genreFilter;
      }
    }

    const offers = await collection.find(query).sort({ createdAt: -1 }).toArray();

    return NextResponse.json({
      success: true,
      offers: offers.map((o) => ({
        id: String(o._id),
        authorUsername: o.authorUsername,
        bookId: o.bookId,
        bookTitle: o.bookTitle,
        bookCoverUrl: o.bookCoverUrl,
        offeredPlatform: o.offeredPlatform,
        offeredFormat: o.offeredFormat,
        offeredChannelHandle: o.offeredChannelHandle,
        requestedPlatform: o.requestedPlatform,
        requestedFormat: o.requestedFormat,
        preferredGenres: o.preferredGenres,
        notes: o.notes,
        status: o.status,
        createdAt: o.createdAt,
      })),
    });
  } catch (error) {
    console.error("GET /api/social-media/buch-match/offers error:", error);
    return NextResponse.json({ success: false, message: "Fehler beim Laden der Angebote." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ success: false, message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = await request.json();
    const {
      bookId,
      offeredPlatform,
      offeredFormat,
      offeredChannelHandle,
      requestedPlatform,
      requestedFormat,
      preferredGenres,
      notes,
    } = body;

    if (!bookId || !offeredPlatform || !offeredFormat) {
      return NextResponse.json(
        { success: false, message: "Bitte Buch, angebotene Plattform und Format angeben." },
        { status: 400 }
      );
    }

    // Verify book ownership
    const booksCol = await getBooksCollection();
    let objectId: ObjectId | null = null;
    try {
      objectId = new ObjectId(bookId);
    } catch {
      objectId = null;
    }

    const bookDoc = objectId
      ? await booksCol.findOne({
          _id: objectId,
          $or: [
            { ownerUsername: account.username },
            { coAuthors: { $elemMatch: { username: account.username, status: "confirmed" } } },
          ],
        })
      : null;

    if (!bookDoc) {
      return NextResponse.json(
        { success: false, message: "Ausgewähltes Buch nicht gefunden oder gehört nicht zu deinem Konto." },
        { status: 404 }
      );
    }

    const offersCol = await getBuchMatchOffersCollection();

    const newOffer = {
      authorUsername: account.username,
      bookId: String(bookDoc._id),
      bookTitle: bookDoc.title,
      bookCoverUrl: bookDoc.coverImageUrl,
      offeredPlatform: offeredPlatform as MatchPlatform,
      offeredFormat: String(offeredFormat).trim(),
      offeredChannelHandle: offeredChannelHandle ? String(offeredChannelHandle).trim() : undefined,
      requestedPlatform: (requestedPlatform as MatchPlatform) || "egal",
      requestedFormat: requestedFormat ? String(requestedFormat).trim() : undefined,
      preferredGenres: Array.isArray(preferredGenres) ? preferredGenres : [],
      notes: notes ? String(notes).trim() : undefined,
      status: "active" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await offersCol.insertOne(newOffer);

    return NextResponse.json({
      success: true,
      message: "Buch-Match Inserat erfolgreich erstellt!",
      offerId: String(result.insertedId),
    });
  } catch (error) {
    console.error("POST /api/social-media/buch-match/offers error:", error);
    return NextResponse.json({ success: false, message: "Fehler beim Erstellen des Inserats." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ success: false, message: "Nicht angemeldet." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, message: "ID fehlt." }, { status: 400 });
    }

    const offersCol = await getBuchMatchOffersCollection();
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      return NextResponse.json({ success: false, message: "Ungültige ID." }, { status: 400 });
    }

    const res = await offersCol.deleteOne({ _id: objectId, authorUsername: account.username });
    if (res.deletedCount === 0) {
      return NextResponse.json({ success: false, message: "Inserat nicht gefunden oder keine Berechtigung." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Inserat gelöscht." });
  } catch (error) {
    console.error("DELETE /api/social-media/buch-match/offers error:", error);
    return NextResponse.json({ success: false, message: "Fehler beim Löschen." }, { status: 500 });
  }
}
