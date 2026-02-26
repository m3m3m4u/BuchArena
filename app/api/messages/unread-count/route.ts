import { NextResponse } from "next/server";
import { getServerAccount } from "@/lib/server-auth";
import { getMessagesCollection } from "@/lib/mongodb";

export async function GET() {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ count: 0 });
    }

    const messages = await getMessagesCollection();
    const count = await messages.countDocuments({
      recipientUsername: account.username,
      read: false,
      deletedByRecipient: { $ne: true },
    });

    return NextResponse.json({ count });
  } catch (err) {
    console.error("GET /api/messages/unread-count error:", err);
    return NextResponse.json({ count: 0 });
  }
}
