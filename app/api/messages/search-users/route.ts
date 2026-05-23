import { NextRequest, NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getProfileDisplayName } from "@/lib/profile";

/**
 * GET /api/messages/search-users?q=abc
 * Returns active users whose username starts with the given query (case-insensitive).
 * Excludes the currently logged-in user.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getServerAccount();
    if (!user) {
      return NextResponse.json({ users: [] }, { status: 401 });
    }

    // Rate-Limiting: max 60 Suchen pro Minute pro User
    if (!checkRateLimit(`search-users:${user.username}`, 60, 60 * 1000)) {
      return NextResponse.json({ users: [] }, { status: 429 });
    }

    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (q.length < 1) {
      return NextResponse.json({ users: [] });
    }

    const usersCol = await getUsersCollection();

    const list = await usersCol
      .find(
        {
          username: { $regex: `^${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, $options: "i" },
          $or: [{ status: { $exists: false } }, { status: "active" }],
        },
        { projection: { _id: 0, username: 1, displayName: 1, "profile.name.value": 1, "lektorenProfile.name.value": 1, "verlageProfile.name.value": 1, "testleserProfile.name.value": 1, "bloggerProfile.name.value": 1, "speakerProfile.name.value": 1, "profile.profileImage.value": 1 } },
      )
      .sort({ username: 1 })
      .limit(15)
      .toArray();

    const users = list
      .filter((u) => u.username !== user.username)
      .map((u) => {
        return {
          username: u.username,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          displayName: getProfileDisplayName(u as any) || u.username,
          profileImage: u.profile?.profileImage?.value ?? "",
        };
      });

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ users: [] }, { status: 500 });
  }
}
