import { NextRequest, NextResponse } from "next/server";
import { getServerAccount } from "@/lib/server-auth";
import { getSocialMediaGalleryCollection } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

function isAdmin(role?: string) {
  return role === "ADMIN" || role === "SUPERADMIN";
}

/** GET /api/admin/social-media/gallery – alle Items für Admin-Ansicht */
export async function GET() {
  const account = await getServerAccount();
  if (!account || !isAdmin(account.role)) {
    return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
  }
  const col = await getSocialMediaGalleryCollection();
  const docs = await col.find({}).sort({ order: 1, createdAt: 1 }).toArray();
  return NextResponse.json(docs.map((d) => ({
    id:        d._id!.toString(),
    label:     d.label,
    src:       d.src,
    order:     d.order,
    createdAt: d.createdAt,
  })));
}

/** POST /api/admin/social-media/gallery – neues Bild hinzufügen */
export async function POST(req: NextRequest) {
  const account = await getServerAccount();
  if (!account || !isAdmin(account.role)) {
    return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
  }

  const body = await req.json() as { label?: string; src?: string };
  const label = (body.label ?? "").trim();
  const src   = (body.src   ?? "").trim();

  if (!label) return NextResponse.json({ message: "Label fehlt." }, { status: 400 });
  if (!src)   return NextResponse.json({ message: "Bild fehlt."  }, { status: 400 });

  const col = await getSocialMediaGalleryCollection();
  const maxOrder = await col.find({}).sort({ order: -1 }).limit(1).toArray();
  const order = maxOrder.length > 0 ? maxOrder[0].order + 1 : 0;

  const result = await col.insertOne({ label, src, order, createdAt: new Date() });
  return NextResponse.json({ id: result.insertedId.toString(), label, src, order });
}

/** PATCH /api/admin/social-media/gallery – Label oder Reihenfolge aktualisieren */
export async function PATCH(req: NextRequest) {
  const account = await getServerAccount();
  if (!account || !isAdmin(account.role)) {
    return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
  }

  const body = await req.json() as { id?: string; label?: string; order?: number };
  if (!body.id) return NextResponse.json({ message: "ID fehlt." }, { status: 400 });

  const col = await getSocialMediaGalleryCollection();
  const update: Record<string, unknown> = {};
  if (body.label !== undefined) update.label = body.label.trim();
  if (body.order !== undefined) update.order = body.order;

  await col.updateOne({ _id: new ObjectId(body.id) }, { $set: update });
  return NextResponse.json({ ok: true });
}

/** DELETE /api/admin/social-media/gallery?id=xxx */
export async function DELETE(req: NextRequest) {
  const account = await getServerAccount();
  if (!account || !isAdmin(account.role)) {
    return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ message: "ID fehlt." }, { status: 400 });

  const col = await getSocialMediaGalleryCollection();
  await col.deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ ok: true });
}
