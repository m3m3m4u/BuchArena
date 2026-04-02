import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { getNewsCollection } from "@/lib/news";

function forbidden() {
  return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const account = await getServerAccount();
  if (!account || (account.role !== "ADMIN" && account.role !== "SUPERADMIN")) {
    return forbidden();
  }
  const { id } = await params;
  const col = await getNewsCollection();
  const post = await col.findOne({ _id: new ObjectId(id) });
  if (!post) return NextResponse.json({ message: "Nicht gefunden." }, { status: 404 });
  return NextResponse.json({
    post: {
      _id: post._id!.toString(),
      title: post.title,
      layout: post.layout,
      htmlContent: post.htmlContent,
      imageUrl: post.imageUrl ?? null,
      imageRatio: post.imageRatio ?? 40,
      active: post.active,
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const account = await getServerAccount();
  if (!account || (account.role !== "ADMIN" && account.role !== "SUPERADMIN")) {
    return forbidden();
  }
  const { id } = await params;
  const body = (await request.json()) as { active?: boolean };
  const col = await getNewsCollection();
  await col.updateOne(
    { _id: new ObjectId(id) },
    { $set: { active: body.active ?? false, updatedAt: new Date() } }
  );
  return NextResponse.json({ message: "Aktualisiert." });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const account = await getServerAccount();
  if (!account || (account.role !== "ADMIN" && account.role !== "SUPERADMIN")) {
    return forbidden();
  }
  const { id } = await params;
  const col = await getNewsCollection();
  await col.deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ message: "Gelöscht." });
}
