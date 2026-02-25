import { NextResponse } from "next/server";
import { getBucharenaSnippetsCollection } from "@/lib/bucharena-db";
import { getServerAccount } from "@/lib/server-auth";
import { davPut } from "@/lib/bucharena-webdav";

export const runtime = "nodejs";

const MAX_AUDIO_SIZE = 4 * 1024 * 1024;

function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, "_").replace(/_+/g, "_").substring(0, 200);
}

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    const formData = await request.formData();

    const bookTitle = formData.get("bookTitle") as string;
    const text = formData.get("text") as string;
    const audioFile = formData.get("audio") as File | null;
    const audioFileName = formData.get("audioFileName") as string | null;
    const audioFilePath = formData.get("audioFilePath") as string | null;
    const audioFileSize = formData.get("audioFileSize") as string | null;

    if (!bookTitle || !text) {
      return NextResponse.json({ success: false, error: "Buchtitel und Text sind erforderlich" }, { status: 400 });
    }

    const trimmedTitle = bookTitle.trim();
    const trimmedText = text.trim();

    if (trimmedTitle.length < 2) return NextResponse.json({ success: false, error: "Buchtitel ist zu kurz (mindestens 2 Zeichen)" }, { status: 400 });
    if (trimmedText.length < 10) return NextResponse.json({ success: false, error: "Text ist zu kurz (mindestens 10 Zeichen)" }, { status: 400 });

    let audioFileNameFinal: string | undefined;
    let audioFilePathFinal: string | undefined;
    let audioFileSizeFinal: number | undefined;

    if (audioFileName && audioFilePath && audioFileSize) {
      audioFileNameFinal = audioFileName;
      audioFilePathFinal = audioFilePath;
      audioFileSizeFinal = parseInt(audioFileSize, 10);
    } else if (audioFile && audioFile.size > 0) {
      const fileName = audioFile.name.toLowerCase();
      if (!fileName.endsWith(".mp3") && !audioFile.type.includes("audio/mpeg")) {
        return NextResponse.json({ success: false, error: "Nur MP3-Dateien sind erlaubt" }, { status: 400 });
      }
      if (audioFile.size > MAX_AUDIO_SIZE) {
        return NextResponse.json({ success: false, error: "Die Audio-Datei darf maximal 4MB groß sein." }, { status: 400 });
      }

      const timestamp = Date.now();
      const safeTitle = sanitizeFileName(trimmedTitle);
      const generatedName = `${safeTitle}_${timestamp}.mp3`;
      const webdavKey = `bucharena-snippets/${generatedName}`;

      const bytes = await audioFile.arrayBuffer();
      const uploadResult = await davPut(webdavKey, new Uint8Array(bytes), "audio/mpeg");
      if (!uploadResult) return NextResponse.json({ success: false, error: "Fehler beim Hochladen der Audio-Datei" }, { status: 500 });

      audioFileNameFinal = generatedName;
      audioFilePathFinal = webdavKey;
      audioFileSizeFinal = audioFile.size;
    }

    const col = await getBucharenaSnippetsCollection();
    const now = new Date();
    const result = await col.insertOne({
      bookTitle: trimmedTitle,
      text: trimmedText,
      audioFileName: audioFileNameFinal,
      audioFilePath: audioFilePathFinal,
      audioFileSize: audioFileSizeFinal,
      authorEmail: account?.email || undefined,
      authorName: account?.username || undefined,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      snippet: { id: result.insertedId.toHexString(), bookTitle: trimmedTitle, text: trimmedText, hasAudio: !!audioFileNameFinal, status: "pending", createdAt: now },
    });
  } catch (error) {
    console.error("Fehler beim Erstellen des Schnipsels:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unbekannter Fehler" }, { status: 500 });
  }
}
