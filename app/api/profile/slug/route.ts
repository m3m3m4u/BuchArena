import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

/** Erlaubte Zeichen: Kleinbuchstaben, Ziffern, Bindestriche. 3–40 Zeichen. */
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

/** Reservierte Slugs, die nicht vergeben werden dürfen. */
const RESERVED_SLUGS = new Set([
  "admin", "api", "auth", "profil", "hilfe", "support", "impressum",
  "datenschutz", "info", "news", "newsletter", "autoren", "sprecher",
  "blogger", "testleser", "lektoren", "verlage", "buecher", "kalender",
  "diskussionen", "nachrichten", "lesezeichen", "rezensionen",
]);

type SlugPayload = {
  slug?: string;
  username?: string;  // nur für SUPERADMIN
};

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as SlugPayload;
    const targetUsername =
      (account.role === "SUPERADMIN" || account.role === "ADMIN") && body.username?.trim()
        ? body.username.trim()
        : account.username;

    const rawSlug = (body.slug ?? "").trim().toLowerCase();

    // Leeren Slug erlauben → entfernt den Slug
    if (!rawSlug) {
      const users = await getUsersCollection();
      await users.updateOne(
        { username: targetUsername },
        { $unset: { profileSlug: "" } },
      );
      return NextResponse.json({ message: "Profil-URL zurückgesetzt.", slug: "" });
    }

    if (!SLUG_REGEX.test(rawSlug)) {
      return NextResponse.json(
        { message: "Nur Kleinbuchstaben, Ziffern und Bindestriche erlaubt (3–40 Zeichen, kein Bindestrich am Anfang/Ende)." },
        { status: 400 },
      );
    }

    if (RESERVED_SLUGS.has(rawSlug)) {
      return NextResponse.json(
        { message: "Dieser Name ist reserviert." },
        { status: 400 },
      );
    }

    const users = await getUsersCollection();

    // Prüfen, ob der Slug schon vergeben ist (durch anderen User)
    const existing = await users.findOne(
      { profileSlug: rawSlug, username: { $ne: targetUsername } },
      { projection: { _id: 1 } },
    );
    if (existing) {
      return NextResponse.json(
        { message: "Diese Profil-URL ist bereits vergeben." },
        { status: 409 },
      );
    }

    // Prüfen, ob der Slug mit einem bestehenden Benutzernamen kollidiert
    const usernameCollision = await users.findOne(
      { $and: [{ username: rawSlug }, { username: { $ne: targetUsername } }] },
    );
    if (usernameCollision) {
      return NextResponse.json(
        { message: "Diese Profil-URL ist bereits vergeben." },
        { status: 409 },
      );
    }

    await users.updateOne(
      { username: targetUsername },
      { $set: { profileSlug: rawSlug } },
    );

    return NextResponse.json({ message: "Profil-URL gespeichert.", slug: rawSlug });
  } catch {
    return NextResponse.json(
      { message: "Profil-URL konnte nicht gespeichert werden." },
      { status: 500 },
    );
  }
}

/** GET: Prüft, ob ein Slug verfügbar ist */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug")?.trim().toLowerCase();
    const forUser = searchParams.get("username")?.trim();

    if (!slug) {
      return NextResponse.json({ available: false, message: "Kein Slug angegeben." });
    }

    if (!SLUG_REGEX.test(slug)) {
      return NextResponse.json({ available: false, message: "Ungültiges Format." });
    }

    if (RESERVED_SLUGS.has(slug)) {
      return NextResponse.json({ available: false, message: "Reserviert." });
    }

    const users = await getUsersCollection();
    const filter: Record<string, unknown> = { profileSlug: slug };
    if (forUser) filter.username = { $ne: forUser };

    const taken = await users.findOne(filter, { projection: { _id: 1 } });

    return NextResponse.json({ available: !taken });
  } catch {
    return NextResponse.json({ available: false, message: "Fehler bei der Prüfung." });
  }
}
