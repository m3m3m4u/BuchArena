import { NextResponse } from "next/server";
import { getSocialMediaGalleryCollection } from "@/lib/mongodb";

/** GET /api/social-media/gallery – alle Galerie-Bilder (öffentlich) */
export async function GET() {
  const col = await getSocialMediaGalleryCollection();
  const docs = await col.find({}).sort({ order: 1, createdAt: 1 }).toArray();
  return NextResponse.json(docs.map((d) => ({
    id:    d._id!.toString(),
    label: d.label,
    src:   d.src,
  })));
}
