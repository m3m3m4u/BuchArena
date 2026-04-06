import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { createDefaultBloggerProfile } from "@/lib/profile";
import { parseGenres } from "@/lib/genres";
import { getLesezeichenCollection } from "@/lib/lesezeichen";

type BloggerDiscoverItem = {
  username: string;
  displayName: string;
  profileImageUrl: string;
  profileImageCrop?: { x: number; y: number; zoom: number };
  motto: string;
  genres: string[];
  lieblingsbuch: string;
  beschreibung: string;
  lesezeichenTotal: number;
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
        { projection: { username: 1, profile: 1, bloggerProfile: 1, displayName: 1 } }
      )
      .limit(500)
      .toArray();

    const bloggers: BloggerDiscoverItem[] = [];

    for (const user of users) {
      const bp = user.bloggerProfile ?? createDefaultBloggerProfile();

      // Nur Blogger anzeigen, die mindestens den Namen ausgefüllt haben
      if (!bp.name.value) continue;
      // Deaktivierte Profile ausblenden
      if (bp.deaktiviert) continue;

      const displayName =
        user.displayName
          ? user.displayName
          : bp.name.visibility === "public" && bp.name.value
            ? bp.name.value
            : user.username;

      // Prefer blogger-specific image; fall back to general profile image
      let profileImageUrl = "";
      let profileImageCrop = bp.profileImage?.crop;
      if (bp.profileImage?.visibility === "public" && bp.profileImage.value) {
        profileImageUrl = bp.profileImage.value;
        profileImageCrop = bp.profileImage.crop;
      } else if (
        user.profile?.profileImage?.visibility === "public" &&
        user.profile.profileImage.value
      ) {
        profileImageUrl = user.profile.profileImage.value;
        profileImageCrop = user.profile.profileImage.crop;
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
        profileImageCrop,
        motto,
        genres,
        lieblingsbuch,
        beschreibung,
        lesezeichenTotal: 0,
      });
    }

    const lzCol = await getLesezeichenCollection();
    const lzDocs = await lzCol
      .find({ username: { $in: bloggers.map((b) => b.username) } }, { projection: { username: 1, total: 1 } })
      .toArray();
    const lzMap = new Map(lzDocs.map((l) => [l.username, l.total ?? 0]));
    const bloggersWithLz = bloggers.map((b) => ({ ...b, lesezeichenTotal: lzMap.get(b.username) ?? 0 }));

    return NextResponse.json({ bloggers: bloggersWithLz });
  } catch {
    return NextResponse.json(
      { message: "Blogger konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}
