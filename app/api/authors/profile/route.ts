import { NextResponse } from "next/server";
import { getBooksCollection, findUserBySlugOrUsername } from "@/lib/mongodb";
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

    const books = await getBooksCollection();

    const user = await findUserBySlugOrUsername(username, { username: 1, profile: 1, isUnclaimed: 1, displayName: 1 });

    if (!user) {
      return NextResponse.json(
        { message: "Autor nicht gefunden." },
        { status: 404 }
      );
    }

    // Deaktivierte Profile ausblenden
    if (user.status === "deactivated" || user.profile?.deaktiviert) {
      return NextResponse.json(
        { message: "Autor nicht gefunden." },
        { status: 404 }
      );
    }

    const rawBooks = await books
      .find(
        { ownerUsername: user.username },
        { projection: { _id: 1, title: 1, subtitle: 1, genre: 1, ageFrom: 1, ageTo: 1, coverImageUrl: 1, isUnclaimed: 1 } }
      )
      .sort({ createdAt: -1 })
      .toArray();

    const authorBooks = rawBooks.map((b) => ({ ...b, id: b._id.toString(), _id: undefined, subtitle: b.subtitle ?? "" }));

    const profile = user.profile ?? createDefaultProfile();

    // Bei unbeanspruchten KI-/Katalog-Profilen: Bild garantiert leer lassen
    if (user.isUnclaimed && profile.profileImage) {
      profile.profileImage.value = "";
    }

    return NextResponse.json({
      author: {
        username: user.username,
        displayName: user.displayName || user.profile?.name?.value || user.username,
        isUnclaimed: Boolean(user.isUnclaimed),
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
