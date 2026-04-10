import { NextRequest, NextResponse } from "next/server";
import { getServerAccount } from "@/lib/server-auth";

const PIXABAY_KEY = process.env.PIXABAY_API_KEY ?? "";

export async function GET(req: NextRequest) {
  const account = await getServerAccount();
  if (!account) return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });

  if (!PIXABAY_KEY) {
    return NextResponse.json({ message: "Pixabay API nicht konfiguriert." }, { status: 500 });
  }

  const q         = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const page      = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
  const imageType = req.nextUrl.searchParams.get("image_type") ?? "all";

  const ALLOWED_TYPES = ["all", "photo", "illustration", "vector"];
  const safeType = ALLOWED_TYPES.includes(imageType) ? imageType : "all";

  if (!q) {
    return NextResponse.json({ hits: [], totalHits: 0 });
  }

  const url = new URL("https://pixabay.com/api/");
  url.searchParams.set("key", PIXABAY_KEY);
  url.searchParams.set("q", q);
  url.searchParams.set("image_type", safeType);
  url.searchParams.set("per_page", "18");
  url.searchParams.set("page", String(page));
  url.searchParams.set("safesearch", "true");
  url.searchParams.set("lang", "de");

  const res = await fetch(url.toString(), { next: { revalidate: 300 } });

  if (!res.ok) {
    return NextResponse.json({ message: "Pixabay-Anfrage fehlgeschlagen." }, { status: 502 });
  }

  const data = await res.json() as {
    totalHits: number;
    hits: Array<{
      id: number;
      previewURL: string;
      webformatURL: string;
      largeImageURL: string;
      tags: string;
      imageWidth: number;
      imageHeight: number;
      user: string;
    }>;
  };

  return NextResponse.json({
    totalHits: data.totalHits,
    hits: data.hits.map((h) => ({
      id: h.id,
      preview: h.previewURL,
      webformat: h.webformatURL,
      large: h.largeImageURL,
      tags: h.tags,
      width: h.imageWidth,
      height: h.imageHeight,
      user: h.user,
    })),
  });
}
