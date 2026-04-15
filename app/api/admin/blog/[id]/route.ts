/** Route, die einen einzelnen Blog-Post für die Admin-Bearbeitung liefert */
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { getBlogCollection } from "@/lib/blog";

function forbidden() {
  return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const account = await getServerAccount();
  if (!account || (account.role !== "ADMIN" && account.role !== "SUPERADMIN")) {
    return forbidden();
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
  }

  const col = await getBlogCollection();
  const post = await col.findOne({ _id: new ObjectId(id) });
  if (!post) {
    return NextResponse.json({ message: "Nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({
    post: {
      _id: post._id!.toString(),
      title: post.title,
      htmlContent: post.htmlContent,
      excerpt: post.excerpt ?? "",
      status: post.status,
      authorUsername: post.authorUsername,
      authorDisplayName: post.authorDisplayName ?? post.authorUsername,
      rejectionNote: post.rejectionNote ?? null,
      reviewedBy: post.reviewedBy ?? null,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    },
  });
}
