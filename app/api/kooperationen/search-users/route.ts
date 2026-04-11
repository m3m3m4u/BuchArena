import { NextRequest, NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import type { KooperationsRolle } from "@/lib/kooperationen";

/**
 * GET /api/kooperationen/search-users?q=abc&role=sprecher
 * Sucht User, die die angegebene Rolle (Profil) haben.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getServerAccount();
    if (!user) {
      return NextResponse.json({ users: [] }, { status: 401 });
    }

    if (!checkRateLimit(`kooperation-search:${user.username}`, 60, 60 * 1000)) {
      return NextResponse.json({ users: [] }, { status: 429 });
    }

    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    const role = req.nextUrl.searchParams.get("role")?.trim() as KooperationsRolle | undefined;

    if (q.length < 1) {
      return NextResponse.json({ users: [] });
    }

    // Map role to the profile field that must exist
    const roleField: Record<KooperationsRolle, string> = {
      autor: "profile",
      sprecher: "speakerProfile",
      blogger: "bloggerProfile",
      testleser: "testleserProfile",
      lektor: "lektorenProfile",
      verlag: "verlageProfile",
    };

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const nameFilter: Record<string, unknown>[] = [
      { username: { $regex: `^${escaped}`, $options: "i" } },
      { "profile.name.value": { $regex: escaped, $options: "i" } },
      { displayName: { $regex: escaped, $options: "i" } },
    ];

    const filter: Record<string, unknown> = {
      $and: [
        { $or: nameFilter },
        { $or: [{ status: { $exists: false } }, { status: "active" }] },
      ],
    };

    if (role && roleField[role]) {
      filter[roleField[role]] = { $exists: true };
    }

    const usersCol = await getUsersCollection();
    const list = await usersCol
      .find(filter, { projection: { _id: 0, username: 1, displayName: 1, profile: 1 } })
      .sort({ username: 1 })
      .limit(15)
      .toArray();

    const users = list
      .filter((u) => u.username !== user.username || user.role === "SUPERADMIN")
      .map((u) => ({
        username: u.username,
        displayName:
          u.displayName ||
          (u.profile?.name?.visibility === "public" && u.profile?.name?.value
            ? u.profile.name.value
            : u.username),
        profileImage: u.profile?.profileImage?.value ?? "",
      }));

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ users: [] }, { status: 500 });
  }
}
