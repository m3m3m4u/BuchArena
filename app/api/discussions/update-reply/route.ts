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
      body?: string;
    };

    const discussionId = body.discussionId?.trim();
    const replyId = body.replyId?.trim();
    const replyBody = body.body?.trim();
    const authorUsername = account.username;

    if (
      !discussionId ||
      !ObjectId.isValid(discussionId) ||
      !replyId ||
      !ObjectId.isValid(replyId) ||
      !replyBody
    ) {
      return NextResponse.json(
        { message: "Alle Felder sind erforderlich." },
        { status: 400 }
      );
    }

    if (replyBody.length > 3000) {
      return NextResponse.json(
        { message: "Text darf maximal 3000 Zeichen lang sein." },
        { status: 400 }
      );
    }

    const discussions = await getDiscussionsCollection();
    const isAdmin = account.role === "ADMIN" || account.role === "SUPERADMIN";

    const doc = await discussions.findOne({
      _id: new ObjectId(discussionId),
      "replies._id": new ObjectId(replyId),
    });

    if (!doc) {
      return NextResponse.json(
        { message: "Antwort nicht gefunden." },
        { status: 404 }
      );
    }

    const reply = doc.replies?.find((r) => r._id?.toString() === replyId);
    if (!reply) {
      return NextResponse.json(
        { message: "Antwort nicht gefunden." },
        { status: 404 }
      );
    }

    if (!isAdmin && reply.authorUsername.toLowerCase() !== authorUsername.toLowerCase()) {
      return NextResponse.json(
        { message: "Keine Berechtigung zum Bearbeiten dieser Antwort." },
        { status: 403 }
      );
    }

    const result = await discussions.updateOne(
      {
        _id: new ObjectId(discussionId),
        "replies._id": new ObjectId(replyId),
      },
      {
        $set: { "replies.$.body": replyBody },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Antwort konnte nicht aktualisiert werden." },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Antwort aktualisiert." });
  } catch {
    return NextResponse.json(
      { message: "Antwort konnte nicht aktualisiert werden." },
      { status: 500 }
    );
  }
}
