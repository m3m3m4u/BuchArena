import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { getKooperationenCollection } from "@/lib/mongodb";

/** POST /api/kooperationen/confirm – Partner bestätigt eine Kooperation */
export async function POST(req: NextRequest) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = await req.json();
    const id = (body.id ?? "").trim();

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
    }

    const kooperationen = await getKooperationenCollection();
    const doc = await kooperationen.findOne({ _id: new ObjectId(id) });

    if (!doc) {
      return NextResponse.json({ message: "Kooperation nicht gefunden." }, { status: 404 });
    }

    // Nur der Partner darf bestätigen
    if (doc.partnerUsername !== account.username) {
      return NextResponse.json({ message: "Du bist nicht berechtigt, diese Kooperation zu bestätigen." }, { status: 403 });
    }

    if (doc.status === "confirmed") {
      return NextResponse.json({ message: "Bereits bestätigt." });
    }

    await kooperationen.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: "confirmed", confirmedAt: new Date() } },
    );

    return NextResponse.json({ message: "Kooperation bestätigt!" });
  } catch (err) {
    console.error("POST /api/kooperationen/confirm error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
