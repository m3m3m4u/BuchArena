import { NextRequest, NextResponse } from "next/server";
import { getServerAccount } from "@/lib/server-auth";
import { getUsersCollection, getKooperationenCollection, getMessagesCollection } from "@/lib/mongodb";
import { ROLLE_LABELS, type KooperationsRolle } from "@/lib/kooperationen";
import { checkRateLimit } from "@/lib/rate-limit";

const VALID_ROLES: KooperationsRolle[] = ["autor", "sprecher", "blogger", "testleser", "lektor", "verlag"];

/** Prüft, ob ein User die angegebene Rolle tatsächlich hat (Profil existiert). */
function hasRole(user: Record<string, unknown>, role: KooperationsRolle): boolean {
  switch (role) {
    case "autor": return !!user.profile;
    case "sprecher": return !!user.speakerProfile;
    case "blogger": return !!user.bloggerProfile;
    case "testleser": return !!user.testleserProfile;
    case "lektor": return !!user.lektorenProfile;
    case "verlag": return !!user.verlageProfile;
    default: return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    if (!checkRateLimit(`kooperation-request:${account.username}`, 20, 60 * 1000)) {
      return NextResponse.json({ message: "Zu viele Anfragen." }, { status: 429 });
    }

    const body = await req.json();
    const partnerUsername = (body.partnerUsername ?? "").trim();
    const myRole = (body.myRole ?? "") as KooperationsRolle;
    const partnerRole = (body.partnerRole ?? "") as KooperationsRolle;

    if (!partnerUsername || !VALID_ROLES.includes(myRole) || !VALID_ROLES.includes(partnerRole)) {
      return NextResponse.json({ message: "Ungültige Parameter." }, { status: 400 });
    }

    if (partnerUsername === account.username && account.role !== "SUPERADMIN") {
      return NextResponse.json({ message: "Du kannst dich nicht selbst als Partner angeben." }, { status: 400 });
    }

    const users = await getUsersCollection();

    // Prüfe ob Partner aktiv ist und die angegebene Rolle hat
    const partner = await users.findOne(
      { username: partnerUsername, $or: [{ status: { $exists: false } }, { status: "active" }] },
      { projection: { username: 1, profile: 1, speakerProfile: 1, bloggerProfile: 1, testleserProfile: 1, lektorenProfile: 1, verlageProfile: 1, displayName: 1 } },
    );
    if (!partner) {
      return NextResponse.json({ message: "Partner nicht gefunden." }, { status: 404 });
    }

    if (!hasRole(partner as unknown as Record<string, unknown>, partnerRole)) {
      return NextResponse.json({ message: `${partnerUsername} hat kein ${ROLLE_LABELS[partnerRole]}-Profil.` }, { status: 400 });
    }

    // Prüfe eigene Rolle
    const me = await users.findOne(
      { username: account.username },
      { projection: { profile: 1, speakerProfile: 1, bloggerProfile: 1, testleserProfile: 1, lektorenProfile: 1, verlageProfile: 1 } },
    );
    if (!me || !hasRole(me as unknown as Record<string, unknown>, myRole)) {
      return NextResponse.json({ message: `Du hast kein ${ROLLE_LABELS[myRole]}-Profil.` }, { status: 400 });
    }

    const kooperationen = await getKooperationenCollection();

    // Prüfe ob Kooperation bereits existiert (in beide Richtungen)
    const existing = await kooperationen.findOne({
      $or: [
        { requesterUsername: account.username, partnerUsername, requesterRole: myRole, partnerRole },
        { requesterUsername: partnerUsername, partnerUsername: account.username, requesterRole: partnerRole, partnerRole: myRole },
      ],
    });

    if (existing) {
      return NextResponse.json({ message: "Kooperation wurde bereits angefragt oder bestätigt." }, { status: 409 });
    }

    const koopResult = await kooperationen.insertOne({
      requesterUsername: account.username,
      requesterRole: myRole,
      partnerUsername,
      partnerRole,
      status: "pending",
      createdAt: new Date(),
    });

    // Interne Nachricht an den Partner senden
    const messages = await getMessagesCollection();
    const myDisplayName = me.profile?.name?.value || account.username;
    const koopId = koopResult.insertedId.toString();
    const subject = `Kooperationsanfrage von ${myDisplayName}`;
    const msgBody = `Hallo!\n\n${myDisplayName} (${ROLLE_LABELS[myRole]}) möchte dich als ${ROLLE_LABELS[partnerRole]} als Kooperationspartner angeben.\n\nDu kannst die Anfrage direkt hier bestätigen oder ablehnen.\n\nTipp: Unter „Profil → Partner" kannst du selbst Kooperationspartner hinzufügen und alle deine Kooperationen verwalten.`;

    const insertResult = await messages.insertOne({
      senderUsername: account.username,
      recipientUsername: partnerUsername,
      subject,
      body: msgBody,
      read: false,
      kooperationId: koopId,
      deletedBySender: false,
      deletedByRecipient: false,
      createdAt: new Date(),
    });
    await messages.updateOne(
      { _id: insertResult.insertedId },
      { $set: { threadId: insertResult.insertedId } },
    );

    return NextResponse.json({ message: "Kooperationsanfrage gesendet!" });
  } catch (err) {
    console.error("POST /api/kooperationen/request error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
