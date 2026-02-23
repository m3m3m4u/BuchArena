import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getBooksCollection } from "@/lib/mongodb";

type DeleteBookPayload = {
  ownerUsername?: string;
  bookId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DeleteBookPayload;
    const ownerUsername = body.ownerUsername?.trim();
    const bookId = body.bookId?.trim();

    if (!ownerUsername || !bookId) {
      return NextResponse.json(
        { message: "Benutzername oder Buch-ID fehlt." },
        { status: 400 }
      );
    }

    const books = await getBooksCollection();
    const result = await books.deleteOne({
      _id: new ObjectId(bookId),
      ownerUsername,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { message: "Buch nicht gefunden." },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Buch gelöscht." });
  } catch {
    return NextResponse.json(
      { message: "Buch konnte nicht gelöscht werden." },
      { status: 500 }
    );
  }
}
