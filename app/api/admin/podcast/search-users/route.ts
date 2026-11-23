import { NextRequest, NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { getProfileDisplayName } from "@/lib/profile";
import type { KooperationsRolle } from "@/lib/kooperationen";

function isAdmin(role: string) {
  return role === "ADMIN" || role === "SUPERADMIN";
}

/**
 * GET /api/admin/podcast/search-users?q=abc
 * Sucht Profile/Benutzer für die Verlinkung in Podcast-Folgen (nur Admin).
 */
export async function GET(req: NextRequest) {
  try {
    const account = await getServerAccount();
    if (!account || !isAdmin(account.role)) {
      return NextResponse.json({ users: [] }, { status: 403 });
    }

    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (q.length < 1) {
      return NextResponse.json({ users: [] });
    }

    const usersCol = await getUsersCollection();
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const list = await usersCol
      .find(
        {
          $and: [
            { $or: [{ status: { $exists: false } }, { status: "active" }] },
            {
              $or: [
                { username: { $regex: escaped, $options: "i" } },
                { displayName: { $regex: escaped, $options: "i" } },
                { "profile.name.value": { $regex: escaped, $options: "i" } },
                { "speakerProfile.name.value": { $regex: escaped, $options: "i" } },
                { "bloggerProfile.name.value": { $regex: escaped, $options: "i" } },
                { "testleserProfile.name.value": { $regex: escaped, $options: "i" } },
                { "lektorenProfile.name.value": { $regex: escaped, $options: "i" } },
                { "verlageProfile.name.value": { $regex: escaped, $options: "i" } },
              ],
            },
          ],
        },
        {
          projection: {
            _id: 0,
            username: 1,
            displayName: 1,
            "profile.name.value": 1,
            "profile.profileImage.value": 1,
            "speakerProfile.name.value": 1,
            "speakerProfile.profileImage.value": 1,
            "bloggerProfile.name.value": 1,
            "bloggerProfile.profileImage.value": 1,
            "testleserProfile.name.value": 1,
            "testleserProfile.profileImage.value": 1,
            "lektorenProfile.name.value": 1,
            "lektorenProfile.profileImage.value": 1,
            "verlageProfile.name.value": 1,
            "verlageProfile.profileImage.value": 1,
          },
        },
      )
      .sort({ username: 1 })
      .limit(15)
      .toArray();

    const users = list.map((u) => {
      const availableRoles: KooperationsRolle[] = [];
      if (u.profile) availableRoles.push("autor");
      if (u.speakerProfile) availableRoles.push("sprecher");
      if (u.bloggerProfile) availableRoles.push("blogger");
      if (u.testleserProfile) availableRoles.push("testleser");
      if (u.lektorenProfile) availableRoles.push("lektor");
      if (u.verlageProfile) availableRoles.push("verlag");
      if (availableRoles.length === 0) availableRoles.push("autor");

      return {
        username: u.username,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        displayName: getProfileDisplayName(u as any) || u.username,
        profileImage:
          u.profile?.profileImage?.value ||
          u.speakerProfile?.profileImage?.value ||
          u.bloggerProfile?.profileImage?.value ||
          u.testleserProfile?.profileImage?.value ||
          u.lektorenProfile?.profileImage?.value ||
          u.verlageProfile?.profileImage?.value ||
          "",
        availableRoles,
      };
    });

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ users: [] }, { status: 500 });
  }
}
