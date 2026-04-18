import { NextRequest, NextResponse } from "next/server";
import { getSocialMediaPixabayUploaderBlacklistCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

function isAdmin(role?: string) {
  return role === "ADMIN" || role === "SUPERADMIN";
}

export async function GET() {
  const account = await getServerAccount();
  if (!account || !isAdmin(account.role)) {
    return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
  }

  const collection = await getSocialMediaPixabayUploaderBlacklistCollection();
  const entries = await collection.find({}).sort({ createdAt: -1 }).toArray();
  return NextResponse.json(entries.map((entry) => ({
    id: entry._id?.toString(),
    userId: entry.userId,
    uploaderName: entry.uploaderName ?? null,
    reason: entry.reason,
    createdAt: entry.createdAt,
    createdBy: entry.createdBy,
  })));
}

export async function POST(req: NextRequest) {
  const account = await getServerAccount();
  if (!account || !isAdmin(account.role)) {
    return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
  }

  const body = await req.json() as { userId?: number; uploaderName?: string; reason?: string };
  const userId = Number(body.userId);
  const reason = (body.reason ?? "Manuell im Beitrag-Tool gesperrt.").trim();
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ message: "Ungültige user_id." }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ message: "Begründung fehlt." }, { status: 400 });
  }

  const collection = await getSocialMediaPixabayUploaderBlacklistCollection();
  await collection.updateOne(
    { userId },
    {
      $set: {
        uploaderName: (body.uploaderName ?? "").trim() || undefined,
        reason,
        createdAt: new Date(),
        createdBy: account.username,
      },
    },
    { upsert: true },
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const account = await getServerAccount();
  if (!account || !isAdmin(account.role)) {
    return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
  }

  const userId = Number(req.nextUrl.searchParams.get("userId"));
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ message: "Ungültige user_id." }, { status: 400 });
  }

  const collection = await getSocialMediaPixabayUploaderBlacklistCollection();
  await collection.deleteOne({ userId });
  return NextResponse.json({ ok: true });
}