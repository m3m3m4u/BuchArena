import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { createDefaultBloggerProfile } from "@/lib/profile";
import { parseGenres } from "@/lib/genres";

type BloggerDiscoverItem = {
  username: string;
  displayName: string;
  profileImageUrl: string;
  motto: string;
  genres: string[];
  lieblingsbuch: string;
  beschreibung: string;
};

export async function GET() {
  try {
    const usersCollection = await getUsersCollection();

    const users = await usersCollection
      .find(
        {
          bloggerProfile: { $exists: true },
          $or: [{ status: { $exists: false } }, { status: "active" }],
        },
        { projection: { username: 1, profile: 1, bloggerProfile: 1 } }
      )
      .toArray();

    const bloggers: BloggerDiscoverItem[] = [];

    for (const user of users) {
      const bp = user.bloggerProfile ?? createDefaultBloggerProfile();

      // Nur Blogger anzeigen, die mindestens den Namen ausgefüllt haben
      if (!bp.name.value) continue;

      const displayName =
        bp.name.visibility === "public" && bp.name.value
          ? bp.name.value
          : user.username;

      // Prefer blogger-specific image; fall back to general profile image
      let profileImageUrl = "";
      if (bp.profileImage?.visibility === "public" && bp.profileImage.value) {
        profileImageUrl = bp.profileImage.value;
      } else if (
        user.profile?.profileImage?.visibility === "public" &&
        user.profile.profileImage.value
      ) {
        profileImageUrl = user.profile.profileImage.value;
      }

      const motto =
        bp.motto.visibility === "public" ? bp.motto.value : "";

      const genres = bp.genres ? parseGenres(bp.genres) : [];

      const lieblingsbuch =
        bp.lieblingsbuch.visibility === "public" ? bp.lieblingsbuch.value : "";

      const beschreibung =
        bp.beschreibung.visibility === "public" ? bp.beschreibung.value : "";

      bloggers.push({
        username: user.username,
        displayName,
        profileImageUrl,
        motto,
        genres,
        lieblingsbuch,
        beschreibung,
      });
    }

    bloggers.sort((a, b) => a.displayName.localeCompare(b.displayName, "de"));

    return NextResponse.json({ bloggers });
  } catch {
    return NextResponse.json(
      { message: "Blogger konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}
