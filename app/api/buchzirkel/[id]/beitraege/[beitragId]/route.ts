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

async function checkZugang(zirkelId: string, username: string) {
  const zirkelCol = await getBuchzirkelCollection();
  const zirkel = await zirkelCol.findOne(
    { _id: new ObjectId(zirkelId) },
    { projection: { veranstalterUsername: 1 } }
  );
  if (!zirkel) return false;
  if (zirkel.veranstalterUsername === username) return true;
  const teilnahmen = await getBuchzirkelTeilnahmenCollection();
  const t = await teilnahmen.findOne({
    buchzirkelId: new ObjectId(zirkelId),
    teilnehmerUsername: username,
  });
  return !!t;
}

// PUT: Antwort auf einen Beitrag
export async function PUT(
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

    const hasAccess = await checkZugang(id, account.username);
    if (!hasAccess) return NextResponse.json({ message: "Kein Zugang." }, { status: 403 });

    const body = (await request.json()) as { body?: string };
    const replyBody = body.body?.trim();

    if (!replyBody) {
      return NextResponse.json({ message: "body ist erforderlich." }, { status: 400 });
    }
    if (replyBody.length > 2000) {
      return NextResponse.json({ message: "Antwort darf maximal 2000 Zeichen lang sein." }, { status: 400 });
    }

    const beitraege = await getBuchzirkelBeitraegeCollection();
    const beitrag = await beitraege.findOne({ _id: new ObjectId(beitragId) });
    if (!beitrag || beitrag.buchzirkelId.toString() !== id) {
      return NextResponse.json({ message: "Beitrag nicht gefunden." }, { status: 404 });
    }

    const now = new Date();
    await beitraege.updateOne(
      { _id: new ObjectId(beitragId) },
      {
        $push: {
          replies: {
            _id: new ObjectId(),
            autorUsername: account.username,
            body: replyBody,
            createdAt: now,
            reactions: [],
          },
        },
        $set: { lastActivityAt: now },
      }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("buchzirkel beitrag PUT reply:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}

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

// PATCH: Beitrag/Antwort bearbeiten oder im Treffpunkt teilen
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

    const beitraege = await getBuchzirkelBeitraegeCollection();
    const beitrag = await beitraege.findOne({ _id: new ObjectId(beitragId) });
    if (!beitrag || beitrag.buchzirkelId.toString() !== id) {
      return NextResponse.json({ message: "Beitrag nicht gefunden." }, { status: 404 });
    }

    const body = (await request.json()) as {
      action?: "edit-beitrag" | "edit-reply";
      teilen?: "treffpunkt" | "buchbeschreibung";
      body?: string;
      titel?: string;
      replyId?: string;
    };

    // Beitrag bearbeiten (nur eigener)
    if (body.action === "edit-beitrag") {
      if (beitrag.autorUsername !== account.username) {
        return NextResponse.json({ message: "Keine Berechtigung." }, { status: 403 });
      }
      const newBody = body.body?.trim();
      if (!newBody) return NextResponse.json({ message: "body ist erforderlich." }, { status: 400 });
      if (newBody.length > 5000) return NextResponse.json({ message: "Text zu lang." }, { status: 400 });

      await beitraege.updateOne(
        { _id: new ObjectId(beitragId) },
        { $set: { body: newBody, titel: body.titel?.trim() || undefined } }
      );
      return NextResponse.json({ ok: true });
    }

    // Antwort bearbeiten (nur eigene)
    if (body.action === "edit-reply") {
      const replyId = body.replyId;
      if (!replyId) return NextResponse.json({ message: "replyId erforderlich." }, { status: 400 });

      const reply = beitrag.replies.find(
        (r) => r._id?.toString() === replyId
      );
      if (!reply) return NextResponse.json({ message: "Antwort nicht gefunden." }, { status: 404 });
      if (reply.autorUsername !== account.username) {
        return NextResponse.json({ message: "Keine Berechtigung." }, { status: 403 });
      }

      const newBody = body.body?.trim();
      if (!newBody) return NextResponse.json({ message: "body ist erforderlich." }, { status: 400 });
      if (newBody.length > 2000) return NextResponse.json({ message: "Text zu lang." }, { status: 400 });

      await beitraege.updateOne(
        { _id: new ObjectId(beitragId), "replies._id": new ObjectId(replyId) },
        { $set: { "replies.$.body": newBody } }
      );
      return NextResponse.json({ ok: true });
    }

    // Teilen: Veranstalter-Check
    const { zirkel, isVeranstalter } = await getZirkelAndCheckVeranstalter(id, account.username);
    if (!zirkel) return NextResponse.json({ message: "Nicht gefunden." }, { status: 404 });
    if (!isVeranstalter && account.role !== "SUPERADMIN" && account.role !== "ADMIN") {
      return NextResponse.json({ message: "Nur der Veranstalter darf Beiträge teilen." }, { status: 403 });
    }

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
