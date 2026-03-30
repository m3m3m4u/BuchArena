import { NextResponse } from "next/server";
import { getPollsCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { ObjectId } from "mongodb";
import { awardAbstimmung } from "@/lib/lesezeichen";

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as {
      pollId?: string;
      optionIndex?: number;
    };

    if (!body.pollId || typeof body.optionIndex !== "number") {
      return NextResponse.json(
        { message: "Poll-ID und Option sind erforderlich." },
        { status: 400 }
      );
    }

    let oid: ObjectId;
    try {
      oid = new ObjectId(body.pollId);
    } catch {
      return NextResponse.json({ message: "Ungültige Poll-ID." }, { status: 400 });
    }

    const polls = await getPollsCollection();
    const poll = await polls.findOne({ _id: oid });

    if (!poll) {
      return NextResponse.json({ message: "Abstimmung nicht gefunden." }, { status: 404 });
    }

    if (body.optionIndex < 0 || body.optionIndex >= poll.options.length) {
      return NextResponse.json({ message: "Ungültige Option." }, { status: 400 });
    }

    // Check if user already voted
    const alreadyVoted = poll.votes.some((v) => v.username === account.username);
    if (alreadyVoted) {
      return NextResponse.json({ message: "Du hast bereits abgestimmt." }, { status: 409 });
    }

    await polls.updateOne(
      { _id: oid },
      {
        $push: {
          votes: {
            username: account.username,
            optionIndex: body.optionIndex,
            votedAt: new Date(),
          },
        },
      }
    );

    // Lesezeichen: Abstimmung
    const lesezeichen = await awardAbstimmung(account.username).catch(() => 0);

    return NextResponse.json({ ok: true, lesezeichen });
  } catch {
    return NextResponse.json(
      { message: "Stimme konnte nicht abgegeben werden." },
      { status: 500 }
    );
  }
}
