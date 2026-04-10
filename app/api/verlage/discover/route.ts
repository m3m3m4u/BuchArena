import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { createDefaultVerlageProfile } from "@/lib/profile";

type VerlageDiscoverItem = {
  username: string;
  displayName: string;
  profileImageUrl: string;
  profileImageCrop?: { x: number; y: number; zoom: number };
  motto: string;
  kapazitaeten: number[];
};

export async function GET() {
  try {
    const usersCollection = await getUsersCollection();

    const users = await usersCollection
      .find(
        {
          verlageProfile: { $exists: true },
          $or: [{ status: { $exists: false } }, { status: "active" }],
        },
        { projection: { username: 1, profile: 1, verlageProfile: 1, displayName: 1 } }
      )
      .limit(500)
      .toArray();

    const verlage: VerlageDiscoverItem[] = [];

    for (const user of users) {
      const vp = user.verlageProfile ?? createDefaultVerlageProfile();

      if (!vp.name.value) continue;
      if (vp.deaktiviert) continue;

      const displayName =
        user.displayName
          ? user.displayName
          : vp.name.visibility === "public" && vp.name.value
            ? vp.name.value
            : user.username;

      let profileImageUrl = "";
      let profileImageCrop = vp.profileImage?.crop;
      if (vp.profileImage?.visibility === "public" && vp.profileImage.value) {
        profileImageUrl = vp.profileImage.value;
        profileImageCrop = vp.profileImage.crop;
      } else if (
        user.profile?.profileImage?.visibility === "public" &&
        user.profile.profileImage.value
      ) {
        profileImageUrl = user.profile.profileImage.value;
        profileImageCrop = user.profile.profileImage.crop;
      }

      verlage.push({
        username: user.username,
        displayName,
        profileImageUrl,
        profileImageCrop,
        motto: typeof vp.motto === "string" ? vp.motto : "",
        kapazitaeten: Array.isArray(vp.kapazitaeten) ? vp.kapazitaeten : [],
      });
    }

    verlage.sort((a, b) => a.displayName.localeCompare(b.displayName, "de"));

    return NextResponse.json({ verlage });
  } catch {
    return NextResponse.json(
      { message: "Verlage konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}
