import { NextResponse } from "next/server";
import { getBooksCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

type ListBooksPayload = {
  ownerUsername?: string;
};

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const ownerUsername = account.username;

    const books = await getBooksCollection();
    const list = await books
      .find({
        $or: [
          { ownerUsername },
          { coAuthors: { $elemMatch: { username: ownerUsername, status: "confirmed" } } },
        ],
      })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      books: list.map((book) => ({
        id: String(book._id),
        ownerUsername: book.ownerUsername,
        coverImageUrl: book.coverImageUrl ?? "",
        title: book.title,
        publicationYear: book.publicationYear,
        genre: book.genre,
        ageFrom: book.ageFrom,
        ageTo: book.ageTo,
        description: book.description,
        publisher: book.publisher ?? "",
        isbn: book.isbn ?? "",
        pageCount: book.pageCount ?? 0,
        language: book.language ?? "",
        buyLinks: book.buyLinks,
        presentationVideoUrl: book.presentationVideoUrl,
        presentationVideoInternal: book.presentationVideoInternal,
        excerpts: book.excerpts ?? [],
        coAuthors: (book.coAuthors ?? []).map((c) => ({
          username: c.username,
          status: c.status,
          invitedAt: c.invitedAt,
          confirmedAt: c.confirmedAt,
        })),
        createdAt: book.createdAt,
      })),
    });
  } catch {
    return NextResponse.json(
      { message: "Bücher konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}
