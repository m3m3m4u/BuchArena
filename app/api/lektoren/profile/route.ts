import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { createDefaultLektorenProfile } from "@/lib/profile";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username")?.trim();

    if (!username) {
      return NextResponse.json(
        { message: "Benutzername fehlt." },
        { status: 400 }
      );
    }

    const users = await getUsersCollection();

    const user = await users.findOne(
      { username },
      { projection: { username: 1, profile: 1, lektorenProfile: 1 } }
    );

    if (!user) {
      return NextResponse.json(
        { message: "Lektor nicht gefunden." },
        { status: 404 }
      );
    }

    const lektorenProfile = user.lektorenProfile ?? createDefaultLektorenProfile();

    let profileImageUrl = "";
    let profileImageCrop = lektorenProfile.profileImage?.crop;
    if (lektorenProfile.profileImage?.visibility === "public" && lektorenProfile.profileImage.value) {
      profileImageUrl = lektorenProfile.profileImage.value;
      profileImageCrop = lektorenProfile.profileImage.crop;
    } else if (
      user.profile?.profileImage?.visibility === "public" &&
      user.profile.profileImage.value
    ) {
      profileImageUrl = user.profile.profileImage.value;
      profileImageCrop = user.profile.profileImage.crop;
    }

    return NextResponse.json({
      lektor: {
        username: user.username,
        profileImageUrl,
        profileImageCrop,
        lektorenProfile,
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Lektorenprofil konnte nicht geladen werden." },
      { status: 500 }
    );
  }
}
