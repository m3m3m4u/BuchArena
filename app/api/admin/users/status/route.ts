import { NextResponse } from "next/server";
import { getUsersCollection, getBooksCollection, getSupportCollection } from "@/lib/mongodb";
import type { UserStatus } from "@/lib/mongodb";

type StatusPayload = {
  requesterUsername?: string;
  targetUsername?: string;
  action?: "activate" | "deactivate" | "delete";
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as StatusPayload;
    const requesterUsername = body.requesterUsername?.trim();
    const targetUsername = body.targetUsername?.trim();
    const action = body.action;

    if (!requesterUsername || !targetUsername || !action) {
      return NextResponse.json(
        { message: "Fehlende Parameter." },
        { status: 400 }
      );
    }

    const users = await getUsersCollection();

    const requester = await users.findOne(
      { username: requesterUsername },
      { projection: { role: 1 } }
    );

    if (!requester || requester.role !== "SUPERADMIN") {
      return NextResponse.json(
        { message: "Kein Zugriff." },
        { status: 403 }
      );
    }

    const target = await users.findOne(
      { username: targetUsername },
      { projection: { role: 1 } }
    );

    if (!target) {
      return NextResponse.json(
        { message: "Benutzer nicht gefunden." },
        { status: 404 }
      );
    }

    if (target.role === "SUPERADMIN") {
      return NextResponse.json(
        { message: "Das Admin-Konto kann nicht geändert werden." },
        { status: 403 }
      );
    }

    if (action === "delete") {
      await users.deleteOne({ username: targetUsername });

      const books = await getBooksCollection();
      await books.deleteMany({ ownerUsername: targetUsername });

      const support = await getSupportCollection();
      await support.deleteMany({ username: targetUsername });

      return NextResponse.json({
        message: `Benutzer „${targetUsername}" wurde gelöscht.`,
      });
    }

    const newStatus: UserStatus = action === "deactivate" ? "deactivated" : "active";
    await users.updateOne({ username: targetUsername }, { $set: { status: newStatus } });

    const label = newStatus === "deactivated" ? "deaktiviert" : "aktiviert";
    return NextResponse.json({
      message: `Benutzer „${targetUsername}" wurde ${label}.`,
    });
  } catch {
    return NextResponse.json(
      { message: "Aktion fehlgeschlagen." },
      { status: 500 }
    );
  }
}
