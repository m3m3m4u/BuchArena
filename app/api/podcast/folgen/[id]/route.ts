import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { getPodcastFolgenCollection } from "@/lib/podcast";

function isAdmin(role: string) {
  return role === "ADMIN" || role === "SUPERADMIN";
}

/** GET /api/podcast/folgen/[id] – öffentlich */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
  }
  try {
    const col = await getPodcastFolgenCollection();
    const folge = await col.findOne({ _id: new ObjectId(id), published: true });
    if (!folge) {
      return NextResponse.json({ message: "Nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({
      folge: {
        _id: folge._id!.toString(),
        title: folge.title,
        text: folge.text,
        youtubeUrl: folge.youtubeUrl,
        views: folge.views ?? 0,
        createdAt: folge.createdAt,
      },
    });
  } catch {
    return NextResponse.json({ message: "Fehler." }, { status: 500 });
  }
}

/** PATCH /api/podcast/folgen/[id] – nur Admin, Folge bearbeiten */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const account = await getServerAccount();
  if (!account || !isAdmin(account.role)) {
    return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
  }

  const body = (await request.json()) as {
    title?: string;
    text?: string;
    youtubeUrl?: string;
    published?: boolean;
  };

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (body.title !== undefined) update.title = body.title.trim();
  if (body.text !== undefined) update.text = body.text.trim();
  if (body.youtubeUrl !== undefined) update.youtubeUrl = body.youtubeUrl.trim();
  if (body.published !== undefined) update.published = body.published;

  try {
    const col = await getPodcastFolgenCollection();
    await col.updateOne({ _id: new ObjectId(id) }, { $set: update });
    return NextResponse.json({ message: "Gespeichert." });
  } catch {
    return NextResponse.json({ message: "Fehler." }, { status: 500 });
  }
}
