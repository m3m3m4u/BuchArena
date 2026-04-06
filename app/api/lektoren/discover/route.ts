import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { createDefaultLektorenProfile } from "@/lib/profile";
import { getLesezeichenCollection } from "@/lib/lesezeichen";

type LektorenDiscoverItem = {
  username: string;
  displayName: string;
  profileImageUrl: string;
  profileImageCrop?: { x: number; y: number; zoom: number };
  kapazitaeten: number[];
  lesezeichenTotal: number;
};

export async function GET() {
  try {
    const usersCollection = await getUsersCollection();

    const users = await usersCollection
      .find(
        {
          lektorenProfile: { $exists: true },
          $or: [{ status: { $exists: false } }, { status: "active" }],
        },
        { projection: { username: 1, profile: 1, lektorenProfile: 1, displayName: 1 } }
      )
      .limit(500)
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
        profileImageUrl,
        profileImageCrop,
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
