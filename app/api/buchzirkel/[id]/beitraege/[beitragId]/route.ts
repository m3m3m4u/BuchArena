import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import {
  getBuchzirkelCollection,
  getBuchzirkelBeitraegeCollection,
  getBuchzirkelTeilnahmenCollection,
  getDiscussionsCollection,
} from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { ALLOWED_BEITRAG_EMOJIS } from "@/lib/buchzirkel";

async function getZirkelAndCheckVeranstalter(
  zirkelId: string,
  username: string
) {
  const zirkelCol = await getBuchzirkelCollection();
  const zirkel = await zirkelCol.findOne({ _id: new ObjectId(zirkelId) });
  if (!zirkel) return { zirkel: null, isVeranstalter: false };
  return { zirkel, isVeranstalter: zirkel.veranstalterUsername === username };
}

// POST: Reaktion hinzufügen/entfernen
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; beitragId: string }> }
) {
  try {
    const { id, beitragId } = await params;
    if (!ObjectId.isValid(id) || !ObjectId.isValid(beitragId)) {
      return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
    }

    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    // Zugang prüfen
    const zirkelCol = await getBuchzirkelCollection();
    const zirkel = await zirkelCol.findOne(
      { _id: new ObjectId(id) },
      { projection: { veranstalterUsername: 1 } }
    );
    if (!zirkel) return NextResponse.json({ message: "Nicht gefunden." }, { status: 404 });

    let hasAccess = zirkel.veranstalterUsername === account.username;
    if (!hasAccess) {
      const teilnahmen = await getBuchzirkelTeilnahmenCollection();
      const t = await teilnahmen.findOne({
        buchzirkelId: new ObjectId(id),
        teilnehmerUsername: account.username,
      });
      hasAccess = !!t;
    }
    if (!hasAccess) return NextResponse.json({ message: "Kein Zugang." }, { status: 403 });

    const body = (await request.json()) as { emoji?: string };
    const emoji = body.emoji;

    if (!emoji || !ALLOWED_BEITRAG_EMOJIS.includes(emoji)) {
      return NextResponse.json({ message: "Ungültiges Emoji." }, { status: 400 });
    }

    const beitraege = await getBuchzirkelBeitraegeCollection();
    const beitrag = await beitraege.findOne({ _id: new ObjectId(beitragId) });
    if (!beitrag || beitrag.buchzirkelId.toString() !== id) {
      return NextResponse.json({ message: "Beitrag nicht gefunden." }, { status: 404 });
    }

    const hat = beitrag.reactions.some(
      (r) => r.username === account.username && r.emoji === emoji
    );

    if (hat) {
      await beitraege.updateOne(
        { _id: new ObjectId(beitragId) },
        { $pull: { reactions: { username: account.username, emoji } } }
      );
    } else {
      await beitraege.updateOne(
        { _id: new ObjectId(beitragId) },
        { $push: { reactions: { username: account.username, emoji } } }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("buchzirkel beitrag react:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}

// PATCH: Beitrag im Treffpunkt oder Buchbeschreibung teilen (nur Veranstalter)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; beitragId: string }> }
) {
  try {
    const { id, beitragId } = await params;
    if (!ObjectId.isValid(id) || !ObjectId.isValid(beitragId)) {
      return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
    }

    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const { zirkel, isVeranstalter } = await getZirkelAndCheckVeranstalter(id, account.username);
    if (!zirkel) return NextResponse.json({ message: "Nicht gefunden." }, { status: 404 });
    if (!isVeranstalter && account.role !== "SUPERADMIN") {
      return NextResponse.json({ message: "Nur der Veranstalter darf Beiträge teilen." }, { status: 403 });
    }

    const beitraege = await getBuchzirkelBeitraegeCollection();
    const beitrag = await beitraege.findOne({ _id: new ObjectId(beitragId) });
    if (!beitrag || beitrag.buchzirkelId.toString() !== id) {
      return NextResponse.json({ message: "Beitrag nicht gefunden." }, { status: 404 });
    }

    const body = (await request.json()) as {
      teilen?: "treffpunkt" | "buchbeschreibung";
    };

    if (body.teilen === "treffpunkt" && !beitrag.imTreffpunktGeteilt) {
      // Automatisch Diskussion im Treffpunkt erstellen
      const discussions = await getDiscussionsCollection();
      const discussionResult = await discussions.insertOne({
        authorUsername: account.username,
        title: `💬 Buchzirkel-Highlight: ${zirkel.titel}`,
        body: `${beitrag.titel ? `**${beitrag.titel}**\n\n` : ""}${beitrag.body}\n\n*Geteilt aus dem Buchzirkel „${zirkel.titel}"*`,
        topic: "Allgemein",
        replies: [],
        replyCount: 0,
        lastActivityAt: new Date(),
        createdAt: new Date(),
        reactions: [],
      });

      await beitraege.updateOne(
        { _id: new ObjectId(beitragId) },
        {
          $set: {
            imTreffpunktGeteilt: true,
            treffpunktDiscussionId: discussionResult.insertedId,
          },
        }
      );
      return NextResponse.json({ ok: true, discussionId: discussionResult.insertedId.toString() });
    }

    if (body.teilen === "buchbeschreibung") {
      await beitraege.updateOne(
        { _id: new ObjectId(beitragId) },
        { $set: { inBuchbeschreibungGeteilt: !beitrag.inBuchbeschreibungGeteilt } }
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ message: "Ungültige Aktion." }, { status: 400 });
  } catch (err) {
    console.error("buchzirkel beitrag PATCH:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
