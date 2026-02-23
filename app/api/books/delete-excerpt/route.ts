import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getBooksCollection } from "@/lib/mongodb";

type DeleteExcerptPayload = {
  bookId?: string;
  ownerUsername?: string;
  excerptId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DeleteExcerptPayload;

    const bookId = body.bookId?.trim();
    const ownerUsername = body.ownerUsername?.trim();
    const excerptId = body.excerptId?.trim();

    if (!bookId || !ownerUsername || !excerptId) {
      return NextResponse.json(
        { message: "Buch-ID, Benutzername und Ausschnitt-ID sind erforderlich." },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(bookId)) {
      return NextResponse.json(
        { message: "Ungültige Buch-ID." },
        { status: 400 }
      );
    }

    const books = await getBooksCollection();
    const result = await books.updateOne(
      { _id: new ObjectId(bookId), ownerUsername },
      { $pull: { excerpts: { id: excerptId } } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Buch nicht gefunden." },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Textausschnitt gelöscht." });
  } catch {
    return NextResponse.json(
      { message: "Textausschnitt konnte nicht gelöscht werden." },
      { status: 500 }
    );
  }
}
