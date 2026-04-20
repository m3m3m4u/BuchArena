import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { getBlogCollection } from "@/lib/blog";

type SaveDisplayNamePayload = {
  username?: string;
  displayName?: string;
};

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as SaveDisplayNamePayload;
    const username =
      account.role === "SUPERADMIN" && body.username?.trim()
        ? body.username.trim()
        : account.username;

    const displayName = (body.displayName ?? "").trim().slice(0, 120);

    const users = await getUsersCollection();
    const result = await users.updateOne(
      { username },
      { $set: { displayName } },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Benutzer nicht gefunden." },
        { status: 404 },
      );
    }

    // Blog-Beiträge des Nutzers ebenfalls aktualisieren
    const blog = await getBlogCollection();
    await blog.updateMany(
      { authorUsername: username },
      { $set: { authorDisplayName: displayName || username } },
    );

    return NextResponse.json({ message: "Angezeigter Name gespeichert." });
  } catch {
    return NextResponse.json(
      { message: "Angezeigter Name konnte nicht gespeichert werden." },
      { status: 500 },
    );
  }
}
