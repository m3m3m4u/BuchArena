import { NextResponse } from "next/server";
import { getPollsCollection } from "@/lib/mongodb";

export async function GET() {
  try {
    const polls = await getPollsCollection();
    const docs = await polls
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    const list = docs.map((d) => ({
      id: d._id!.toString(),
      authorUsername: d.authorUsername,
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
