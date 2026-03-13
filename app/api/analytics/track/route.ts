import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { page, referrer } = body as { page?: string; referrer?: string };

    if (!page || typeof page !== "string") {
      return NextResponse.json({ error: "Seite fehlt" }, { status: 400 });
    }

    // Sanitize inputs - only allow reasonable lengths
    const sanitizedPage = page.slice(0, 500);
    const sanitizedReferrer = typeof referrer === "string" ? referrer.slice(0, 1000) : "";

    const db = await getDatabase();
    const collection = db.collection("analytics");

    await collection.insertOne({
      page: sanitizedPage,
      referrer: sanitizedReferrer,
      timestamp: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Tracking fehlgeschlagen" }, { status: 500 });
  }
}
