import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

/** POST /api/musik/soundcloud – SoundCloud-Track eintragen (nur Admin) */
export async function POST(request: Request) {
  const account = await getServerAccount();
  if (!account || (account.role !== "ADMIN" && account.role !== "SUPERADMIN")) {
    return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
  }

  const body = (await request.json()) as {
    title?: string;
    style?: string;
    description?: string;
    soundcloudUrl?: string;
  };

  const title = body.title?.trim() ?? "";
  const style = body.style?.trim() ?? "";
  const description = body.description?.trim() ?? "";
  const soundcloudUrl = body.soundcloudUrl?.trim() ?? "";

  if (!title || !style || !description || !soundcloudUrl) {
    return NextResponse.json({ message: "Alle Felder sind erforderlich." }, { status: 400 });
  }

  // Nur SoundCloud-URLs erlauben
  if (!/^https?:\/\/(www\.)?soundcloud\.com\//i.test(soundcloudUrl)) {
    return NextResponse.json({ message: "Bitte eine gültige SoundCloud-URL eingeben." }, { status: 400 });
  }

  const db = await getDatabase();
  await db.collection("musik_tracks").insertOne({
    title,
    style,
    description,
    fileUrl: soundcloudUrl,
    fileName: "",
    fileSize: null,
    soundcloudUrl,
    createdAt: new Date(),
    uploadedBy: account.username,
  });

  return NextResponse.json({ message: "SoundCloud-Track hinzugefügt." });
}
