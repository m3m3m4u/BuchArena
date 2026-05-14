import { NextResponse } from "next/server";
import { getTauschCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { ObjectId } from "mongodb";

import type { TauschStatus } from "@/lib/discussions";

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as { id?: string; status?: string };
    const id = body.id?.trim();
    const newStatus = body.status?.trim() as TauschStatus | undefined;

    if (!id || !newStatus || !["offen", "reserviert", "abgeschlossen"].includes(newStatus)) {
      return NextResponse.json({ message: "Ungültige Anfrage." }, { status: 400 });
    }

    const col = await getTauschCollection();
    const doc = await col.findOne({ _id: new ObjectId(id) });

    if (!doc) {
      return NextResponse.json({ message: "Eintrag nicht gefunden." }, { status: 404 });
    }

    if (doc.authorUsername !== account.username && account.role !== "SUPERADMIN" && account.role !== "ADMIN") {
      return NextResponse.json({ message: "Keine Berechtigung." }, { status: 403 });
    }

    await col.updateOne({ _id: new ObjectId(id) }, { $set: { status: newStatus } });

    return NextResponse.json({ message: "Status aktualisiert." });
  } catch {
    return NextResponse.json({ message: "Status konnte nicht aktualisiert werden." }, { status: 500 });
  }
}
