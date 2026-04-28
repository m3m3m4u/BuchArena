import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getBuchzirkelTeilnahmenCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
    }

    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const teilnahmen = await getBuchzirkelTeilnahmenCollection();
    const teilnahme = await teilnahmen.findOne({
      buchzirkelId: new ObjectId(id),
      teilnehmerUsername: account.username,
    });

    return NextResponse.json({ teilnahme: teilnahme ?? null });
  } catch (err) {
    console.error("buchzirkel meine-teilnahme:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
