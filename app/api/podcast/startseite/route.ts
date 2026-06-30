import { NextResponse } from "next/server";
import { getServerAccount } from "@/lib/server-auth";
import { getPodcastStartseiteCollection } from "@/lib/podcast";

function isAdmin(role: string) {
  return role === "ADMIN" || role === "SUPERADMIN";
}

/** GET /api/podcast/startseite – öffentlich */
export async function GET() {
  try {
    const col = await getPodcastStartseiteCollection();
    const doc = await col.findOne({ key: "startseite" });
    return NextResponse.json({ htmlContent: doc?.htmlContent ?? "" });
  } catch {
    return NextResponse.json({ htmlContent: "" });
  }
}

/** PUT /api/podcast/startseite – nur Admin */
export async function PUT(request: Request) {
  const account = await getServerAccount();
  if (!account || !isAdmin(account.role)) {
    return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
  }

  const body = (await request.json()) as { htmlContent?: string };
  const htmlContent = body.htmlContent?.trim() ?? "";

  try {
    const col = await getPodcastStartseiteCollection();
    await col.updateOne(
      { key: "startseite" },
      { $set: { key: "startseite", htmlContent, updatedAt: new Date() } },
      { upsert: true }
    );
    return NextResponse.json({ message: "Gespeichert." });
  } catch {
    return NextResponse.json({ message: "Fehler beim Speichern." }, { status: 500 });
  }
}
