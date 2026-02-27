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
      replyId?: string;
      authorUsername?: string;
    };

    const discussionId = body.discussionId?.trim();
    const replyId = body.replyId?.trim();
    const authorUsername = account.username;

    if (
      !discussionId ||
      !ObjectId.isValid(discussionId) ||
      !replyId ||
      !ObjectId.isValid(replyId)
    ) {
      return NextResponse.json(
        { message: "Diskussions-ID und Antwort-ID sind erforderlich." },
        { status: 400 }
      );
    }

    const discussions = await getDiscussionsCollection();

    const result = await discussions.updateOne(
      { _id: new ObjectId(discussionId) },
      {
        $pull: {
          replies: { _id: new ObjectId(replyId), authorUsername },
        } as Record<string, unknown>,
        $inc: { replyCount: -1 },
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { message: "Antwort nicht gefunden oder keine Berechtigung." },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Antwort gelöscht." });
  } catch {
    return NextResponse.json(
      { message: "Antwort konnte nicht gelöscht werden." },
      { status: 500 }
    );
  }
}
