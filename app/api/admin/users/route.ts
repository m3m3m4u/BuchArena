import { NextResponse } from "next/server";
import { getUsersCollection, getBooksCollection } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/server-auth";

function hasFilledProfile(profile: Record<string, unknown> | undefined | null): boolean {
  if (!profile) return false;
  const name = profile.name as { value?: string } | undefined;
  return !!(name?.value?.trim());
}

function hasFilledSpeakerProfile(sp: Record<string, unknown> | undefined | null): boolean {
  if (!sp) return false;
  const name = sp.name as { value?: string } | undefined;
  return !!(name?.value?.trim());
}

function hasFilledBloggerProfile(bp: Record<string, unknown> | undefined | null): boolean {
  if (!bp) return false;
  const name = bp.name as { value?: string } | undefined;
  return !!(name?.value?.trim());
}

export async function POST() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json(
        { message: "Kein Zugriff auf die User-Übersicht." },
        { status: 403 }
      );
    }

    const users = await getUsersCollection();

    const list = await users
      .find({}, { projection: { _id: 0, username: 1, email: 1, role: 1, status: 1, createdAt: 1, lastOnline: 1, profile: 1, speakerProfile: 1, bloggerProfile: 1, newsletterOptIn: 1 } })
      .sort({ username: 1 })
      .limit(2000)
      .toArray();

    // Count books per user in one aggregation
    const booksCol = await getBooksCollection();
    const bookCounts = await booksCol.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$ownerUsername", count: { $sum: 1 } } },
    ]).toArray();
    const bookCountMap = new Map(bookCounts.map((b) => [b._id, b.count]));

    const result = list.map((u) => ({
      username: u.username,
      email: u.email,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt ?? null,
      lastOnline: u.lastOnline ?? null,
      hasProfile: hasFilledProfile(u.profile as Record<string, unknown> | undefined),
      hasSpeakerProfile: hasFilledSpeakerProfile(u.speakerProfile as Record<string, unknown> | undefined),
      hasBloggerProfile: hasFilledBloggerProfile(u.bloggerProfile as Record<string, unknown> | undefined),
      bookCount: bookCountMap.get(u.username) ?? 0,
      newsletterOptIn: !!(u as Record<string, unknown>).newsletterOptIn,
    }));

    return NextResponse.json({ users: result });
  } catch {
    return NextResponse.json(
      { message: "User-Übersicht konnte nicht geladen werden." },
      { status: 500 }
    );
  }
}
