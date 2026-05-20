import { NextResponse } from "next/server";
import { getMessagesCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

// POST /api/buchzirkel/einladung/ablehnen
// Eingeladener Benutzer lehnt die Einladung ab (Nachricht bleibt bestehen, keine Aktion).
export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as { buchzirkelId?: string };
    const buchzirkelId = body.buchzirkelId?.trim();
    if (!buchzirkelId) {
      return NextResponse.json({ message: "Ungültige Buchzirkel-ID." }, { status: 400 });
    }

    // Prüfe, ob eine gültige Einladung existiert
    const messagesCol = await getMessagesCollection();
    const einladung = await messagesCol.findOne({
      buchzirkelEinladungId: buchzirkelId,
      recipientUsername: account.username,
    });
    if (!einladung) {
      return NextResponse.json({ message: "Keine Einladung gefunden." }, { status: 404 });
    }

    // Ablehnen wird nur client-seitig festgehalten (kein DB-State nötig)
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("buchzirkel/einladung/ablehnen POST:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
