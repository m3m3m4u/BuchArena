import { NextResponse } from "next/server";
import { getTauschCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { ObjectId } from "mongodb";

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as { id?: string };
    const id = body.id?.trim();

    if (!id) {
      return NextResponse.json({ message: "ID fehlt." }, { status: 400 });
    }

    const col = await getTauschCollection();
    const doc = await col.findOne({ _id: new ObjectId(id) });

    if (!doc) {
      return NextResponse.json({ message: "Eintrag nicht gefunden." }, { status: 404 });
    }

    if (doc.authorUsername !== account.username && account.role !== "SUPERADMIN") {
      return NextResponse.json({ message: "Keine Berechtigung." }, { status: 403 });
    }

    await col.deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ message: "Eintrag gelöscht." });
  } catch {
    return NextResponse.json({ message: "Eintrag konnte nicht gelöscht werden." }, { status: 500 });
  }
}
