import { NextRequest, NextResponse } from "next/server";
import { getServerAccount } from "@/lib/server-auth";

const ALLOWED_HOSTS = [
  "pixabay.com",
  "cdn.pixabay.com",
  "i.ibb.co",
];

/** Proxy für externe Bild-URLs (z. B. Pixabay).
 *  Nur authentifizierte Nutzer dürfen diese Route nutzen.
 *  Es sind nur URLs von explizit erlaubten Hosts zulässig (kein SSRF). */
export async function GET(req: NextRequest) {
  const account = await getServerAccount();
  if (!account) return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });

  const raw = req.nextUrl.searchParams.get("url") ?? "";
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return NextResponse.json({ message: "Ungültige URL." }, { status: 400 });
  }

  // Nur HTTPS, keine internen Adressen, nur erlaubte Hosts
  if (parsed.protocol !== "https:") {
    return NextResponse.json({ message: "Nur HTTPS-URLs erlaubt." }, { status: 400 });
  }
  const host = parsed.hostname.toLowerCase();
  const allowed = ALLOWED_HOSTS.some((h) => host === h || host.endsWith("." + h));
  if (!allowed) {
    return NextResponse.json({ message: "Host nicht erlaubt." }, { status: 403 });
  }

  const upstream = await fetch(parsed.toString(), {
    headers: { "User-Agent": "BuchArena/1.0" },
    // kein next-cache – wir wollen frische Daten einmalig durchleiten
    cache: "no-store",
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { message: `Upstream-Fehler: ${upstream.status}` },
      { status: 502 },
    );
  }

  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ message: "Kein Bild." }, { status: 400 });
  }

  const buffer = await upstream.arrayBuffer();
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
