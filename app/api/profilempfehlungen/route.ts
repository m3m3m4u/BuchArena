import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase, getUsersCollection, getMessagesCollection, getMessageConversationsCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { awardProfilempfehlung, awardProfilempfehlungErhalten } from "@/lib/lesezeichen";

export type ProfileEmpfehlungDoc = {
  _id?: ObjectId;
  /** "lektor" | "sprecher" | "testleser" | "blogger" */
  profileType: string;
  /** Username des Profilinhabers */
  profileUsername: string;
  /** Username des Verfassers */
  username: string;
  text: string;
  createdAt: Date;
};

const VALID_TYPES = ["lektor", "sprecher", "testleser", "blogger"] as const;
type ProfileType = (typeof VALID_TYPES)[number];

const PROFILE_FIELD: Record<ProfileType, string> = {
  lektor: "lektorenProfile",
  sprecher: "speakerProfile",
  testleser: "testleserProfile",
  blogger: "bloggerProfile",
};

const PROFILE_LABEL: Record<ProfileType, string> = {
  lektor: "Lektor",
  sprecher: "Sprecher",
  testleser: "Testleser",
  blogger: "Blogger",
};

async function getCol() {
  const db = await getDatabase();
  return db.collection<ProfileEmpfehlungDoc>("profilempfehlungen");
}

/**
 * GET /api/profilempfehlungen?type=lektor&profileUsername=...
 */
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") as ProfileType | null;
  const profileUsername = req.nextUrl.searchParams.get("profileUsername");

  if (!type || !VALID_TYPES.includes(type) || !profileUsername) {
    return NextResponse.json({ message: "type und profileUsername sind erforderlich." }, { status: 400 });
  }

  try {
    const col = await getCol();
    const rows = await col
      .find({ profileType: type, profileUsername })
      .sort({ createdAt: -1 })
      .toArray();

    const usernames = [...new Set(rows.map((r) => r.username))];
    const users = await getUsersCollection();
    const userDocs = await users
      .find(
        { username: { $in: usernames } },
        { projection: { username: 1, profile: 1, speakerProfile: 1, bloggerProfile: 1, testleserProfile: 1, lektorenProfile: 1, displayName: 1 } },
      )
      .toArray();

    const nameMap = new Map<string, string>();
    for (const u of userDocs) {
      const name =
        u.displayName ||
        u.profile?.name?.value ||
        u.speakerProfile?.name?.value ||
        u.bloggerProfile?.name?.value ||
        u.testleserProfile?.name?.value ||
        u.lektorenProfile?.name?.value ||
        u.username;
      nameMap.set(u.username, name);
    }

    const empfehlungen = rows.map((r) => ({
      id: r._id!.toString(),
      username: r.username,
      displayName: nameMap.get(r.username) ?? r.username,
      text: r.text,
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json({ empfehlungen });
  } catch (err) {
    console.error("GET /api/profilempfehlungen error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}

/**
 * POST /api/profilempfehlungen
 */
export async function POST(req: NextRequest) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await req.json()) as { type?: string; profileUsername?: string; text?: string };
    const type = body.type?.trim() as ProfileType | undefined;
    const profileUsername = body.profileUsername?.trim();
    const text = body.text?.trim();

    if (!type || !VALID_TYPES.includes(type) || !profileUsername || !text) {
      return NextResponse.json({ message: "type, profileUsername und text sind erforderlich." }, { status: 400 });
    }

    if (text.length > 2000) {
      return NextResponse.json({ message: "Empfehlung darf max. 2000 Zeichen lang sein." }, { status: 400 });
    }

    // Eigenes Profil nicht empfehlen
    if (account.username === profileUsername) {
      return NextResponse.json({ message: "Du kannst dein eigenes Profil nicht empfehlen." }, { status: 400 });
    }

    // Profil prüfen
    const users = await getUsersCollection();
    const profileOwner = await users.findOne(
      { username: profileUsername, [PROFILE_FIELD[type]]: { $exists: true } },
      { projection: { username: 1, displayName: 1, [PROFILE_FIELD[type]]: 1 } },
    );
    if (!profileOwner) {
      return NextResponse.json({ message: "Profil nicht gefunden." }, { status: 404 });
    }

    // Prüfen ob bereits empfohlen
    const col = await getCol();
    const existing = await col.findOne({ profileType: type, profileUsername, username: account.username });
    if (existing) {
      return NextResponse.json({ message: "Du hast dieses Profil bereits empfohlen." }, { status: 409 });
    }

    // Empfehlung speichern
    await col.insertOne({
      profileType: type,
      profileUsername,
      username: account.username,
      text,
      createdAt: new Date(),
    });

    // Lesezeichen vergeben
    const pointsAwarded = await awardProfilempfehlung(account.username);
    await awardProfilempfehlungErhalten(profileUsername);

    // Nachricht an den Profilinhaber
    try {
      const empfehlerDoc = await users.findOne(
        { username: account.username },
        { projection: { displayName: 1, profile: 1, speakerProfile: 1, bloggerProfile: 1, testleserProfile: 1, lektorenProfile: 1 } },
      );
      const empfehlerName =
        empfehlerDoc?.displayName ||
        empfehlerDoc?.profile?.name?.value ||
        empfehlerDoc?.speakerProfile?.name?.value ||
        empfehlerDoc?.bloggerProfile?.name?.value ||
        empfehlerDoc?.testleserProfile?.name?.value ||
        empfehlerDoc?.lektorenProfile?.name?.value ||
        account.username;

      const label = PROFILE_LABEL[type];
      const messages = await getMessagesCollection();
      const msgDoc = {
        senderUsername: account.username,
        recipientUsername: profileUsername,
        subject: `Neue Empfehlung für dein ${label}-Profil`,
        body: `${empfehlerName} hat dein ${label}-Profil empfohlen:\n\n„${text.length > 300 ? text.slice(0, 300) + "…" : text}"`,
        read: false,
        deletedBySender: false,
        deletedByRecipient: false,
        createdAt: new Date(),
      };
      const insertResult = await messages.insertOne(msgDoc);
      await messages.updateOne({ _id: insertResult.insertedId }, { $set: { threadId: insertResult.insertedId } });
      const [convUserA, convUserB] = [account.username, profileUsername].sort();
      const convIsA = account.username === convUserA;
      const convCol = await getMessageConversationsCollection();
      await convCol.updateOne(
        { userA: convUserA, userB: convUserB },
        {
          $set: {
            latestMessageId: insertResult.insertedId,
            latestSender: account.username,
            latestRecipient: profileUsername,
            latestSubject: msgDoc.subject,
            latestBody: msgDoc.body,
            latestCreatedAt: msgDoc.createdAt,
            updatedAt: msgDoc.createdAt,
          },
          $inc: { [convIsA ? "unreadForB" : "unreadForA"]: 1 },
          $setOnInsert: {
            userA: convUserA,
            userB: convUserB,
            [convIsA ? "unreadForA" : "unreadForB"]: 0,
          },
        },
        { upsert: true },
      );
    } catch (msgErr) {
      console.error("Profil-Empfehlungs-Benachrichtigung fehlgeschlagen:", msgErr);
    }

    return NextResponse.json({
      message: "Empfehlung gespeichert!",
      pointsAwarded,
      lesezeichen: pointsAwarded ? 1 : 0,
    });
  } catch (err) {
    console.error("POST /api/profilempfehlungen error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}

/**
 * PUT /api/profilempfehlungen  – eigene Empfehlung bearbeiten
 */
export async function PUT(req: NextRequest) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await req.json()) as { id?: string; text?: string };
    const id = body.id?.trim();
    const text = body.text?.trim();

    if (!id || !text) {
      return NextResponse.json({ message: "id und text sind erforderlich." }, { status: 400 });
    }
    if (text.length > 2000) {
      return NextResponse.json({ message: "Empfehlung darf max. 2000 Zeichen lang sein." }, { status: 400 });
    }

    let objectId: ObjectId;
    try { objectId = new ObjectId(id); } catch {
      return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
    }

    const col = await getCol();
    const doc = await col.findOne({ _id: objectId });
    if (!doc) return NextResponse.json({ message: "Empfehlung nicht gefunden." }, { status: 404 });
    if (doc.username !== account.username) {
      return NextResponse.json({ message: "Du kannst nur eigene Empfehlungen bearbeiten." }, { status: 403 });
    }

    await col.updateOne({ _id: objectId }, { $set: { text } });
    return NextResponse.json({ message: "Empfehlung aktualisiert." });
  } catch (err) {
    console.error("PUT /api/profilempfehlungen error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}

/**
 * DELETE /api/profilempfehlungen?id=...
 */
export async function DELETE(req: NextRequest) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ message: "id fehlt." }, { status: 400 });

    let objectId: ObjectId;
    try { objectId = new ObjectId(id); } catch {
      return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
    }

    const col = await getCol();
    const doc = await col.findOne({ _id: objectId });
    if (!doc) return NextResponse.json({ message: "Empfehlung nicht gefunden." }, { status: 404 });

    // Verfasser oder Profilinhaber darf löschen
    if (doc.username !== account.username && doc.profileUsername !== account.username) {
      return NextResponse.json({ message: "Keine Berechtigung." }, { status: 403 });
    }

    await col.deleteOne({ _id: objectId });
    return NextResponse.json({ message: "Empfehlung gelöscht." });
  } catch (err) {
    console.error("DELETE /api/profilempfehlungen error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
