import { NextResponse } from "next/server";
import { findUserBySlugOrUsername } from "@/lib/mongodb";
import { createDefaultTestleserProfile } from "@/lib/profile";

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

    const user = await findUserBySlugOrUsername(username, { username: 1, profile: 1, testleserProfile: 1 });

    if (!user) {
      return NextResponse.json(
        { message: "Testleser nicht gefunden." },
        { status: 404 }
      );
    }

    const testleserProfile = user.testleserProfile ?? createDefaultTestleserProfile();

    let profileImageUrl = "";
    let profileImageCrop = testleserProfile.profileImage?.crop;
    if (testleserProfile.profileImage?.visibility === "public" && testleserProfile.profileImage.value) {
      profileImageUrl = testleserProfile.profileImage.value;
      profileImageCrop = testleserProfile.profileImage.crop;
    } else if (
      user.profile?.profileImage?.visibility === "public" &&
      user.profile.profileImage.value
    ) {
      profileImageUrl = user.profile.profileImage.value;
      profileImageCrop = user.profile.profileImage.crop;
    }

    return NextResponse.json({
      testleser: {
        username: user.username,
        profileImageUrl,
        profileImageCrop,
        testleserProfile,
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Testleserprofil konnte nicht geladen werden." },
      { status: 500 }
    );
  }
}
