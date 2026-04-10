import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDiscussionReadsCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as { discussionId?: string };
    const discussionId = body.discussionId?.trim();

    if (!discussionId || !ObjectId.isValid(discussionId)) {
      return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
    }

    const col = await getDiscussionReadsCollection();
    await col.updateOne(
      { username: account.username, discussionId },
      { $set: { readAt: new Date() } },
      { upsert: true },
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "Fehler." }, { status: 500 });
  }
}
