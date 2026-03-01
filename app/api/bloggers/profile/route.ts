import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { createDefaultBloggerProfile } from "@/lib/profile";

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
      { projection: { username: 1, profile: 1, bloggerProfile: 1 } }
    );

    if (!user) {
      return NextResponse.json(
        { message: "Blogger nicht gefunden." },
        { status: 404 }
      );
    }

    const bloggerProfile = user.bloggerProfile ?? createDefaultBloggerProfile();

    // Prefer blogger-specific image; fall back to general profile image
    let profileImageUrl = "";
    if (bloggerProfile.profileImage?.visibility === "public" && bloggerProfile.profileImage.value) {
      profileImageUrl = bloggerProfile.profileImage.value;
    } else if (
      user.profile?.profileImage?.visibility === "public" &&
      user.profile.profileImage.value
    ) {
      profileImageUrl = user.profile.profileImage.value;
    }

    return NextResponse.json({
      blogger: {
        username: user.username,
        profileImageUrl,
        bloggerProfile,
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Bloggerprofil konnte nicht geladen werden." },
      { status: 500 }
    );
  }
}
