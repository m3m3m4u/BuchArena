import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getPollsCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { awardTreffpunktBeitrag } from "@/lib/lesezeichen";

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as {
      pollId?: string;
      body?: string;
    };

    const pollId = body.pollId?.trim();
    const replyBody = body.body?.trim();

    if (!pollId || !ObjectId.isValid(pollId) || !replyBody) {
      return NextResponse.json(
        { message: "Abstimmungs-ID und Text sind erforderlich." },
        { status: 400 }
      );
    }

    if (replyBody.length > 3000) {
      return NextResponse.json(
        { message: "Antwort darf maximal 3000 Zeichen lang sein." },
        { status: 400 }
      );
    }

    const polls = await getPollsCollection();
    const now = new Date();
    const replyId = new ObjectId();

    const result = await polls.updateOne(
      { _id: new ObjectId(pollId) },
      {
        $push: {
          replies: {
            _id: replyId,
            authorUsername: account.username,
            body: replyBody,
            createdAt: now,
          },
        } as Record<string, unknown>,
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Abstimmung nicht gefunden." },
        { status: 404 }
      );
    }

    const lesezeichen = await awardTreffpunktBeitrag(account.username).catch(() => 0);

    return NextResponse.json({
      reply: {
        id: replyId.toString(),
        authorUsername: account.username,
        body: replyBody,
        createdAt: now,
      },
      lesezeichen,
    });
  } catch {
    return NextResponse.json(
      { message: "Antwort konnte nicht erstellt werden." },
      { status: 500 }
    );
  }
}
