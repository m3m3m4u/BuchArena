import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import {
  getBuchzirkelCollection,
  getBuchzirkelTeilnahmenCollection,
  getUsersCollection,
  getMessagesCollection,
  getMessageConversationsCollection,
} from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

// POST /api/buchzirkel/[id]/einladen
// Erlaubt dem Veranstalter, einen Benutzer direkt per In-App-Nachricht einzuladen.
export async function POST(
  request: Request,
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

    const body = (await request.json()) as { username?: string };
    const zielUsername = (body.username ?? "").trim();
    if (!zielUsername) {
      return NextResponse.json({ message: "Benutzername fehlt." }, { status: 400 });
    }

    // Buchzirkel laden
    const zirkelCol = await getBuchzirkelCollection();
    const zirkel = await zirkelCol.findOne({ _id: new ObjectId(id) });
    if (!zirkel) {
      return NextResponse.json({ message: "Buchzirkel nicht gefunden." }, { status: 404 });
    }

    // Nur der Veranstalter darf einladen
    if (zirkel.veranstalterUsername !== account.username) {
      return NextResponse.json({ message: "Keine Berechtigung." }, { status: 403 });
    }

    // Nur bei laufenden oder Bewerbungen suchenden Buchzirkeln
    if (zirkel.status !== "aktiv" && zirkel.status !== "bewerbung") {
      return NextResponse.json({ message: "Einladungen sind nur bei laufenden oder Bewerbungen-offenen Buchzirkeln möglich." }, { status: 400 });
    }

    // Sich selbst nicht einladen
    if (zielUsername === account.username) {
      return NextResponse.json({ message: "Du kannst dich nicht selbst einladen." }, { status: 400 });
    }

    // Ziel-Benutzer prüfen
    const users = await getUsersCollection();
    const zielUser = await users.findOne(
      { username: zielUsername, status: { $ne: "deactivated" } },
      { projection: { _id: 1, username: 1 } }
    );
    if (!zielUser) {
      return NextResponse.json({ message: "Benutzer nicht gefunden." }, { status: 404 });
    }

    // Bereits Teilnehmer?
    const teilnahmenCol = await getBuchzirkelTeilnahmenCollection();
    const bereitsTeils = await teilnahmenCol.findOne({
      buchzirkelId: new ObjectId(id),
      teilnehmerUsername: zielUsername,
    });
    if (bereitsTeils) {
      return NextResponse.json({ message: `${zielUsername} nimmt bereits teil.` }, { status: 400 });
    }

    // Maximale Teilnehmerzahl prüfen
    const aktuelleAnzahl = await teilnahmenCol.countDocuments({
      buchzirkelId: new ObjectId(id),
      abgebrochen: { $ne: true },
    });
    if (aktuelleAnzahl >= zirkel.maxTeilnehmer) {
      return NextResponse.json({ message: "Maximale Teilnehmerzahl bereits erreicht." }, { status: 400 });
    }

    // Bereits eine Einladung geschickt? (Prüfe vorhandene Nachricht)
    const messagesCol = await getMessagesCollection();
    const bereitsEingeladen = await messagesCol.findOne({
      buchzirkelEinladungId: id,
      recipientUsername: zielUsername,
      senderUsername: account.username,
    });
    if (bereitsEingeladen) {
      return NextResponse.json({ message: "Du hast diesem Benutzer bereits eine Einladung geschickt." }, { status: 400 });
    }

    // Nachricht senden
    const buchzirkelLink = `/buchzirkel/${id}`;
    const subject = `Einladung zum Buchzirkel: ${zirkel.titel}`;
    const msgBody = `Hallo ${zielUsername}!\n\n${account.username} lädt dich ein, am Buchzirkel „${zirkel.titel}" teilzunehmen.\n\n${buchzirkelLink}\n\nDu kannst die Einladung direkt hier annehmen oder ablehnen.`;

    const now = new Date();
    const insertResult = await messagesCol.insertOne({
      senderUsername: account.username,
      recipientUsername: zielUsername,
      subject,
      body: msgBody,
      read: false,
      buchzirkelEinladungId: id,
      deletedBySender: false,
      deletedByRecipient: false,
      createdAt: now,
    });
    await messagesCol.updateOne(
      { _id: insertResult.insertedId },
      { $set: { threadId: insertResult.insertedId } }
    );

    // messageConversations aktualisieren
    const [userA, userB] = [account.username, zielUsername].sort();
    const isA = account.username === userA;
    const convCol = await getMessageConversationsCollection();
    await convCol.updateOne(
      { userA, userB },
      {
        $set: {
          latestMessageId: insertResult.insertedId,
          latestSender: account.username,
          latestRecipient: zielUsername,
          latestSubject: subject,
          latestBody: msgBody,
          latestCreatedAt: now,
          updatedAt: now,
        },
        $inc: { [isA ? "unreadForB" : "unreadForA"]: 1 },
        $setOnInsert: {
          userA,
          userB,
          [isA ? "unreadForA" : "unreadForB"]: 0,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, message: `Einladung an ${zielUsername} wurde gesendet.` });
  } catch (err) {
    console.error("buchzirkel/[id]/einladen POST:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
