import { NextResponse } from "next/server";
import { getBooksCollection } from "@/lib/mongodb";

type ListBooksPayload = {
  ownerUsername?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ListBooksPayload;
    const ownerUsername = body.ownerUsername?.trim();

    if (!ownerUsername) {
      return NextResponse.json(
        { message: "Benutzername fehlt." },
        { status: 400 }
      );
    }

    const books = await getBooksCollection();
    const list = await books
      .find({ ownerUsername })
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
        buyLinks: book.buyLinks,
        presentationVideoUrl: book.presentationVideoUrl,
        presentationVideoInternal: book.presentationVideoInternal,
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
