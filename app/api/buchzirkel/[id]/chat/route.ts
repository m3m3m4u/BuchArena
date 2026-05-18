import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import {
  getBuchzirkelCollection,
  getBuchzirkelTeilnahmenCollection,
  getBuchzirkelChatCollection,
} from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

async function checkZugang(
  zirkelId: string,
  username: string
): Promise<{ ok: boolean; zirkelTitel: string | null; veranstalterUsername: string | null }> {
  const zirkelCol = await getBuchzirkelCollection();
  const zirkel = await zirkelCol.findOne(
    { _id: new ObjectId(zirkelId) },
    { projection: { veranstalterUsername: 1, titel: 1, status: 1 } }
  );
  if (!zirkel) return { ok: false, zirkelTitel: null, veranstalterUsername: null };

  if (zirkel.veranstalterUsername === username) {
    return { ok: true, zirkelTitel: zirkel.titel, veranstalterUsername: zirkel.veranstalterUsername };
  }

  const teilnahmen = await getBuchzirkelTeilnahmenCollection();
  const t = await teilnahmen.findOne({
    buchzirkelId: new ObjectId(zirkelId),
    teilnehmerUsername: username,
  });
  return {
    ok: !!t,
    zirkelTitel: zirkel.titel,
    veranstalterUsername: zirkel.veranstalterUsername,
  };
}

// GET: Chat-Nachrichten laden
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
    const before = searchParams.get("before"); // ObjectId für Pagination

    const chat = await getBuchzirkelChatCollection();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { buchzirkelId: new ObjectId(id) };
    if (before && ObjectId.isValid(before)) {
      filter._id = { $lt: new ObjectId(before) };
    }

    const docs = await chat
      .find(filter)
      .sort({ _id: -1 })
      .limit(50)
      .toArray();

    const messages = docs.reverse().map((d) => ({
      id: d._id!.toHexString(),
      senderUsername: d.senderUsername,
      body: d.body,
      createdAt: d.createdAt.toISOString(),
      isRead: d.readBy.includes(account.username),
    }));

    // Alle geladenen als gelesen markieren (fire-and-forget, nicht blockierend)
    const unreadIds = docs
      .filter((d) => !d.readBy.includes(account.username))
      .map((d) => d._id!);
    if (unreadIds.length > 0) {
      chat
        .updateMany(
          { _id: { $in: unreadIds } },
          { $addToSet: { readBy: account.username } }
        )
        .catch(() => {});
    }

    return NextResponse.json({ messages });
  } catch (err) {
    console.error("buchzirkel/[id]/chat GET:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}

// POST: Neue Chat-Nachricht senden
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

    const body = await request.json() as { body?: string };
    const text = (body.body ?? "").trim();
    if (!text) {
      return NextResponse.json({ message: "Nachricht fehlt." }, { status: 400 });
    }
    if (text.length > 2000) {
      return NextResponse.json({ message: "Nachricht zu lang (max. 2000 Zeichen)." }, { status: 400 });
    }

    const chat = await getBuchzirkelChatCollection();
    const now = new Date();
    const result = await chat.insertOne({
      buchzirkelId: new ObjectId(id),
      senderUsername: account.username,
      body: text,
      createdAt: now,
      readBy: [account.username],
    });

    return NextResponse.json({
      message: {
        id: result.insertedId.toHexString(),
        senderUsername: account.username,
        body: text,
        createdAt: now.toISOString(),
        isRead: true,
      },
    });
  } catch (err) {
    console.error("buchzirkel/[id]/chat POST:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
