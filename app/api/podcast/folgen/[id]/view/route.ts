import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getPodcastFolgenCollection } from "@/lib/podcast";

/** POST /api/podcast/folgen/[id]/view – Aufruf zählen (öffentlich) */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
  }
  try {
    const col = await getPodcastFolgenCollection();
    await col.updateOne({ _id: new ObjectId(id) }, { $inc: { views: 1 } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
