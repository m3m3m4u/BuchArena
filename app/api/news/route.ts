import { NextResponse } from "next/server";
import { getNewsCollection } from "@/lib/news";

export async function GET() {
  try {
    const col = await getNewsCollection();
    const posts = await col
      .find({ active: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    return NextResponse.json({
      posts: posts.map((p) => ({
        _id: p._id!.toString(),
        title: p.title,
        layout: p.layout,
        htmlContent: p.htmlContent,
        imageUrl: p.imageUrl ?? null,
        imageRatio: p.imageRatio ?? 40,
        createdAt: p.createdAt,
      })),
    });
  } catch {
    return NextResponse.json({ posts: [] });
  }
}
