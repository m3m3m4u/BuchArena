import { NextRequest, NextResponse } from "next/server";
import { getBlogCollection } from "@/lib/blog";

export async function GET(req: NextRequest) {
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10));
  const limit = 10;
  const skip = (page - 1) * limit;

  try {
    const col = await getBlogCollection();
    const [posts, total] = await Promise.all([
      col
        .find({ status: "approved" }, { projection: { htmlContent: 0 } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      col.countDocuments({ status: "approved" }),
    ]);
    return NextResponse.json({
      posts: posts.map((p) => ({
        _id: p._id!.toString(),
        title: p.title,
        excerpt: p.excerpt ?? "",
        authorUsername: p.authorUsername,
        authorDisplayName: p.authorDisplayName ?? p.authorUsername,
        createdAt: p.createdAt,
      })),
      total,
      page,
    });
  } catch {
    return NextResponse.json({ posts: [], total: 0, page: 1 });
  }
}
