import { NextResponse } from "next/server";
import { getSupportCollection } from "@/lib/mongodb";

export async function GET() {
  try {
    const support = await getSupportCollection();
    const posts = await support.find({}).sort({ createdAt: -1 }).toArray();

    const list = posts.map((p) => ({
      id: p._id.toString(),
      authorUsername: p.authorUsername,
      title: p.title,
      body: p.body,
      createdAt: p.createdAt,
    }));

    return NextResponse.json({ posts: list });
  } catch {
    return NextResponse.json(
      { message: "Beiträge konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}
