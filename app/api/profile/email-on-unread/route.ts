import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as { emailOnUnreadMessages?: boolean };
    const enabled = !!body.emailOnUnreadMessages;

    const users = await getUsersCollection();
    await users.updateOne(
      { username: account.username },
      { $set: { emailOnUnreadMessages: enabled } },
    );

    return NextResponse.json({ emailOnUnreadMessages: enabled });
  } catch {
    return NextResponse.json(
      { message: "Einstellung konnte nicht gespeichert werden." },
      { status: 500 },
    );
  }
}
