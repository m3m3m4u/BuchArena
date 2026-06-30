import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { getPodcastFolgenCollection } from "@/lib/podcast";

function isAdmin(role: string) {
  return role === "ADMIN" || role === "SUPERADMIN";
}

/** GET /api/podcast/folgen – öffentlich (nur veröffentlichte) */
export async function GET() {
  try {
    const col = await getPodcastFolgenCollection();
    const folgen = await col
      .find({ published: true }, { projection: { htmlContent: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    return NextResponse.json({
      folgen: folgen.map((f) => ({
        _id: f._id!.toString(),
        title: f.title,
        text: f.text,
        youtubeUrl: f.youtubeUrl,
        views: f.views ?? 0,
        createdAt: f.createdAt,
      })),
    });
  } catch {
    return NextResponse.json({ folgen: [] });
  }
}

/** POST /api/podcast/folgen – nur Admin, neue Folge anlegen */
export async function POST(request: Request) {
  const account = await getServerAccount();
  if (!account || !isAdmin(account.role)) {
    return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
  }

  const body = (await request.json()) as {
    title?: string;
    text?: string;
    youtubeUrl?: string;
    published?: boolean;
  };

  const title = body.title?.trim();
  const text = body.text?.trim() ?? "";
  const youtubeUrl = body.youtubeUrl?.trim() ?? "";

  if (!title) {
    return NextResponse.json({ message: "Titel ist erforderlich." }, { status: 400 });
  }

  try {
    const col = await getPodcastFolgenCollection();
    const now = new Date();
    const result = await col.insertOne({
      title,
      text,
      youtubeUrl,
      published: body.published ?? true,
      views: 0,
      createdAt: now,
      updatedAt: now,
    });
    return NextResponse.json({ id: result.insertedId.toString() });
  } catch {
    return NextResponse.json({ message: "Fehler beim Speichern." }, { status: 500 });
  }
}

/** DELETE /api/podcast/folgen?id=... – nur Admin */
export async function DELETE(request: Request) {
  const account = await getServerAccount();
  if (!account || !isAdmin(account.role)) {
    return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
  }

  try {
    const col = await getPodcastFolgenCollection();
    await col.deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ message: "Gelöscht." });
  } catch {
    return NextResponse.json({ message: "Fehler." }, { status: 500 });
  }
}
