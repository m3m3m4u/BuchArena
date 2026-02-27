import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDiscussionsCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as {
      discussionId?: string;
      authorUsername?: string;
      body?: string;
    };

    const discussionId = body.discussionId?.trim();
    const authorUsername = account.username;
    const replyBody = body.body?.trim();

    if (!discussionId || !ObjectId.isValid(discussionId) || !replyBody) {
      return NextResponse.json(
        { message: "Diskussions-ID und Text sind erforderlich." },
        { status: 400 }
      );
    }

    if (replyBody.length > 3000) {
      return NextResponse.json(
        { message: "Antwort darf maximal 3000 Zeichen lang sein." },
        { status: 400 }
      );
    }

    const discussions = await getDiscussionsCollection();
    const now = new Date();
    const replyId = new ObjectId();

    const result = await discussions.updateOne(
      { _id: new ObjectId(discussionId) },
      {
        $push: {
          replies: {
            _id: replyId,
            authorUsername,
            body: replyBody,
            createdAt: now,
          },
        },
        $inc: { replyCount: 1 },
        $set: { lastActivityAt: now },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Diskussion nicht gefunden." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      reply: {
        id: replyId.toString(),
        authorUsername,
        body: replyBody,
        createdAt: now,
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Antwort konnte nicht erstellt werden." },
      { status: 500 }
    );
  }
}
