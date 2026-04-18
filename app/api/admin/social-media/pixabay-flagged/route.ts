import { NextRequest, NextResponse } from "next/server";
import { getSocialMediaPixabayFlaggedImagesCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

function isAdmin(role?: string) {
  return role === "ADMIN" || role === "SUPERADMIN";
}

export async function GET() {
  const account = await getServerAccount();
  if (!account || !isAdmin(account.role)) {
    return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
  }

  const collection = await getSocialMediaPixabayFlaggedImagesCollection();
  const entries = await collection.find({}).sort({ createdAt: -1 }).toArray();
  return NextResponse.json(entries.map((entry) => ({
    id: entry._id?.toString(),
    imageId: entry.imageId,
    pageUrl: entry.pageUrl ?? null,
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

  const body = await req.json() as { imageId?: number; pageUrl?: string; reason?: string };
  const imageId = Number(body.imageId);
  const reason = (body.reason ?? "Manuell gesperrt.").trim();
  if (!Number.isInteger(imageId) || imageId <= 0) {
    return NextResponse.json({ message: "Ungültige imageId." }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ message: "Begründung fehlt." }, { status: 400 });
  }

  const collection = await getSocialMediaPixabayFlaggedImagesCollection();
  await collection.updateOne(
    { imageId },
    {
      $set: {
        pageUrl: (body.pageUrl ?? "").trim() || undefined,
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

  const { searchParams } = new URL(req.url);
  const imageId = Number(searchParams.get("imageId"));
  if (!Number.isInteger(imageId) || imageId <= 0) {
    return NextResponse.json({ message: "Ungültige imageId." }, { status: 400 });
  }

  const collection = await getSocialMediaPixabayFlaggedImagesCollection();
  await collection.deleteOne({ imageId });
  return NextResponse.json({ ok: true });
}
