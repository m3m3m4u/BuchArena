import { NextResponse } from "next/server";
import { getServerAccount } from "@/lib/server-auth";
import { getBlogCollection, extractExcerpt } from "@/lib/blog";
import { getUsersCollection } from "@/lib/mongodb";

export async function POST(request: Request) {
  const account = await getServerAccount();
  if (!account) {
    return NextResponse.json({ message: "Nicht eingeloggt." }, { status: 401 });
  }

  const body = (await request.json()) as { title?: string; htmlContent?: string };
  const title = body.title?.trim();
  const htmlContent = body.htmlContent?.trim();

  if (!title) {
    return NextResponse.json({ message: "Titel ist erforderlich." }, { status: 400 });
  }
  if (!htmlContent) {
    return NextResponse.json({ message: "Inhalt ist erforderlich." }, { status: 400 });
  }

  // Anzeigenamen laden
  const users = await getUsersCollection();
  const user = await users.findOne({ username: account.username }, { projection: { displayName: 1 } });

  const col = await getBlogCollection();
  const now = new Date();
  const result = await col.insertOne({
    title,
    htmlContent,
    excerpt: extractExcerpt(htmlContent),
    status: "pending",
    authorUsername: account.username,
    authorDisplayName: user?.displayName ?? account.username,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ message: "Eingereicht.", id: result.insertedId.toString() });
}
