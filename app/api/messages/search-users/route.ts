import { NextRequest, NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { checkRateLimit } from "@/lib/rate-limit";

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
        { projection: { _id: 0, username: 1, profile: 1, displayName: 1 } },
      )
      .sort({ username: 1 })
      .limit(15)
      .toArray();

    const users = list
      .filter((u) => u.username !== user.username)
      .map((u) => {
        const dn = (u as unknown as { displayName?: string }).displayName;
        return {
          username: u.username,
          displayName:
            dn ||
            (u.profile?.name?.visibility === "public" && u.profile?.name?.value
              ? u.profile.name.value
              : u.username),
          profileImage: u.profile?.profileImage?.value ?? "",
        };
      });

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ users: [] }, { status: 500 });
  }
}
