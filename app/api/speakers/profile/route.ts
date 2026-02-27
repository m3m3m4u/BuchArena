import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { createDefaultSpeakerProfile } from "@/lib/profile";

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
      { projection: { username: 1, profile: 1, speakerProfile: 1 } }
    );

    if (!user) {
      return NextResponse.json(
        { message: "Sprecher nicht gefunden." },
        { status: 404 }
      );
    }

    const speakerProfile = user.speakerProfile ?? createDefaultSpeakerProfile();

    // Prefer speaker-specific image; fall back to general profile image
    let profileImageUrl = "";
    if (speakerProfile.profileImage?.visibility === "public" && speakerProfile.profileImage.value) {
      profileImageUrl = speakerProfile.profileImage.value;
    } else if (
      user.profile?.profileImage?.visibility === "public" &&
      user.profile.profileImage.value
    ) {
      profileImageUrl = user.profile.profileImage.value;
    }

    return NextResponse.json({
      speaker: {
        username: user.username,
        profileImageUrl,
        speakerProfile,
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Sprecherprofil konnte nicht geladen werden." },
      { status: 500 }
    );
  }
}
