import { NextResponse } from "next/server";
import { getPollsCollection, getUsersCollection } from "@/lib/mongodb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const genre = searchParams.get("genre") ?? undefined;

    const polls = await getPollsCollection();
    const filter = genre ? { genre } : { genre: { $exists: false } };
    const docs = await polls
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    // Collect all usernames (authors + reply authors)
    const allUsernames = new Set<string>();
    for (const d of docs) {
      allUsernames.add(d.authorUsername);
      for (const r of d.replies ?? []) allUsernames.add(r.authorUsername);
    }
    const usersCol = await getUsersCollection();
    const authorDocs = await usersCol
      .find({ username: { $in: [...allUsernames] } })
      .project({ username: 1, displayName: 1 })
      .toArray();
    const dnMap = new Map<string, string>();
    for (const u of authorDocs) {
      if (u.displayName) dnMap.set(u.username, u.displayName as string);
    }

    const list = docs.map((d) => ({
      id: d._id!.toString(),
      authorUsername: d.authorUsername,
      displayName: dnMap.get(d.authorUsername) ?? "",
      question: d.question,
      options: d.options,
      votes: d.votes.map((v) => ({
        username: v.username,
        optionIndex: v.optionIndex,
      })),
      totalVotes: d.votes.length,
      replies: (d.replies ?? []).map((r) => ({
        id: r._id!.toString(),
        authorUsername: r.authorUsername,
        displayName: dnMap.get(r.authorUsername) ?? "",
        body: r.body,
        createdAt: r.createdAt,
      })),
      createdAt: d.createdAt,
    }));

    return NextResponse.json({ polls: list });
  } catch {
    return NextResponse.json(
      { message: "Abstimmungen konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}
