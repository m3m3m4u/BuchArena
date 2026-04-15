import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getBlogCollection } from "@/lib/blog";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
    }
    const col = await getBlogCollection();
    const post = await col.findOne({ _id: new ObjectId(id), status: "approved" });
    if (!post) {
      return NextResponse.json({ message: "Nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({
      post: {
        _id: post._id!.toString(),
        title: post.title,
        htmlContent: post.htmlContent,
        excerpt: post.excerpt ?? "",
        authorUsername: post.authorUsername,
        authorDisplayName: post.authorDisplayName ?? post.authorUsername,
        createdAt: post.createdAt,
      },
    });
  } catch {
    return NextResponse.json({ message: "Fehler." }, { status: 500 });
  }
}
