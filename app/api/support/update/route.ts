import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSupportCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as {
      id?: string;
      authorUsername?: string;
      title?: string;
      body?: string;
    };

    const id = body.id?.trim();
    const authorUsername = account.username;
    const title = body.title?.trim();
    const postBody = body.body?.trim();

    if (!id || !ObjectId.isValid(id) || !authorUsername || !title || !postBody) {
      return NextResponse.json(
        { message: "ID, Benutzername, Titel und Text sind erforderlich." },
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

    const result = await support.updateOne(
      { _id: new ObjectId(id), authorUsername },
      { $set: { title, body: postBody } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Beitrag nicht gefunden oder keine Berechtigung." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { message: "Beitrag konnte nicht aktualisiert werden." },
      { status: 500 }
    );
  }
}
