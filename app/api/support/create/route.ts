import { NextResponse } from "next/server";
import { getSupportCollection } from "@/lib/mongodb";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      authorUsername?: string;
      title?: string;
      body?: string;
    };

    const authorUsername = body.authorUsername?.trim();
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

    const support = await getSupportCollection();

    const doc = {
      authorUsername,
      title,
      body: postBody,
      createdAt: new Date(),
    };

    const result = await support.insertOne(doc);

    return NextResponse.json({
      post: {
        id: result.insertedId.toString(),
        ...doc,
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Beitrag konnte nicht erstellt werden." },
      { status: 500 }
    );
  }
}
