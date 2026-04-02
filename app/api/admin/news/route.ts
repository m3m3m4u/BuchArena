import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { getNewsCollection, type NewsLayout } from "@/lib/news";

function forbidden() {
  return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
}

export async function GET() {
  const account = await getServerAccount();
  if (!account || (account.role !== "ADMIN" && account.role !== "SUPERADMIN")) {
    return forbidden();
  }
  const col = await getNewsCollection();
  const posts = await col
    .find({}, { projection: { htmlContent: 0 } })
    .sort({ createdAt: -1 })
    .toArray();
  return NextResponse.json({
    posts: posts.map((p) => ({
      _id: p._id!.toString(),
      title: p.title,
      layout: p.layout,
      imageUrl: p.imageUrl ?? null,
      imageRatio: p.imageRatio ?? 40,
      active: p.active,
      createdBy: p.createdBy,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
  });
}

export async function POST(request: Request) {
  const account = await getServerAccount();
  if (!account || (account.role !== "ADMIN" && account.role !== "SUPERADMIN")) {
    return forbidden();
  }

  const body = (await request.json()) as {
    id?: string;
    title?: string;
    layout?: string;
    htmlContent?: string;
    imageUrl?: string;
    imageRatio?: number;
    active?: boolean;
  };

  const title = body.title?.trim();
  const layout = body.layout as NewsLayout | undefined;
  const htmlContent = body.htmlContent?.trim();

  if (!title) {
    return NextResponse.json({ message: "Titel ist erforderlich." }, { status: 400 });
  }
  if (!layout || !["text-only", "image-left", "image-right"].includes(layout)) {
    return NextResponse.json({ message: "Ungültiges Layout." }, { status: 400 });
  }
  if (!htmlContent) {
    return NextResponse.json({ message: "Inhalt ist erforderlich." }, { status: 400 });
  }

  const imageRatio = Math.min(80, Math.max(20, body.imageRatio ?? 40));
  const col = await getNewsCollection();
  const now = new Date();

  if (body.id) {
    const result = await col.updateOne(
      { _id: new ObjectId(body.id) },
      {
        $set: {
          title,
          layout,
          htmlContent,
          imageUrl: body.imageUrl?.trim() || undefined,
          imageRatio,
          active: body.active ?? false,
          updatedAt: now,
        },
      }
    );
    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "Beitrag nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({ message: "Gespeichert.", id: body.id });
  }

  const result = await col.insertOne({
    title,
    layout,
    htmlContent,
    imageUrl: body.imageUrl?.trim() || undefined,
    imageRatio,
    active: body.active ?? false,
    createdBy: account.username,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ message: "Erstellt.", id: result.insertedId.toString() });
}
