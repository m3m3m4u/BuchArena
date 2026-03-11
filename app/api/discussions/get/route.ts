import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDiscussionsCollection } from "@/lib/mongodb";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { id?: string };
    const id = body.id?.trim();

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Ungültige Diskussions-ID." },
        { status: 400 }
      );
    }

    const discussions = await getDiscussionsCollection();
    const doc = await discussions.findOne({ _id: new ObjectId(id) });

    if (!doc) {
      return NextResponse.json(
        { message: "Diskussion nicht gefunden." },
        { status: 404 }
      );
    }

    const replies = (doc.replies ?? []).map((r) => ({
      id: r._id?.toString() ?? "",
      authorUsername: r.authorUsername,
      body: r.body,
      createdAt: r.createdAt,
      reactions: r.reactions ?? [],
    }));

    return NextResponse.json({
      discussion: {
        id: doc._id.toString(),
        authorUsername: doc.authorUsername,
        title: doc.title,
        body: doc.body,
        replyCount: doc.replyCount ?? 0,
        lastActivityAt: doc.lastActivityAt,
        createdAt: doc.createdAt,
        replies,
        reactions: doc.reactions ?? [],
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Diskussion konnte nicht geladen werden." },
      { status: 500 }
    );
  }
}
