import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { getMessagesCollection } from "@/lib/mongodb";

export async function GET(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folder = searchParams.get("folder") ?? "inbox";
    const threadId = searchParams.get("threadId");

    const messages = await getMessagesCollection();

    // Thread-Modus: alle Nachrichten eines Threads laden
    if (threadId && ObjectId.isValid(threadId)) {
      const docs = await messages
        .find({
          threadId: new ObjectId(threadId),
          $or: [
            { senderUsername: account.username, deletedBySender: { $ne: true } },
            { recipientUsername: account.username, deletedByRecipient: { $ne: true } },
          ],
        })
        .sort({ createdAt: 1 })
        .limit(500)
        .toArray();

      const items = docs.map((d) => ({
        id: d._id!.toHexString(),
        senderUsername: d.senderUsername,
        recipientUsername: d.recipientUsername,
        subject: d.subject,
        body: d.body,
        read: d.read,
        readAt: d.readAt?.toISOString() ?? null,
        threadId: d.threadId?.toHexString() ?? null,
        createdAt: d.createdAt.toISOString(),
      }));

      return NextResponse.json({ messages: items });
    }

    // Normale Liste (Posteingang / Gesendet)
    let filter: Record<string, unknown>;
    if (folder === "sent") {
      filter = { senderUsername: account.username, deletedBySender: { $ne: true } };
    } else {
      filter = { recipientUsername: account.username, deletedByRecipient: { $ne: true } };
    }

    const docs = await messages
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    // Threads gruppieren: für jeden Thread nur die neueste Nachricht anzeigen
    const threadMap = new Map<string, typeof docs[number]>();
    for (const d of docs) {
      const tid = d.threadId?.toHexString() ?? d._id!.toHexString();
      if (!threadMap.has(tid)) {
        threadMap.set(tid, d);
      }
    }

    // Für Inbox: ungelesene Anzahl pro Thread berechnen
    const threadDocs = [...threadMap.values()];
    const items = threadDocs.map((d) => {
      const tid = d.threadId?.toHexString() ?? d._id!.toHexString();
      // Zähle ungelesene Nachrichten in diesem Thread (nur für Inbox)
      const unreadInThread = folder === "inbox"
        ? docs.filter(
            (m) =>
              (m.threadId?.toHexString() ?? m._id!.toHexString()) === tid &&
              !m.read,
          ).length
        : 0;

      return {
        id: d._id!.toHexString(),
        senderUsername: d.senderUsername,
        recipientUsername: d.recipientUsername,
        subject: d.subject,
        body: d.body,
        read: d.read,
        readAt: d.readAt?.toISOString() ?? null,
        threadId: tid,
        unreadInThread,
        createdAt: d.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ messages: items });
  } catch (err) {
    console.error("GET /api/messages/list error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
