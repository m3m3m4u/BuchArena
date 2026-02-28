import { NextResponse } from "next/server";
import { getBooksCollection, getUsersCollection } from "@/lib/mongodb";

type AuthorDiscoverItem = {
  username: string;
  displayName: string;
  profileImageUrl: string;
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
        { $or: [{ status: { $exists: false } }, { status: "active" }], username: { $ne: "kopernikus" } },
        { projection: { username: 1, profile: 1, lastOnline: 1, speakerProfile: 1 } }
      )
      .toArray();

    /* Build lookup maps for all active users */
    const profileByUser = new Map<string, string>();
    const nameByUser = new Map<string, string>();
    const lastOnlineByUser = new Map<string, string | null>();
    const isSpeaker = new Set<string>();

    for (const user of users) {
      const profileImageUrl = user.profile?.profileImage?.value ?? "";
      profileByUser.set(user.username, profileImageUrl);
      const name = (user.profile?.name?.visibility === "public" && user.profile?.name?.value) ? user.profile.name.value : "";
      nameByUser.set(user.username, name);
      lastOnlineByUser.set(user.username, user.lastOnline ? new Date(user.lastOnline).toISOString() : null);
      if (user.speakerProfile) isSpeaker.add(user.username);
    }

    /* Start with an entry for every active user (including those without books) */
    const grouped = new Map<string, AuthorDiscoverItem>();
    for (const user of users) {
      grouped.set(user.username, {
        username: user.username,
        displayName: nameByUser.get(user.username) || user.username,
        profileImageUrl: profileByUser.get(user.username) ?? "",
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

    /* Remove pure speakers (speakerProfile present but no books) */
    const authors = [...grouped.values()].filter(
      (a) => a.books.length > 0 || !isSpeaker.has(a.username)
    );

    return NextResponse.json({ authors });
  } catch {
    return NextResponse.json(
      { message: "Autoren konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}
