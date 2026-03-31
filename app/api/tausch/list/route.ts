import { NextResponse } from "next/server";
import { getTauschCollection } from "@/lib/mongodb";

export async function GET() {
  try {
    const col = await getTauschCollection();
    const docs = await col
      .find({})
      .sort({ createdAt: -1 })
      .project({ authorUsername: 1, title: 1, description: 1, category: 1, status: 1, createdAt: 1 })
      .limit(500)
      .toArray();

    const list = docs.map((d) => ({
      id: d._id.toString(),
      authorUsername: d.authorUsername,
      title: d.title,
      description: d.description,
      category: d.category,
      status: d.status,
      createdAt: d.createdAt,
    }));

    return NextResponse.json({ items: list });
  } catch {
    return NextResponse.json({ message: "Tauschbörse konnte nicht geladen werden." }, { status: 500 });
  }
}
