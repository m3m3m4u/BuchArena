import { NextResponse } from "next/server";
import { getDiscussionsCollection, getUsersCollection } from "@/lib/mongodb";

export async function GET() {
  try {
    const discussions = await getDiscussionsCollection();
    const docs = await discussions
      .find({})
      .sort({ lastActivityAt: -1 })
      .project({
        authorUsername: 1,
        title: 1,
        body: 1,
        replyCount: 1,
        lastActivityAt: 1,
        createdAt: 1,
      })
      .toArray();

    // Collect unique author usernames and look up their profiles
    const authorNames = [...new Set(docs.map((d) => d.authorUsername as string))];
    const users = await getUsersCollection();
    const authorDocs = await users
      .find({ username: { $in: authorNames } })
      .project({ username: 1, profile: 1, speakerProfile: 1, bloggerProfile: 1 })
      .toArray();

    const profileMap = new Map<string, { hasProfile: boolean; hasSpeakerProfile: boolean; hasBloggerProfile: boolean }>();
    for (const u of authorDocs) {
      const p = u.profile as Record<string, unknown> | undefined;
      const sp = u.speakerProfile as Record<string, unknown> | undefined;
      const bp = u.bloggerProfile as Record<string, unknown> | undefined;
      profileMap.set(u.username, {
        hasProfile: !!(p?.name as { value?: string } | undefined)?.value?.trim(),
        hasSpeakerProfile: !!(sp?.name as { value?: string } | undefined)?.value?.trim(),
        hasBloggerProfile: !!(bp?.name as { value?: string } | undefined)?.value?.trim(),
      });
    }

    const list = docs.map((d) => {
      const profiles = profileMap.get(d.authorUsername as string);
      return {
        id: d._id.toString(),
        authorUsername: d.authorUsername,
        title: d.title,
        body: d.body,
        replyCount: d.replyCount ?? 0,
        lastActivityAt: d.lastActivityAt,
        createdAt: d.createdAt,
        hasProfile: profiles?.hasProfile ?? false,
        hasSpeakerProfile: profiles?.hasSpeakerProfile ?? false,
        hasBloggerProfile: profiles?.hasBloggerProfile ?? false,
      };
    });

    return NextResponse.json({ discussions: list });
  } catch {
    return NextResponse.json(
      { message: "Diskussionen konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}
