import { NextResponse } from "next/server";
import { getDiscussionsCollection } from "@/lib/mongodb";

export async function GET() {
  try {
    const discussions = await getDiscussionsCollection();
    const docs = await discussions
      .find({})
      .sort({ lastActivityAt: -1 })
      .project({
        authorUsername: 1,
        title: 1,
        body: 1,
        replyCount: 1,
        lastActivityAt: 1,
        createdAt: 1,
      })
      .toArray();

    const list = docs.map((d) => ({
      id: d._id.toString(),
      authorUsername: d.authorUsername,
      title: d.title,
      body: d.body,
      replyCount: d.replyCount ?? 0,
      lastActivityAt: d.lastActivityAt,
      createdAt: d.createdAt,
    }));

    return NextResponse.json({ discussions: list });
  } catch {
    return NextResponse.json(
      { message: "Diskussionen konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}
