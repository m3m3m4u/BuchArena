import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDiscussionsCollection, getUsersCollection } from "@/lib/mongodb";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { id?: string };
    const id = body.id?.trim();

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Ungültige Diskussions-ID." },
        { status: 400 }
      );
    }

    const discussions = await getDiscussionsCollection();
    const doc = await discussions.findOne({ _id: new ObjectId(id) });

    if (!doc) {
      return NextResponse.json(
        { message: "Diskussion nicht gefunden." },
        { status: 404 }
      );
    }

    // Collect all unique author usernames (discussion + replies)
    const allAuthors = new Set<string>([doc.authorUsername]);
    for (const r of doc.replies ?? []) {
      allAuthors.add(r.authorUsername);
    }

    const users = await getUsersCollection();
    const authorDocs = await users
      .find({ username: { $in: [...allAuthors] } })
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

    const authorProfiles = profileMap.get(doc.authorUsername);

    const replies = (doc.replies ?? []).map((r) => {
      const rProfiles = profileMap.get(r.authorUsername);
      return {
        id: r._id?.toString() ?? "",
        authorUsername: r.authorUsername,
        displayName: rProfiles?.displayName ?? "",
        body: r.body,
        createdAt: r.createdAt,
        reactions: r.reactions ?? [],
        parentReplyId: r.parentReplyId?.toString() ?? null,
        hasProfile: rProfiles?.hasProfile ?? false,
        hasSpeakerProfile: rProfiles?.hasSpeakerProfile ?? false,
        hasBloggerProfile: rProfiles?.hasBloggerProfile ?? false,
      };
    });

    return NextResponse.json({
      discussion: {
        id: doc._id.toString(),
        authorUsername: doc.authorUsername,
        displayName: authorProfiles?.displayName ?? "",
        title: doc.title,
        body: doc.body,
        replyCount: doc.replyCount ?? 0,
        lastActivityAt: doc.lastActivityAt,
        createdAt: doc.createdAt,
        replies,
        reactions: doc.reactions ?? [],
        hasProfile: authorProfiles?.hasProfile ?? false,
        hasSpeakerProfile: authorProfiles?.hasSpeakerProfile ?? false,
        hasBloggerProfile: authorProfiles?.hasBloggerProfile ?? false,
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Diskussion konnte nicht geladen werden." },
      { status: 500 }
    );
  }
}
