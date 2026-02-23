import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import type { CreateBookPayload } from "@/lib/books";
import { getBooksCollection } from "@/lib/mongodb";

type UpdateBookPayload = CreateBookPayload & {
  bookId?: string;
};

function toNumber(value: unknown, fallback: number) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UpdateBookPayload;

    const ownerUsername = body.ownerUsername?.trim();
    const bookId = body.bookId?.trim();
    const coverImageUrl = body.coverImageUrl?.trim() ?? "";
    const title = body.title?.trim();
    const publicationYear = toNumber(body.publicationYear, 0);
    const genre = body.genre?.trim();
    const ageFrom = toNumber(body.ageFrom, 0);
    const ageTo = toNumber(body.ageTo, 0);
    const publisher = body.publisher?.trim() ?? "";
    const isbn = body.isbn?.trim() ?? "";
    const pageCount = toNumber(body.pageCount, 0);
    const language = body.language?.trim() ?? "";
    const description = body.description?.trim() ?? "";
    const buyLinks = (body.buyLinks ?? []).map((entry) => entry.trim()).filter(Boolean);
    const presentationVideoUrl = body.presentationVideoUrl?.trim() ?? "";

    if (!ownerUsername || !bookId || !title || !genre) {
      return NextResponse.json(
        { message: "Bitte Buch, Titel, Genre und Benutzer angeben." },
        { status: 400 }
      );
    }

    if (publicationYear < 1000 || publicationYear > 9999) {
      return NextResponse.json(
        { message: "Erscheinungsjahr ist ungültig." },
        { status: 400 }
      );
    }

    if (ageFrom < 0 || ageTo < 0 || ageFrom > ageTo) {
      return NextResponse.json(
        { message: "Alter von/bis ist ungültig." },
        { status: 400 }
      );
    }

    const books = await getBooksCollection();
    const result = await books.updateOne(
      { _id: new ObjectId(bookId), ownerUsername },
      {
        $set: {
          title,
          coverImageUrl: coverImageUrl.slice(0, 1000),
          publicationYear,
          genre,
          ageFrom,
          ageTo,
          publisher: publisher.slice(0, 500),
          isbn: isbn.slice(0, 30),
          pageCount,
          language: language.slice(0, 100),
          description: description.slice(0, 5000),
          buyLinks: buyLinks.slice(0, 20),
          presentationVideoUrl: presentationVideoUrl.slice(0, 500),
          presentationVideoInternal: true,
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Buch nicht gefunden." },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Buch aktualisiert." });
  } catch {
    return NextResponse.json(
      { message: "Buch konnte nicht aktualisiert werden." },
      { status: 500 }
    );
  }
}
