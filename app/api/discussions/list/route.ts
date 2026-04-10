import { NextResponse } from "next/server";
import { getDiscussionsCollection, getUsersCollection, getDiscussionReadsCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

export async function GET() {
  try {
    const account = await getServerAccount();
    const currentUser = account?.username ?? "";

    const discussions = await getDiscussionsCollection();
    const docs = await discussions
      .find({})
      .sort({ lastActivityAt: -1 })
      .project({
        authorUsername: 1,
        title: 1,
        body: 1,
        topic: 1,
        replyCount: 1,
        lastActivityAt: 1,
        createdAt: 1,
        "replies.authorUsername": 1,
      })
      .limit(500)
      .toArray();

    // Build set of discussion IDs where current user participated
    const participatedIds = new Set<string>();
    for (const d of docs) {
      const id = d._id.toString();
      if (d.authorUsername === currentUser) {
        participatedIds.add(id);
        continue;
      }
      const replies = (d.replies ?? []) as { authorUsername: string }[];
      if (replies.some((r) => r.authorUsername === currentUser)) {
        participatedIds.add(id);
      }
    }

    // Fetch read timestamps for participated discussions
    let readMap = new Map<string, Date>();
    if (currentUser && participatedIds.size > 0) {
      const readsCol = await getDiscussionReadsCollection();
      const reads = await readsCol
        .find({ username: currentUser, discussionId: { $in: [...participatedIds] } })
        .toArray();
      readMap = new Map(reads.map((r) => [r.discussionId, r.readAt]));
    }

    // Collect unique author usernames and look up their profiles
    const authorNames = [...new Set(docs.map((d) => d.authorUsername as string))];
    const users = await getUsersCollection();
    const authorDocs = await users
      .find({ username: { $in: authorNames } })
      .project({ username: 1, profile: 1, speakerProfile: 1, bloggerProfile: 1, displayName: 1 })
      .toArray();

    const profileMap = new Map<string, { hasProfile: boolean; hasSpeakerProfile: boolean; hasBloggerProfile: boolean; displayName: string }>();
    for (const u of authorDocs) {
      const p = u.profile as Record<string, unknown> | undefined;
      const sp = u.speakerProfile as Record<string, unknown> | undefined;
      const bp = u.bloggerProfile as Record<string, unknown> | undefined;
      profileMap.set(u.username, {
        hasProfile: !!(p?.name as { value?: string } | undefined)?.value?.trim(),
        hasSpeakerProfile: !!(sp?.name as { value?: string } | undefined)?.value?.trim(),
        hasBloggerProfile: !!(bp?.name as { value?: string } | undefined)?.value?.trim(),
        displayName: (u.displayName as string) || "",
      });
    }

    const list = docs.map((d) => {
      const profiles = profileMap.get(d.authorUsername as string);
      const id = d._id.toString();
      const participated = participatedIds.has(id);
      const readAt = readMap.get(id);
      const lastActivity = d.lastActivityAt ? new Date(d.lastActivityAt as Date) : new Date(0);
      const unread = participated && (!readAt || lastActivity > readAt);

      return {
        id,
        authorUsername: d.authorUsername,
        displayName: profiles?.displayName ?? "",
        title: d.title,
        body: d.body,
        topic: d.topic ?? "Allgemein",
        replyCount: d.replyCount ?? 0,
        lastActivityAt: d.lastActivityAt,
        createdAt: d.createdAt,
        hasProfile: profiles?.hasProfile ?? false,
        hasSpeakerProfile: profiles?.hasSpeakerProfile ?? false,
        hasBloggerProfile: profiles?.hasBloggerProfile ?? false,
        unread,
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
