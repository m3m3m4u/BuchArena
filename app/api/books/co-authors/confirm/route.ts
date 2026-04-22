import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getBooksCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

/** POST /api/books/co-authors/confirm – Eingeladener Mitautor bestätigt die Mitautorenschaft */
export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as { bookId?: string };
    const bookId = body.bookId?.trim();

    if (!bookId || !ObjectId.isValid(bookId)) {
      return NextResponse.json({ message: "Ungültige Buch-ID." }, { status: 400 });
    }

    const books = await getBooksCollection();
    const result = await books.updateOne(
      {
        _id: new ObjectId(bookId),
        "coAuthors.username": account.username,
        "coAuthors.status": "pending",
      },
      {
        $set: {
          "coAuthors.$.status": "confirmed",
          "coAuthors.$.confirmedAt": new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "Einladung nicht gefunden oder bereits bearbeitet." }, { status: 404 });
    }

    return NextResponse.json({ message: "Mitautorenschaft bestätigt!" });
  } catch (err) {
    console.error("POST /api/books/co-authors/confirm error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
