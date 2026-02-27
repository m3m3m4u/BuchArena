import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

type DeleteSamplePayload = {
  username?: string;
  sampleId?: string;
};

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as DeleteSamplePayload;
    const username = account.username;
    const sampleId = body.sampleId?.trim();

    if (!sampleId) {
      return NextResponse.json(
        { message: "Sample-ID fehlt." },
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
