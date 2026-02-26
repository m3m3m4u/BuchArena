import { NextResponse } from "next/server";
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

    const messages = await getMessagesCollection();

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

    const items = docs.map((d) => ({
      id: d._id!.toHexString(),
      senderUsername: d.senderUsername,
      recipientUsername: d.recipientUsername,
      subject: d.subject,
      body: d.body,
      read: d.read,
      createdAt: d.createdAt.toISOString(),
    }));

    return NextResponse.json({ messages: items });
  } catch (err) {
    console.error("GET /api/messages/list error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
