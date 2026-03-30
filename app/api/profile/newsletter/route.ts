import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as { newsletterOptIn?: boolean };
    const optIn = !!body.newsletterOptIn;

    const users = await getUsersCollection();
    await users.updateOne(
      { username: account.username },
      { $set: { newsletterOptIn: optIn } },
    );

    return NextResponse.json({ newsletterOptIn: optIn });
  } catch {
    return NextResponse.json(
      { message: "Newsletter-Einstellung konnte nicht gespeichert werden." },
      { status: 500 },
    );
  }
}
