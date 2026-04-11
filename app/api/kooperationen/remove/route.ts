import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { getKooperationenCollection } from "@/lib/mongodb";

/** DELETE /api/kooperationen/remove – Kooperation entfernen (von beiden Seiten möglich) */
export async function DELETE(req: NextRequest) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get("id")?.trim() ?? "";

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
    }

    const kooperationen = await getKooperationenCollection();
    const doc = await kooperationen.findOne({ _id: new ObjectId(id) });

    if (!doc) {
      return NextResponse.json({ message: "Kooperation nicht gefunden." }, { status: 404 });
    }

    // Nur Requester oder Partner dürfen löschen
    if (doc.requesterUsername !== account.username && doc.partnerUsername !== account.username) {
      return NextResponse.json({ message: "Nicht berechtigt." }, { status: 403 });
    }

    await kooperationen.deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ message: "Kooperation entfernt." });
  } catch (err) {
    console.error("DELETE /api/kooperationen/remove error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
