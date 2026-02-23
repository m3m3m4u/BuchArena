import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";

type UsersPayload = {
  requesterUsername?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UsersPayload;
    const requesterUsername = body.requesterUsername?.trim();

    if (!requesterUsername) {
      return NextResponse.json(
        { message: "Anfragender Benutzer fehlt." },
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
        { message: "Kein Zugriff auf die User-Übersicht." },
        { status: 403 }
      );
    }

    const list = await users
      .find({}, { projection: { _id: 0, username: 1, email: 1, role: 1, status: 1 } })
      .sort({ username: 1 })
      .toArray();

    return NextResponse.json({ users: list });
  } catch {
    return NextResponse.json(
      { message: "User-Übersicht konnte nicht geladen werden." },
      { status: 500 }
    );
  }
}
