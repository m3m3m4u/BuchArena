import { NextResponse } from "next/server";
import { getDiscussionsCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { awardTreffpunktBeitrag } from "@/lib/lesezeichen";
import { DISCUSSION_TOPICS, type DiscussionTopic } from "@/lib/discussions";

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as {
      authorUsername?: string;
      title?: string;
      body?: string;
      topic?: string;
    };

    const authorUsername = account.username;
    const title = body.title?.trim();
    const postBody = body.body?.trim();
    const topic = (body.topic?.trim() || "Allgemein") as DiscussionTopic;

    if (!authorUsername || !title || !postBody) {
      return NextResponse.json(
        { message: "Benutzername, Titel und Text sind erforderlich." },
        { status: 400 }
      );
    }

    if (!(DISCUSSION_TOPICS as readonly string[]).includes(topic)) {
      return NextResponse.json(
        { message: "Ungültiges Thema." },
        { status: 400 }
      );
    }

    if (!authorUsername || !title || !postBody) {
      return NextResponse.json(
        { message: "Benutzername, Titel und Text sind erforderlich." },
        { status: 400 }
      );
    }

    if (title.length > 200) {
      return NextResponse.json(
        { message: "Titel darf maximal 200 Zeichen lang sein." },
        { status: 400 }
      );
    }

    if (postBody.length > 5000) {
      return NextResponse.json(
        { message: "Text darf maximal 5000 Zeichen lang sein." },
        { status: 400 }
      );
    }

    const discussions = await getDiscussionsCollection();
    const now = new Date();

    const doc = {
      authorUsername,
      title,
      body: postBody,
      topic,
      replies: [],
      replyCount: 0,
      lastActivityAt: now,
      createdAt: now,
    };

    const result = await discussions.insertOne(doc);

    // Lesezeichen: Treffpunkt-Beitrag
    const lesezeichen = await awardTreffpunktBeitrag(authorUsername).catch(() => 0);

    return NextResponse.json({
      discussion: {
        id: result.insertedId.toString(),
        ...doc,
      },
      lesezeichen,
    });
  } catch {
    return NextResponse.json(
      { message: "Diskussion konnte nicht erstellt werden." },
      { status: 500 }
    );
  }
}
