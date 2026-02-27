import { NextResponse } from "next/server";
import { getDiscussionsCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

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
    };

    const authorUsername = account.username;
    const title = body.title?.trim();
    const postBody = body.body?.trim();

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
      replies: [],
      replyCount: 0,
      lastActivityAt: now,
      createdAt: now,
    };

    const result = await discussions.insertOne(doc);

    return NextResponse.json({
      discussion: {
        id: result.insertedId.toString(),
        ...doc,
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Diskussion konnte nicht erstellt werden." },
      { status: 500 }
    );
  }
}
