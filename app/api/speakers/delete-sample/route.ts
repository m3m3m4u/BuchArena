import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";

type DeleteSamplePayload = {
  username?: string;
  sampleId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DeleteSamplePayload;
    const username = body.username?.trim();
    const sampleId = body.sampleId?.trim();

    if (!username || !sampleId) {
      return NextResponse.json(
        { message: "Benutzername oder Sample-ID fehlt." },
        { status: 400 }
      );
    }

    const users = await getUsersCollection();

    const result = await users.updateOne(
      { username },
      { $pull: { "speakerProfile.sprechproben": { id: sampleId } } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Benutzer nicht gefunden." },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Sprechprobe gelöscht." });
  } catch {
    return NextResponse.json(
      { message: "Löschen fehlgeschlagen." },
      { status: 500 }
    );
  }
}
