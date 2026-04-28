import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import {
  getBuchzirkelCollection,
  getBuchzirkelBeitraegeCollection,
  getBuchzirkelTeilnahmenCollection,
} from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { ALLOWED_BEITRAG_EMOJIS } from "@/lib/buchzirkel";

async function checkZugang(
  zirkelId: string,
  username: string
): Promise<{ ok: boolean; isVeranstalter: boolean }> {
  const zirkelCol = await getBuchzirkelCollection();
  const zirkel = await zirkelCol.findOne(
    { _id: new ObjectId(zirkelId) },
    { projection: { veranstalterUsername: 1 } }
  );
  if (!zirkel) return { ok: false, isVeranstalter: false };

  if (zirkel.veranstalterUsername === username) {
    return { ok: true, isVeranstalter: true };
  }

  const teilnahmen = await getBuchzirkelTeilnahmenCollection();
  const t = await teilnahmen.findOne({
    buchzirkelId: new ObjectId(zirkelId),
    teilnehmerUsername: username,
  });
  return { ok: !!t, isVeranstalter: false };
}

// GET: Beiträge eines Topics
export async function GET(
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

    const { ok } = await checkZugang(id, account.username);
    if (!ok) {
      return NextResponse.json({ message: "Kein Zugang." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get("topicId");

    const beitraege = await getBuchzirkelBeitraegeCollection();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { buchzirkelId: new ObjectId(id) };
    if (topicId) filter.topicId = topicId;

    const docs = await beitraege
      .find(filter)
      .sort({ lastActivityAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({ beitraege: docs });
  } catch (err) {
    console.error("buchzirkel/[id]/beitraege GET:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}

// POST: Neuen Beitrag erstellen
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

    const { ok } = await checkZugang(id, account.username);
    if (!ok) {
      return NextResponse.json({ message: "Kein Zugang." }, { status: 403 });
    }

    const body = (await request.json()) as {
      topicId?: string;
      titel?: string;
      body?: string;
    };

    const topicId = body.topicId?.trim();
    const beitragBody = body.body?.trim();

    if (!topicId || !beitragBody) {
      return NextResponse.json({ message: "topicId und body sind erforderlich." }, { status: 400 });
    }

    if (beitragBody.length > 5000) {
      return NextResponse.json({ message: "Text darf maximal 5000 Zeichen lang sein." }, { status: 400 });
    }

    // Topic prüfen
    const zirkelCol = await getBuchzirkelCollection();
    const zirkel = await zirkelCol.findOne(
      { _id: new ObjectId(id) },
      { projection: { diskussionsTopics: 1 } }
    );
    const topicExists = zirkel?.diskussionsTopics.find((t) => t.id === topicId);
    if (!topicExists) {
      return NextResponse.json({ message: "Topic nicht gefunden." }, { status: 404 });
    }

    const now = new Date();
    const beitraege = await getBuchzirkelBeitraegeCollection();
    const result = await beitraege.insertOne({
      buchzirkelId: new ObjectId(id),
      topicId,
      autorUsername: account.username,
      titel: body.titel?.trim() || undefined,
      body: beitragBody,
      reactions: [],
      replies: [],
      imTreffpunktGeteilt: false,
      inBuchbeschreibungGeteilt: false,
      createdAt: now,
      lastActivityAt: now,
    });

    return NextResponse.json({ id: result.insertedId.toString() });
  } catch (err) {
    console.error("buchzirkel/[id]/beitraege POST:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
