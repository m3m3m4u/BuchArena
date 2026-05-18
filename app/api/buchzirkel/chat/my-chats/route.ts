import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import {
  getBuchzirkelCollection,
  getBuchzirkelTeilnahmenCollection,
  getBuchzirkelChatCollection,
} from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

// GET: Alle aktiven Buchzirkel-Gruppen-Chats für den aktuellen Benutzer
export async function GET() {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const me = account.username;
    const zirkelCol = await getBuchzirkelCollection();
    const teilnahmenCol = await getBuchzirkelTeilnahmenCollection();

    // Zirkel als Veranstalter
    const [veranstalterZirkel, teilnahmen] = await Promise.all([
      zirkelCol
        .find({ veranstalterUsername: me }, { projection: { _id: 1, titel: 1, coverImageUrl: 1 } })
        .toArray(),
      teilnahmenCol
        .find({ teilnehmerUsername: me }, { projection: { buchzirkelId: 1 } })
        .toArray(),
    ]);

    // Zirkel als Teilnehmer (aktive)
    const teilnehmerZirkelIds = teilnahmen.map((t) => t.buchzirkelId);
    const teilnehmerZirkel =
      teilnehmerZirkelIds.length > 0
        ? await zirkelCol
            .find(
              { _id: { $in: teilnehmerZirkelIds } },
              { projection: { _id: 1, titel: 1, coverImageUrl: 1 } }
            )
            .toArray()
        : [];

    // Alle aktiven Zirkel (dedupliziert)
    const allZirkelMap = new Map<string, { _id: ObjectId; titel: string; coverImageUrl?: string }>();
    for (const z of [...veranstalterZirkel, ...teilnehmerZirkel]) {
      allZirkelMap.set(z._id!.toHexString(), z as { _id: ObjectId; titel: string; coverImageUrl?: string });
    }
    const allZirkel = Array.from(allZirkelMap.values());

    if (allZirkel.length === 0) {
      return NextResponse.json({ chats: [] });
    }

    const zirkelIds = allZirkel.map((z) => z._id!);
    const chatCol = await getBuchzirkelChatCollection();

    // Für jeden Zirkel: letzte Nachricht + ungelesene Anzahl
    const [lastMessages, unreadCounts] = await Promise.all([
      // Letzte Nachricht pro Zirkel (aggregation)
      chatCol
        .aggregate<{ _id: ObjectId; lastMsg: { _id: ObjectId; senderUsername: string; body: string; createdAt: Date; readBy: string[] } }>([
          { $match: { buchzirkelId: { $in: zirkelIds } } },
          { $sort: { _id: -1 } },
          {
            $group: {
              _id: "$buchzirkelId",
              lastMsg: { $first: "$$ROOT" },
            },
          },
        ])
        .toArray(),
      // Ungelesene pro Zirkel
      chatCol
        .aggregate<{ _id: ObjectId; count: number }>([
          {
            $match: {
              buchzirkelId: { $in: zirkelIds },
              readBy: { $ne: me },
            },
          },
          { $group: { _id: "$buchzirkelId", count: { $sum: 1 } } },
        ])
        .toArray(),
    ]);

    const lastMsgMap = new Map(lastMessages.map((r) => [r._id.toHexString(), r.lastMsg]));
    const unreadMap = new Map(unreadCounts.map((r) => [r._id.toHexString(), r.count]));

    const chats = allZirkel.map((z) => {
      const zId = z._id!.toHexString();
      const last = lastMsgMap.get(zId);
      return {
        buchzirkelId: zId,
        titel: z.titel,
        coverImageUrl: z.coverImageUrl ?? null,
        lastMessage: last
          ? {
              id: last._id.toHexString(),
              senderUsername: last.senderUsername,
              body: last.body,
              createdAt: last.createdAt.toISOString(),
            }
          : null,
        unreadCount: unreadMap.get(zId) ?? 0,
      };
    });

    // Nach letzter Aktivität sortieren (neueste zuerst, Zirkel ohne Nachrichten ans Ende)
    chats.sort((a, b) => {
      if (!a.lastMessage && !b.lastMessage) return 0;
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
    });

    return NextResponse.json({ chats });
  } catch (err) {
    console.error("buchzirkel/chat/my-chats GET:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
