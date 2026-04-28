import { NextResponse } from "next/server";
import { getUsersCollection, getDatabase } from "@/lib/mongodb";

export type ProfileMapUser = {
  username: string;
  displayName: string;
  profileSlug: string;
  postalCode: string;
  city: string;
  country: string;
  profilePath: string;
  lat: number | null;
  lon: number | null;
};

type Category = "autoren" | "blogger" | "testleser" | "sprecher" | "lektoren" | "verlage";

function isCategory(v: string | null): v is Category {
  return ["autoren", "blogger", "testleser", "sprecher", "lektoren", "verlage"].includes(v ?? "");
}

function getLocationField(profile: Record<string, any> | undefined, field: string): string {
  if (!profile) return "";
  const f = profile[field];
  if (!f) return "";
  if (typeof f === "string") return f;
  if (typeof f === "object" && f.visibility === "public") return f.value ?? "";
  return "";
}

function geocodeKey(postalCode: string, city: string, country: string): string {
  return [postalCode, city, country].filter(Boolean).join(", ").toLowerCase();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  if (!isCategory(category)) {
    return NextResponse.json({ message: "Ungültige Kategorie." }, { status: 400 });
  }

  try {
    const users = await getUsersCollection();

    const profileField =
      category === "autoren" ? "profile"
      : category === "blogger" ? "bloggerProfile"
      : category === "testleser" ? "testleserProfile"
      : category === "sprecher" ? "speakerProfile"
      : category === "lektoren" ? "lektorenProfile"
      : "verlageProfile";

    const nameField = "name";

    const query: Record<string, unknown> =
      category === "autoren"
        ? { "profile.name.value": { $exists: true, $ne: "" }, "profile.deaktiviert": { $ne: true } }
        : { [profileField]: { $exists: true }, [`${profileField}.deaktiviert`]: { $ne: true }, [`${profileField}.name.value`]: { $exists: true, $ne: "" } };

    const query2 = {
      ...query,
      $or: [{ status: { $exists: false } }, { status: "active" as const }],
    } as import("mongodb").Filter<import("@/lib/mongodb").UserDocument>;

    const docs = await users
      .find(query2, {
        projection: {
          username: 1,
          displayName: 1,
          profileSlug: 1,
          [profileField]: 1,
        },
      })
      .toArray();

    const partial: (Omit<ProfileMapUser, "lat" | "lon"> & { geoKey: string })[] = [];

    for (const doc of docs) {
      const profile = doc[profileField as keyof typeof doc] as Record<string, any> | undefined;
      if (!profile) continue;

      const postalCode = getLocationField(profile, "postalCode");
      const city =
        category === "sprecher"
          ? getLocationField(profile, "ort")
          : getLocationField(profile, "city");
      const country = getLocationField(profile, "country");

      if (!postalCode && !city) continue;

      const displayName =
        doc.displayName ??
        (profile[nameField]?.visibility !== "hidden" && profile[nameField]?.value
          ? profile[nameField].value
          : doc.username);

      const slug = doc.profileSlug ?? "";

      const basePath =
        category === "autoren" ? "/autor"
        : category === "blogger" ? "/blogger"
        : category === "testleser" ? "/testleser"
        : category === "sprecher" ? "/sprecher"
        : category === "lektoren" ? "/lektoren"
        : "/verlage";

      partial.push({
        username: doc.username,
        displayName,
        profileSlug: slug,
        postalCode,
        city,
        country,
        profilePath: `${basePath}/${encodeURIComponent(slug || doc.username)}`,
        geoKey: geocodeKey(postalCode, city, country),
      });
    }

    // Bulk-Lookup im Geocode-Cache
    const uniqueKeys = [...new Set(partial.map(u => u.geoKey))];
    const db = await getDatabase();
    const cachedDocs = await db
      .collection("geocode_cache")
      .find({ query: { $in: uniqueKeys } })
      .toArray();

    const coordsMap = new Map<string, { lat: number; lon: number } | null>();
    for (const c of cachedDocs) {
      coordsMap.set(
        c.query as string,
        c.lat !== null && c.lat !== undefined
          ? { lat: c.lat as number, lon: c.lon as number }
          : null
      );
    }

    const result: ProfileMapUser[] = partial.map(({ geoKey, ...u }) => {
      const coords = coordsMap.has(geoKey) ? coordsMap.get(geoKey) ?? null : undefined;
      return {
        ...u,
        lat: coords !== undefined ? (coords?.lat ?? null) : null,
        lon: coords !== undefined ? (coords?.lon ?? null) : null,
      };
    });

    return NextResponse.json({ users: result });
  } catch {
    return NextResponse.json({ message: "Fehler beim Laden." }, { status: 500 });
  }
}
