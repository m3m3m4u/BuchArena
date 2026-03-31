import { NextResponse } from "next/server";
import { getBooksCollection, getUsersCollection } from "@/lib/mongodb";

type AuthorDiscoverItem = {
  username: string;
  displayName: string;
  profileImageUrl: string;
  profileImageCrop?: { x: number; y: number; zoom: number };
  lastOnline: string | null;
  books: Array<{
    title: string;
    genre: string;
    ageFrom: number;
    ageTo: number;
  }>;
};

export async function GET() {
  try {
    const booksCollection = await getBooksCollection();
    const usersCollection = await getUsersCollection();

    const books = await booksCollection
      .find({}, { projection: { ownerUsername: 1, title: 1, genre: 1, ageFrom: 1, ageTo: 1 } })
      .toArray();

    const users = await usersCollection
      .find(
        { $or: [{ status: { $exists: false } }, { status: "active" }], username: { $not: { $regex: /^kopernikus$/i } } },
        { projection: { username: 1, displayName: 1, profile: 1, lastOnline: 1, speakerProfile: 1 } }
      )
      .toArray();

    /* Build lookup maps for all active users */
    const profileByUser = new Map<string, { url: string; crop?: { x: number; y: number; zoom: number } }>();
    const lastOnlineByUser = new Map<string, string | null>();

    for (const user of users) {
      const pi = user.profile?.profileImage;
      const profileImageUrl = (!pi?.visibility || pi.visibility === "public") ? (pi?.value ?? "") : "";
      profileByUser.set(user.username, { url: profileImageUrl, crop: pi?.crop });
      lastOnlineByUser.set(user.username, user.lastOnline ? new Date(user.lastOnline).toISOString() : null);
    }

    /* Start with an entry for every active user that has a name filled in */
    const grouped = new Map<string, AuthorDiscoverItem>();
    for (const user of users) {
      // Solange der Name ausgefüllt ist, gilt das Profil als ausgefüllt
      if (!user.profile?.name?.value) continue;
      // Deaktivierte Profile ausblenden
      if (user.profile?.deaktiviert) continue;

      const displayName =
        user.displayName
          ? user.displayName
          : user.profile.name.visibility === "public" && user.profile.name.value
            ? user.profile.name.value
            : user.username;

      const imgData = profileByUser.get(user.username);
      grouped.set(user.username, {
        username: user.username,
        displayName,
        profileImageUrl: imgData?.url ?? "",
        profileImageCrop: imgData?.crop,
        lastOnline: lastOnlineByUser.get(user.username) ?? null,
        books: [],
      });
    }

    /* Attach books to their owners */
    for (const book of books) {
      const entry = grouped.get(book.ownerUsername);
      if (!entry) continue;
      entry.books.push({
        title: book.title,
        genre: book.genre,
        ageFrom: book.ageFrom,
        ageTo: book.ageTo,
      });
    }

    const authors = [...grouped.values()];

    return NextResponse.json({ authors });
  } catch {
    return NextResponse.json(
      { message: "Autoren konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}
