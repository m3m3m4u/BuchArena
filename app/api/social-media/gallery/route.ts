import { NextRequest, NextResponse } from "next/server";
import { getSocialMediaGalleryCollection } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const PER_PAGE = 8;

/** GET /api/social-media/gallery?page=0&q= – paginierte Galerie-Bilder (öffentlich) */
export async function GET(req: NextRequest) {
  const page = Math.max(0, parseInt(req.nextUrl.searchParams.get("page") ?? "0", 10) || 0);
  const q    = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const col  = await getSocialMediaGalleryCollection();

  const filter = q ? { label: { $regex: q, $options: "i" } } : {};
  const [total, docs] = await Promise.all([
    col.countDocuments(filter),
    col.find(filter).sort({ order: 1, createdAt: 1 }).skip(page * PER_PAGE).limit(PER_PAGE).toArray(),
  ]);
  return NextResponse.json({
    total,
    page,
    totalPages: Math.ceil(total / PER_PAGE),
    items: docs.map((d) => ({ id: d._id!.toString(), label: d.label, src: d.src })),
  });
}
