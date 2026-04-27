import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

const memCache = new Map<string, { lat: number; lon: number } | null>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ coords: null });
  }

  const key = q.toLowerCase();

  if (memCache.has(key)) {
    return NextResponse.json({ coords: memCache.get(key) });
  }

  // MongoDB-Cache prüfen
  try {
    const db = await getDatabase();
    const cached = await db.collection("geocode_cache").findOne({ query: key });
    if (cached) {
      const coords = cached.lat !== null && cached.lat !== undefined
        ? { lat: cached.lat as number, lon: cached.lon as number }
        : null;
      memCache.set(key, coords);
      return NextResponse.json({ coords });
    }
  } catch { /* weiter zu Nominatim */ }

  // Nominatim anfragen
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&accept-language=de`;
    const res = await fetch(url, {
      headers: { "User-Agent": "BuchArena-Kalender/1.0 (bucharena.de)" },
    });

    if (!res.ok) {
      memCache.set(key, null);
      return NextResponse.json({ coords: null });
    }

    const data = (await res.json()) as { lat: string; lon: string }[];
    if (data.length === 0) {
      memCache.set(key, null);
      // Auch Fehlschläge cachen
      getDatabase().then(db =>
        db.collection("geocode_cache").updateOne(
          { query: key },
          { $set: { query: key, lat: null, lon: null, cachedAt: new Date() } },
          { upsert: true }
        ).catch(() => {})
      ).catch(() => {});
      return NextResponse.json({ coords: null });
    }

    const coords = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    memCache.set(key, coords);

    // In MongoDB persistieren (fire-and-forget)
    getDatabase().then(db =>
      db.collection("geocode_cache").updateOne(
        { query: key },
        { $set: { query: key, lat: coords.lat, lon: coords.lon, cachedAt: new Date() } },
        { upsert: true }
      ).catch(() => {})
    ).catch(() => {});

    return NextResponse.json({ coords });
  } catch {
    memCache.set(key, null);
    return NextResponse.json({ coords: null });
  }
}
