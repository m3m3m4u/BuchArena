import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getKalenderCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as { id?: string };

    if (!body.id || !ObjectId.isValid(body.id)) {
      return NextResponse.json({ message: "Ungültige Termin-ID." }, { status: 400 });
    }

    const col = await getKalenderCollection();
    const existing = await col.findOne({ _id: new ObjectId(body.id) });

    if (!existing) {
      return NextResponse.json({ message: "Termin nicht gefunden." }, { status: 404 });
    }

    const username = account.username;
    const alreadyJoined = existing.participants.includes(username);

    if (alreadyJoined) {
      // Leave
      await col.updateOne(
        { _id: new ObjectId(body.id) },
        { $pull: { participants: username } }
      );
    } else {
      // Join
      await col.updateOne(
        { _id: new ObjectId(body.id) },
        { $addToSet: { participants: username } }
      );
    }

    const updated = await col.findOne({ _id: new ObjectId(body.id) });

    return NextResponse.json({
      success: true,
      joined: !alreadyJoined,
      participants: updated?.participants ?? [],
      participantCount: updated?.participants.length ?? 0,
    });
  } catch (err) {
    console.error("Kalender join error:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
