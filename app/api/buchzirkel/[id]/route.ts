import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import {
  getBuchzirkelCollection,
  getBuchzirkelTeilnahmenCollection,
  getBuchzirkelBewerbungenCollection,
  getBuchzirkelBeitraegeCollection,
  getBuchzirkelChatCollection,
  getUsersCollection,
} from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { canAccessBuchzirkel } from "@/lib/buchzirkel-access";
import { davDelete } from "@/lib/bucharena-webdav";

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
    if (doc.veranstalterUsername !== account.username && account.role !== "SUPERADMIN" && account.role !== "ADMIN") {
      return NextResponse.json({ message: "Keine Berechtigung." }, { status: 403 });
    }

    const zirkelObjectId = new ObjectId(id);

    // Kaskadierendes Löschen aller zugehörigen Daten
    const [bewerbungenCol, teilnahmenCol, beitraegeCol, chatCol] = await Promise.all([
      getBuchzirkelBewerbungenCollection(),
      getBuchzirkelTeilnahmenCollection(),
      getBuchzirkelBeitraegeCollection(),
      getBuchzirkelChatCollection(),
    ]);

    await Promise.all([
      bewerbungenCol.deleteMany({ buchzirkelId: zirkelObjectId }).catch(() => {}),
      teilnahmenCol.deleteMany({ buchzirkelId: zirkelObjectId }).catch(() => {}),
      beitraegeCol.deleteMany({ buchzirkelId: zirkelObjectId }).catch(() => {}),
      chatCol.deleteMany({ buchzirkelId: zirkelObjectId }).catch(() => {}),
    ]);

    // WebDAV-Dateien bereinigen
    if (Array.isArray(doc.dateien)) {
      for (const d of doc.dateien) {
        if (d.webdavPath) {
          await davDelete(d.webdavPath).catch(() => {});
        }
      }
    }
    await davDelete(`buchzirkel/${id}`).catch(() => {});

    await collection.deleteOne({ _id: zirkelObjectId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("buchzirkel/[id] DELETE:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}

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
      isTeilnehmer = !!t && !t.abgebrochen;

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
      dateien: account && await canAccessBuchzirkel(doc, account.username) ? doc.dateien : [],
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
    if (doc.veranstalterUsername !== account.username && account.role !== "SUPERADMIN" && account.role !== "ADMIN") {
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
    if (typeof updates.bewerbungBis === "string" && updates.bewerbungBis) {
      const parsedDate = new Date(updates.bewerbungBis);
      if (!Number.isNaN(parsedDate.getTime())) {
        updates.bewerbungBis = parsedDate;
      }
    }

    await collection.updateOne({ _id: new ObjectId(id) }, { $set: updates });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("buchzirkel/[id] PATCH:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
