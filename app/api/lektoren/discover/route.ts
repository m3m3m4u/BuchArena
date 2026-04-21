import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { createDefaultLektorenProfile } from "@/lib/profile";
import { getLesezeichenCollection } from "@/lib/lesezeichen";

type LektorenDiscoverItem = {
  username: string;
  displayName: string;
  profileSlug: string;
  profileImageUrl: string;
  profileImageCrop?: { x: number; y: number; zoom: number };
  motto: string;
  kapazitaeten: number[];
  lesezeichenTotal: number;
};

export async function GET(request: Request) {
  try {
    const usersCollection = await getUsersCollection();
    const q = new URL(request.url).searchParams.get("q")?.trim();

    const baseFilter: Record<string, unknown> = {
      lektorenProfile: { $exists: true },
      $or: [{ status: { $exists: false } }, { status: "active" }],
    };
    if (q) {
      baseFilter.$or = [
        { username: { $regex: q, $options: "i" } },
        { displayName: { $regex: q, $options: "i" } },
        { "lektorenProfile.name.value": { $regex: q, $options: "i" } },
      ];
    }

    const users = await usersCollection
      .find(baseFilter, { projection: { username: 1, profile: 1, lektorenProfile: 1, displayName: 1, profileSlug: 1 } })
      .toArray();

    const lektoren: LektorenDiscoverItem[] = [];

    for (const user of users) {
      const lp = user.lektorenProfile ?? createDefaultLektorenProfile();

      if (!lp.name.value) continue;
      // Deaktivierte Profile ausblenden
      if (lp.deaktiviert) continue;

      const displayName =
        user.displayName
          ? user.displayName
          : lp.name.visibility === "public" && lp.name.value
            ? lp.name.value
            : user.username;

      let profileImageUrl = "";
      let profileImageCrop = lp.profileImage?.crop;
      if (lp.profileImage?.visibility === "public" && lp.profileImage.value) {
        profileImageUrl = lp.profileImage.value;
        profileImageCrop = lp.profileImage.crop;
      } else if (
        user.profile?.profileImage?.visibility === "public" &&
        user.profile.profileImage.value
      ) {
        profileImageUrl = user.profile.profileImage.value;
        profileImageCrop = user.profile.profileImage.crop;
      }

      lektoren.push({
        username: user.username,
        displayName,
        profileSlug: user.profileSlug ?? "",
        profileImageUrl,
        profileImageCrop,
        motto: typeof lp.motto === "string" ? lp.motto : "",
        kapazitaeten: Array.isArray(lp.kapazitaeten) ? lp.kapazitaeten : [],
        lesezeichenTotal: 0,
      });
    }

    const lzCol = await getLesezeichenCollection();
    const lzDocs = await lzCol
      .find({ username: { $in: lektoren.map((l) => l.username) } }, { projection: { username: 1, total: 1 } })
      .toArray();
    const lzMap = new Map(lzDocs.map((l) => [l.username, l.total ?? 0]));
    const lektorenWithLz = lektoren.map((l) => ({ ...l, lesezeichenTotal: lzMap.get(l.username) ?? 0 }));

    return NextResponse.json({ lektoren: lektorenWithLz });
  } catch {
    return NextResponse.json(
      { message: "Lektoren konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}
