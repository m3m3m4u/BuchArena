import { NextResponse } from "next/server";
import { getPollsCollection, getUsersCollection } from "@/lib/mongodb";

export async function GET() {
  try {
    const polls = await getPollsCollection();
    const docs = await polls
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // Lookup displayName for poll authors
    const authorNames = [...new Set(docs.map((d) => d.authorUsername))];
    const usersCol = await getUsersCollection();
    const authorDocs = await usersCol
      .find({ username: { $in: authorNames } })
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
