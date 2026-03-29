import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { createHash } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { page, referrer, username } = body as { page?: string; referrer?: string; username?: string };

    if (!page || typeof page !== "string") {
      return NextResponse.json({ error: "Seite fehlt" }, { status: 400 });
    }

    // Sanitize inputs - only allow reasonable lengths
    const sanitizedPage = page.slice(0, 500);
    const rawReferrer = typeof referrer === "string" ? referrer.slice(0, 1000) : "";

    // Referrer normalisieren: doppelte Hostnamen im Pfad entfernen
    // z.B. https://www.instagram.com/www.instagram.com%2Fuser -> https://www.instagram.com/user
    let sanitizedReferrer = rawReferrer;
    try {
      if (rawReferrer) {
        const u = new URL(rawReferrer);
        const decodedPath = decodeURIComponent(u.pathname);
        const hostInPath = decodedPath.replace(/^\//, "");
        if (hostInPath.startsWith(u.hostname)) {
          const realPath = hostInPath.slice(u.hostname.length);
          sanitizedReferrer = `${u.origin}${realPath.startsWith("/") ? realPath : "/" + realPath}`;
        }
      }
    } catch { /* ungültige URL belassen */ }

    // Anonyme Besucher-ID aus IP + User-Agent
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";
    const ua = request.headers.get("user-agent") || "";
    const visitorId = createHash("sha256").update(`${ip}::${ua}`).digest("hex").slice(0, 16);

    const db = await getDatabase();
    const collection = db.collection("analytics");

    const sanitizedUsername = typeof username === "string" ? username.slice(0, 100) : "";

    await collection.insertOne({
      page: sanitizedPage,
      referrer: sanitizedReferrer,
      visitorId,
      username: sanitizedUsername,
      timestamp: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Tracking fehlgeschlagen" }, { status: 500 });
  }
}
