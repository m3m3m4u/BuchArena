import { NextResponse } from "next/server";
import { getPollsCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as {
      question?: string;
      options?: string[];
      genre?: string;
    };

    const question = body.question?.trim();
    const options = body.options?.map((o) => o.trim()).filter(Boolean);
    const genre = body.genre?.trim() || undefined;

    if (!question || !options || options.length < 2 || options.length > 10) {
      return NextResponse.json(
        { message: "Frage und mindestens 2 (max. 10) Optionen sind erforderlich." },
        { status: 400 }
      );
    }

    if (question.length > 300) {
      return NextResponse.json(
        { message: "Frage darf maximal 300 Zeichen lang sein." },
        { status: 400 }
      );
    }

    for (const opt of options) {
      if (opt.length > 100) {
        return NextResponse.json(
          { message: "Jede Option darf maximal 100 Zeichen lang sein." },
          { status: 400 }
        );
      }
    }

    const polls = await getPollsCollection();
    const now = new Date();

    const doc = {
      authorUsername: account.username,
      question,
      options,
      votes: [],
      replies: [],
      ...(genre ? { genre } : {}),
      createdAt: now,
    };

    const result = await polls.insertOne(doc);

    return NextResponse.json({ id: result.insertedId.toString() });
  } catch {
    return NextResponse.json(
      { message: "Abstimmung konnte nicht erstellt werden." },
      { status: 500 }
    );
  }
}
