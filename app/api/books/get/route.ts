import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getBooksCollection, getUsersCollection } from "@/lib/mongodb";
import { createDefaultProfile } from "@/lib/profile";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim();

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Ungültige Buch-ID." },
        { status: 400 }
      );
    }

    const books = await getBooksCollection();
    const book = await books.findOne({ _id: new ObjectId(id) });

    if (!book) {
      return NextResponse.json(
        { message: "Buch nicht gefunden." },
        { status: 404 }
      );
    }

    const users = await getUsersCollection();
    const user = await users.findOne(
      { username: book.ownerUsername },
      { projection: { profile: 1 } }
    );

    const profile = user?.profile ?? createDefaultProfile();
    const authorImageUrl =
      profile.profileImage?.visibility === "public" ? profile.profileImage.value : "";

    return NextResponse.json({
      book: {
        id: book._id.toString(),
        ownerUsername: book.ownerUsername,
        coverImageUrl: book.coverImageUrl,
        title: book.title,
        publicationYear: book.publicationYear,
        genre: book.genre,
        ageFrom: book.ageFrom,
        ageTo: book.ageTo,
        description: book.description,
        buyLinks: book.buyLinks ?? [],
        presentationVideoUrl: book.presentationVideoUrl,
        presentationVideoInternal: book.presentationVideoInternal,
        createdAt: book.createdAt,
      },
      author: {
        username: book.ownerUsername,
        imageUrl: authorImageUrl,
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Buch konnte nicht geladen werden." },
      { status: 500 }
    );
  }
}
