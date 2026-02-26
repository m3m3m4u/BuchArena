import { NextResponse } from "next/server";
import { getBooksCollection, getUsersCollection } from "@/lib/mongodb";

type AuthorDiscoverItem = {
  username: string;
  displayName: string;
  profileImageUrl: string;
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
        { $or: [{ status: { $exists: false } }, { status: "active" }] },
        { projection: { username: 1, profile: 1 } }
      )
      .toArray();

    const activeUsernames = new Set(users.map((u) => u.username));

    const profileByUser = new Map<string, string>();
    const nameByUser = new Map<string, string>();
    for (const user of users) {
      const profileImageUrl = user.profile?.profileImage?.value ?? "";
      profileByUser.set(user.username, profileImageUrl);
      const name = (user.profile?.name?.visibility === "public" && user.profile?.name?.value) ? user.profile.name.value : "";
      nameByUser.set(user.username, name);
    }

    const grouped = new Map<string, AuthorDiscoverItem>();
    for (const book of books) {
      const key = book.ownerUsername;
      if (!activeUsernames.has(key)) {
        continue;
      }
      if (!grouped.has(key)) {
        grouped.set(key, {
          username: key,
          displayName: nameByUser.get(key) || key,
          profileImageUrl: profileByUser.get(key) ?? "",
          books: [],
        });
      }

      grouped.get(key)?.books.push({
        title: book.title,
        genre: book.genre,
        ageFrom: book.ageFrom,
        ageTo: book.ageTo,
      });
    }

    const authors = [...grouped.values()].sort((a, b) =>
      a.username.localeCompare(b.username, "de")
    );

    return NextResponse.json({ authors });
  } catch {
    return NextResponse.json(
      { message: "Autoren konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}
