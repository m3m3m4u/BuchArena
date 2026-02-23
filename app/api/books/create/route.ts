import { NextResponse } from "next/server";
import type { CreateBookPayload } from "@/lib/books";
import { getBooksCollection } from "@/lib/mongodb";

function toNumber(value: unknown, fallback: number) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateBookPayload;

    const ownerUsername = body.ownerUsername?.trim();
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

    if (!ownerUsername || !title || !genre) {
      return NextResponse.json(
        { message: "Bitte Titel, Genre und Benutzer angeben." },
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
    await books.insertOne({
      ownerUsername,
      coverImageUrl: coverImageUrl.slice(0, 1000),
      title,
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
      excerpts: [],
      createdAt: new Date(),
    });

    return NextResponse.json({ message: "Buch angelegt." }, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Buch konnte nicht angelegt werden." },
      { status: 500 }
    );
  }
}
