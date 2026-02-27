import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { requireSuperAdmin } from "@/lib/server-auth";

export async function POST() {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json(
        { message: "Kein Zugriff auf die User-Übersicht." },
        { status: 403 }
      );
    }

    const users = await getUsersCollection();

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
