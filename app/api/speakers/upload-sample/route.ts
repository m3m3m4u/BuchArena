import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import {
  getWebdavClient,
  getWebdavUploadDir,
  toInternalImageUrl,
} from "@/lib/webdav-storage";
import type { Sprechprobe } from "@/lib/profile";

export const runtime = "nodejs";

function sanitizeUsername(input: string) {
  return input.replace(/[^a-zA-Z0-9_-]/g, "-");
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const usernameValue = formData.get("username");

    if (!(file instanceof File) || typeof usernameValue !== "string") {
      return NextResponse.json(
        { message: "Datei oder Benutzername fehlt." },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("audio/") && !file.name.toLowerCase().endsWith(".mp3")) {
      return NextResponse.json(
        { message: "Nur MP3-Dateien sind erlaubt." },
        { status: 400 }
      );
    }

    const username = sanitizeUsername(usernameValue.trim());
    if (!username) {
      return NextResponse.json(
        { message: "Ungültiger Benutzername." },
        { status: 400 }
      );
    }

    // Store as sprechproben sub-directory
    const uploadDir = getWebdavUploadDir();
    const remoteDirPath = `/${uploadDir}/${username}/sprechproben`;
    const fileName = `${Date.now()}-${randomUUID()}.mp3`;
    const remoteFilePath = `${remoteDirPath}/${fileName}`;

    const client = getWebdavClient();
    await client.createDirectory(remoteDirPath, { recursive: true });

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await client.putFileContents(remoteFilePath, fileBuffer, {
      overwrite: true,
    });

    const sampleUrl = toInternalImageUrl(remoteFilePath);

    const sample: Sprechprobe = {
      id: randomUUID(),
      filename: file.name,
      url: sampleUrl,
      uploadedAt: new Date().toISOString(),
    };

    // Add sample to user's speakerProfile
    const users = await getUsersCollection();
    await users.updateOne(
      { username },
      { $push: { "speakerProfile.sprechproben": sample } }
    );

    return NextResponse.json({
      message: "Sprechprobe hochgeladen.",
      sample,
    });
  } catch {
    return NextResponse.json(
      { message: "Upload fehlgeschlagen." },
      { status: 500 }
    );
  }
}
