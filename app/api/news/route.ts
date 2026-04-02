import { NextRequest, NextResponse } from "next/server";
import { getNewsCollection } from "@/lib/news";

export async function GET(req: NextRequest) {
  const all = req.nextUrl.searchParams.get("all") === "true";
  try {
    const col = await getNewsCollection();
    let query = col.find({ active: true }).sort({ createdAt: -1 });
    if (!all) query = query.limit(5);
    const posts = await query.toArray();
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
