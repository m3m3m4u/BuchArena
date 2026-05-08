import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getBooksCollection, getUsersCollection } from "@/lib/mongodb";
import { applyAmazonOverride } from "@/lib/books";
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
      { projection: { profile: 1, status: 1 } }
    );

    // Deaktiviertes Konto oder deaktiviertes Profil: Buch verstecken
    if (user?.status === "deactivated" || user?.profile?.deaktiviert) {
      return NextResponse.json(
        { message: "Buch nicht gefunden." },
        { status: 404 }
      );
    }

    const profile = user?.profile ?? createDefaultProfile();
    const authorImageUrl =
      profile.profileImage?.visibility === "public" ? profile.profileImage.value : "";
    const authorName =
      profile.name?.visibility === "public" ? profile.name.value : "";

    // Mitautoren (nur confirmed) mit öffentlichen Profilinfos laden
    const confirmedCoAuthors = (book.coAuthors ?? []).filter((c) => c.status === "confirmed");
    const coAuthorInfos: { username: string; name: string; imageUrl: string }[] = [];
    for (const ca of confirmedCoAuthors) {
      const caUser = await users.findOne({ username: ca.username }, { projection: { profile: 1, displayName: 1 } });
      const caProfile = caUser?.profile ?? createDefaultProfile();
      coAuthorInfos.push({
        username: ca.username,
        name: caProfile.name?.visibility === "public" ? (caProfile.name.value ?? "") : "",
        imageUrl: caProfile.profileImage?.visibility === "public" ? (caProfile.profileImage.value ?? "") : "",
      });
    }

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
        publisher: book.publisher ?? "",
        isbn: book.isbn ?? "",
        pageCount: book.pageCount ?? 0,
        language: book.language ?? "",
        description: book.description,
        buyLinks: applyAmazonOverride(book.buyLinks, book.amazonOverrideUrl),
        presentationVideoUrl: book.presentationVideoUrl,
        presentationVideoInternal: book.presentationVideoInternal,
        excerpts: book.excerpts ?? [],
        createdAt: book.createdAt,
      },
      author: {
        username: book.ownerUsername,
        name: authorName,
        imageUrl: authorImageUrl,
      },
      coAuthors: coAuthorInfos,
    });
  } catch {
    return NextResponse.json(
      { message: "Buch konnte nicht geladen werden." },
      { status: 500 }
    );
  }
}
