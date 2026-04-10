import { NextRequest, NextResponse } from "next/server";
import { getServerAccount } from "@/lib/server-auth";
import { getSocialMediaDesignsCollection } from "@/lib/mongodb";

/** GET /api/social-media/designs – alle Designs des Users laden (Admin: ?all=1 für alle User) */
export async function GET(req: NextRequest) {
  const account = await getServerAccount();
  if (!account) return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });

  const col = await getSocialMediaDesignsCollection();

  const showAll = req.nextUrl.searchParams.get("all") === "1";
  const isAdmin = account.role === "ADMIN" || account.role === "SUPERADMIN";

  const filter = (showAll && isAdmin) ? {} : { username: account.username };

  const docs = await col
    .find(filter, { projection: { _id: 1, name: 1, updatedAt: 1, data: 1, username: 1 } })
    .sort({ updatedAt: -1 })
    .toArray();

  return NextResponse.json(docs.map((d) => ({
    id:         d._id!.toString(),
    name:       d.name,
    updatedAt:  d.updatedAt,
    data:       d.data,
    ...(showAll && isAdmin ? { username: d.username } : {}),
  })));
}

/** POST /api/social-media/designs – Design speichern (upsert nach name) */
export async function POST(req: NextRequest) {
  const account = await getServerAccount();
  if (!account) return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });

  const body = await req.json() as { name?: string; data?: string };
  const name = (body.name ?? "").trim();
  const data = body.data ?? "";

  if (!name) return NextResponse.json({ message: "Name fehlt." }, { status: 400 });
  if (!data)  return NextResponse.json({ message: "Daten fehlen." }, { status: 400 });

  const col = await getSocialMediaDesignsCollection();
  const result = await col.findOneAndUpdate(
    { username: account.username, name },
    { $set: { data, updatedAt: new Date() }, $setOnInsert: { username: account.username, name } },
    { upsert: true, returnDocument: "after" },
  );

  return NextResponse.json({ id: result!._id!.toString(), name, updatedAt: result!.updatedAt });
}

/** DELETE /api/social-media/designs?name=xxx – Design löschen */
export async function DELETE(req: NextRequest) {
  const account = await getServerAccount();
  if (!account) return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });

  const name = req.nextUrl.searchParams.get("name") ?? "";
  if (!name) return NextResponse.json({ message: "Name fehlt." }, { status: 400 });

  const col = await getSocialMediaDesignsCollection();
  await col.deleteOne({ username: account.username, name });

  return NextResponse.json({ success: true });
}
