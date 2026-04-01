import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

export type MusikTrack = {
  _id?: ObjectId;
  title: string;
  style: string;
  description: string;
  fileUrl: string;
  fileName: string;
  /** Dateigröße in Bytes */
  fileSize?: number;
  /** Optionale SoundCloud-Track-URL */
  soundcloudUrl?: string;
  createdAt: Date;
  uploadedBy: string;
};

async function getMusikCollection() {
  const db = await getDatabase();
  return db.collection<MusikTrack>("musik_tracks");
}

/** GET /api/musik – alle Tracks auflisten (öffentlich) */
export async function GET() {
  const col = await getMusikCollection();
  const tracks = await col.find({}).sort({ createdAt: -1 }).toArray();
  return NextResponse.json({
    tracks: tracks.map((t) => ({
      id: t._id!.toString(),
      title: t.title,
      style: t.style,
      description: t.description,
      fileUrl: t.fileUrl,
      fileName: t.fileName,
      fileSize: t.fileSize ?? null,
      soundcloudUrl: t.soundcloudUrl ?? null,
      createdAt: t.createdAt,
    })),
  });
}

/** DELETE /api/musik?id=… – Track löschen (nur Admin) */
export async function DELETE(request: Request) {
  const account = await getServerAccount();
  if (!account || (account.role !== "ADMIN" && account.role !== "SUPERADMIN")) {
    return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();
  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
  }

  const col = await getMusikCollection();
  const result = await col.deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount === 0) {
    return NextResponse.json({ message: "Track nicht gefunden." }, { status: 404 });
  }
  return NextResponse.json({ message: "Track gelöscht." });
}
