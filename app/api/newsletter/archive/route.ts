import { NextResponse } from "next/server";
import { getServerAccount } from "@/lib/server-auth";
import { getNewsletterArchiveCollection } from "@/lib/newsletter";

/** GET /api/newsletter/archive — Alle archivierten Newsletter (neueste zuerst) */
export async function GET() {
  try {
    const account = await getServerAccount();
    if (!account || (account.role !== "ADMIN" && account.role !== "SUPERADMIN")) {
      return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
    }

    const col = await getNewsletterArchiveCollection();
    const entries = await col
      .find({}, { projection: { htmlContent: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ archive: entries });
  } catch (err) {
    console.error("[Newsletter Archive] Fehler:", err);
    return NextResponse.json({ message: "Interner Serverfehler." }, { status: 500 });
  }
}
