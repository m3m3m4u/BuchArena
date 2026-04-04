import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { createDefaultVerlageProfile } from "@/lib/profile";

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
      { projection: { username: 1, profile: 1, verlageProfile: 1 } }
    );

    if (!user) {
      return NextResponse.json(
        { message: "Verlag nicht gefunden." },
        { status: 404 }
      );
    }

    const verlageProfile = user.verlageProfile ?? createDefaultVerlageProfile();

    let profileImageUrl = "";
    let profileImageCrop = verlageProfile.profileImage?.crop;
    if (verlageProfile.profileImage?.visibility === "public" && verlageProfile.profileImage.value) {
      profileImageUrl = verlageProfile.profileImage.value;
      profileImageCrop = verlageProfile.profileImage.crop;
    } else if (
      user.profile?.profileImage?.visibility === "public" &&
      user.profile.profileImage.value
    ) {
      profileImageUrl = user.profile.profileImage.value;
      profileImageCrop = user.profile.profileImage.crop;
    }

    return NextResponse.json({
      verlag: {
        username: user.username,
        profileImageUrl,
        profileImageCrop,
        verlageProfile,
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Verlagsprofil konnte nicht geladen werden." },
      { status: 500 }
    );
  }
}
