import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import {
  getWebdavClient,
  getWebdavUploadDir,
  toInternalImageUrl,
} from "@/lib/webdav-storage";
import { getServerAccount } from "@/lib/server-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account || (account.role !== "ADMIN" && account.role !== "SUPERADMIN")) {
      return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
    }

    const formData = await request.formData();
    const title = (formData.get("title") as string | null)?.trim();
    const style = (formData.get("style") as string | null)?.trim();
    const description = (formData.get("description") as string | null)?.trim();
    const file = formData.get("file");

    if (!title || !style || !description) {
      return NextResponse.json({ message: "Titel, Stil und Beschreibung sind Pflicht." }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "MP3-Datei fehlt." }, { status: 400 });
    }

    const allowedTypes = ["audio/mpeg", "audio/mp3", "audio/x-mpeg"];
    if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith(".mp3")) {
      return NextResponse.json({ message: "Nur MP3-Dateien sind erlaubt." }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ message: "Die Datei darf maximal 50 MB groß sein." }, { status: 400 });
    }

    const fileName = `${Date.now()}-${randomUUID()}.mp3`;
    const uploadDir = getWebdavUploadDir();
    const remoteDirPath = `/${uploadDir}/musik`;
    const remoteFilePath = `${remoteDirPath}/${fileName}`;

    const client = getWebdavClient();
    await client.createDirectory(remoteDirPath, { recursive: true });

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await client.putFileContents(remoteFilePath, fileBuffer, { overwrite: true });

    const fileUrl = toInternalImageUrl(remoteFilePath);

    const db = await getDatabase();
    const col = db.collection("musik_tracks");
    await col.insertOne({
      title,
      style,
      description,
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
      uploadedBy: account.username,
      createdAt: new Date(),
    });

    return NextResponse.json({ message: "Track hochgeladen." }, { status: 201 });
  } catch (err) {
    console.error("Musik-Upload Fehler:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
