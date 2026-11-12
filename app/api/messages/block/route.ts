import { NextRequest, NextResponse } from "next/server";
import { getServerAccount } from "@/lib/server-auth";
import { getUsersCollection } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const target = req.nextUrl.searchParams.get("target")?.trim();
    if (!target) {
      return NextResponse.json({ isBlocked: false });
    }

    const users = await getUsersCollection();
    const user = await users.findOne(
      { username: account.username },
      { projection: { blockedUsers: 1 } }
    );

    const isBlocked = !!user?.blockedUsers?.includes(target);
    return NextResponse.json({ isBlocked });
  } catch (err) {
    console.error("GET /api/messages/block error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await req.json()) as {
      targetUsername?: string;
      action?: "block" | "unblock";
    };

    const targetUsername = body.targetUsername?.trim();
    const action = body.action ?? "block";

    if (!targetUsername) {
      return NextResponse.json({ message: "Ziel-Benutzer fehlt." }, { status: 400 });
    }

    if (targetUsername === account.username) {
      return NextResponse.json({ message: "Du kannst dich nicht selbst blockieren." }, { status: 400 });
    }

    const users = await getUsersCollection();
    const target = await users.findOne({ username: targetUsername }, { projection: { role: 1 } });
    if (!target) {
      return NextResponse.json({ message: "Benutzer nicht gefunden." }, { status: 404 });
    }

    if (action === "block" && (target.role === "SUPERADMIN" || target.role === "ADMIN")) {
      return NextResponse.json(
        { message: "Admins können nicht blockiert werden." },
        { status: 400 }
      );
    }

    if (action === "block") {
      await users.updateOne(
        { username: account.username },
        { $addToSet: { blockedUsers: targetUsername } }
      );
      return NextResponse.json({
        message: `Benutzer „${targetUsername}“ wurde blockiert. Er kann dir keine Nachrichten mehr senden.`,
        isBlocked: true,
      });
    } else {
      await users.updateOne(
        { username: account.username },
        { $pull: { blockedUsers: targetUsername } }
      );
      return NextResponse.json({
        message: `Blockierung für „${targetUsername}“ wurde aufgehoben.`,
        isBlocked: false,
      });
    }
  } catch (err) {
    console.error("POST /api/messages/block error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
