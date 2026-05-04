export async function DELETE(
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

    const collection = await getBuchzirkelCollection();
    const doc = await collection.findOne({ _id: new ObjectId(id) });
    if (!doc) {
      return NextResponse.json({ message: "Nicht gefunden." }, { status: 404 });
    }
    if (doc.veranstalterUsername !== account.username && account.role !== "SUPERADMIN") {
      return NextResponse.json({ message: "Keine Berechtigung." }, { status: 403 });
    }

    await collection.deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("buchzirkel/[id] DELETE:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import {
  getBuchzirkelCollection,
  getBuchzirkelTeilnahmenCollection,
  getBuchzirkelBewerbungenCollection,
  getUsersCollection,
} from "@/lib/mongodb";
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
    const collection = await getBuchzirkelCollection();
    const doc = await collection.findOne({ _id: new ObjectId(id) });

    if (!doc) {
      return NextResponse.json({ message: "Buchzirkel nicht gefunden." }, { status: 404 });
    }

    // Dateien nur für Teilnehmer und Veranstalter
    const isVeranstalter = account?.username === doc.veranstalterUsername;
    let isTeilnehmer = false;
    let isBeworben = false;

    if (account && !isVeranstalter) {
      const teilnahmen = await getBuchzirkelTeilnahmenCollection();
      const t = await teilnahmen.findOne({
        buchzirkelId: new ObjectId(id),
        teilnehmerUsername: account.username,
      });
      isTeilnehmer = !!t;

      if (!isTeilnehmer) {
        const bewerbungen = await getBuchzirkelBewerbungenCollection();
        const b = await bewerbungen.findOne({
          buchzirkelId: new ObjectId(id),
          bewerberUsername: account.username,
        });
        isBeworben = !!b;
      }
    }

    // Testleserprofil des aktuellen Nutzers prüfen
    let viewerHasTestleserProfile = false;
    if (account) {
      const users = await getUsersCollection();
      const userDoc = await users.findOne(
        { username: account.username },
        { projection: { "testleserProfile.name": 1 } }
      );
      const name = (userDoc?.testleserProfile as Record<string, unknown> | undefined)?.name as { value?: string } | undefined;
      viewerHasTestleserProfile = !!(name?.value?.trim());
    }

    const result = {
      ...doc,
      // Dateien nur sichtbar für Veranstalter und Teilnehmer
      dateien: isVeranstalter || isTeilnehmer ? doc.dateien : [],
      isVeranstalter,
      isTeilnehmer,
      isBeworben,
      viewerHasTestleserProfile,
    };

    return NextResponse.json({ zirkel: result });
  } catch (err) {
    console.error("buchzirkel/[id] GET:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}

export async function PATCH(
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

    const collection = await getBuchzirkelCollection();
    const doc = await collection.findOne(
      { _id: new ObjectId(id) },
      { projection: { veranstalterUsername: 1 } }
    );

    if (!doc) {
      return NextResponse.json({ message: "Buchzirkel nicht gefunden." }, { status: 404 });
    }
    if (doc.veranstalterUsername !== account.username && account.role !== "SUPERADMIN") {
      return NextResponse.json({ message: "Keine Berechtigung." }, { status: 403 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    // Erlaubte Felder
    const allowed = [
      "titel", "beschreibung", "coverImageUrl", "youtubeUrl", "mediaImageUrl", "genre", "buchformateAngebot", "status",
      "bewerbungBis", "maxTeilnehmer", "bewerbungsFragen", "genreFilter",
      "agbPflicht", "agbText", "leseabschnitte", "diskussionsTopics", "fragebogen", "erwartungenAnTestleser",
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = { updatedAt: new Date() };
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    await collection.updateOne({ _id: new ObjectId(id) }, { $set: updates });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("buchzirkel/[id] PATCH:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
