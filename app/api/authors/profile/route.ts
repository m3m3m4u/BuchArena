import { NextResponse } from "next/server";
import { getBooksCollection, getUsersCollection } from "@/lib/mongodb";
import { createDefaultProfile } from "@/lib/profile";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username")?.trim();

    if (!username) {
      return NextResponse.json(
        { message: "Benutzername fehlt." },
        { status: 400 }
      );
    }

    const users = await getUsersCollection();
    const books = await getBooksCollection();

    const user = await users.findOne(
      { username },
      { projection: { username: 1, profile: 1 } }
    );

    if (!user) {
      return NextResponse.json(
        { message: "Autor nicht gefunden." },
        { status: 404 }
      );
    }

    const rawBooks = await books
      .find(
        { ownerUsername: username },
        { projection: { _id: 1, title: 1, genre: 1, ageFrom: 1, ageTo: 1, coverImageUrl: 1 } }
      )
      .sort({ createdAt: -1 })
      .toArray();

    const authorBooks = rawBooks.map((b) => ({ ...b, id: b._id.toString(), _id: undefined }));

    const profile = user.profile ?? createDefaultProfile();

    return NextResponse.json({
      author: {
        username: user.username,
        profile,
        books: authorBooks,
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Autorprofil konnte nicht geladen werden." },
      { status: 500 }
    );
  }
}
