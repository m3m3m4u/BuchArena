import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getBooksCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

type DeleteBookPayload = {
  ownerUsername?: string;
  bookId?: string;
};

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as DeleteBookPayload;
    const ownerUsername = account.username;
    const bookId = body.bookId?.trim();

    if (!bookId) {
      return NextResponse.json(
        { message: "Buch-ID fehlt." },
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
