import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getPollsCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as {
      pollId?: string;
      replyId?: string;
    };

    const pollId = body.pollId?.trim();
    const replyId = body.replyId?.trim();

    if (
      !pollId ||
      !ObjectId.isValid(pollId) ||
      !replyId ||
      !ObjectId.isValid(replyId)
    ) {
      return NextResponse.json(
        { message: "Abstimmungs-ID und Antwort-ID sind erforderlich." },
        { status: 400 }
      );
    }

    const polls = await getPollsCollection();
    const isAdmin = account.role === "ADMIN" || account.role === "SUPERADMIN";

    const pullFilter = isAdmin
      ? { _id: new ObjectId(replyId) }
      : { _id: new ObjectId(replyId), authorUsername: account.username };

    const result = await polls.updateOne(
      { _id: new ObjectId(pollId) },
      {
        $pull: { replies: pullFilter } as Record<string, unknown>,
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
