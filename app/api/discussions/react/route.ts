import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDiscussionsCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { ALLOWED_EMOJIS } from "@/lib/discussions";

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as {
      discussionId?: string;
      replyId?: string;
      emoji?: string;
    };

    const discussionId = body.discussionId?.trim();
    const replyId = body.replyId?.trim();
    const emoji = body.emoji;

    if (!discussionId || !ObjectId.isValid(discussionId)) {
      return NextResponse.json(
        { message: "Ungültige Diskussions-ID." },
        { status: 400 }
      );
    }

    if (!emoji || !ALLOWED_EMOJIS.includes(emoji)) {
      return NextResponse.json(
        { message: "Ungültiges Emoji." },
        { status: 400 }
      );
    }

    if (replyId && !ObjectId.isValid(replyId)) {
      return NextResponse.json(
        { message: "Ungültige Antwort-ID." },
        { status: 400 }
      );
    }

    const discussions = await getDiscussionsCollection();
    const username = account.username;

    if (replyId) {
      // Reaction on a reply — check if already reacted with this emoji
      const existing = await discussions.findOne({
        _id: new ObjectId(discussionId),
        "replies._id": new ObjectId(replyId),
        "replies.reactions": { $elemMatch: { username, emoji } },
      });

      if (existing) {
        // Remove reaction (toggle off)
        await discussions.updateOne(
          { _id: new ObjectId(discussionId), "replies._id": new ObjectId(replyId) },
          { $pull: { "replies.$.reactions": { username, emoji } } }
        );
      } else {
        // Add reaction (toggle on)
        await discussions.updateOne(
          { _id: new ObjectId(discussionId), "replies._id": new ObjectId(replyId) },
          { $push: { "replies.$.reactions": { username, emoji } } }
        );
      }
    } else {
      // Reaction on the discussion itself
      const existing = await discussions.findOne({
        _id: new ObjectId(discussionId),
        reactions: { $elemMatch: { username, emoji } },
      });

      if (existing) {
        await discussions.updateOne(
          { _id: new ObjectId(discussionId) },
          { $pull: { reactions: { username, emoji } } }
        );
      } else {
        await discussions.updateOne(
          { _id: new ObjectId(discussionId) },
          { $push: { reactions: { username, emoji } } }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { message: "Reaktion konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }
}
