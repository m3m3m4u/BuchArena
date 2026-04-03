import { NextResponse } from "next/server";

const geocodeCache = new Map<string, { lat: number; lon: number } | null>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ coords: null });
  }

  if (geocodeCache.has(q)) {
    const cached = geocodeCache.get(q);
    return NextResponse.json({ coords: cached });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&accept-language=de`;
    const res = await fetch(url, {
      headers: { "User-Agent": "BuchArena-Kalender/1.0 (bucharena.de)" },
    });

    if (!res.ok) {
      geocodeCache.set(q, null);
      return NextResponse.json({ coords: null });
    }

    const data = (await res.json()) as { lat: string; lon: string }[];
    if (data.length === 0) {
      geocodeCache.set(q, null);
      return NextResponse.json({ coords: null });
    }

    const coords = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    geocodeCache.set(q, coords);
    return NextResponse.json({ coords });
  } catch {
    return NextResponse.json({ coords: null });
  }
}
