import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSupportCollection } from "@/lib/mongodb";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: string;
      authorUsername?: string;
    };

    const id = body.id?.trim();
    const authorUsername = body.authorUsername?.trim();

    if (!id || !ObjectId.isValid(id) || !authorUsername) {
      return NextResponse.json(
        { message: "ID und Benutzername sind erforderlich." },
        { status: 400 }
      );
    }

    const support = await getSupportCollection();

    const result = await support.deleteOne({
      _id: new ObjectId(id),
      authorUsername,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { message: "Beitrag nicht gefunden oder keine Berechtigung." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { message: "Beitrag konnte nicht gelöscht werden." },
      { status: 500 }
    );
  }
}
