import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { createDefaultTestleserProfile } from "@/lib/profile";
import { parseGenres } from "@/lib/genres";
import { getLesezeichenCollection } from "@/lib/lesezeichen";

type TestleserDiscoverItem = {
  username: string;
  displayName: string;
  profileImageUrl: string;
  profileImageCrop?: { x: number; y: number; zoom: number };
  genres: string[];
  verfuegbar: boolean;
  lesezeichenTotal: number;
};

export async function GET() {
  try {
    const usersCollection = await getUsersCollection();

    const users = await usersCollection
      .find(
        {
          testleserProfile: { $exists: true },
          $or: [{ status: { $exists: false } }, { status: "active" }],
        },
        { projection: { username: 1, profile: 1, testleserProfile: 1, displayName: 1 } }
      )
      .limit(500)
      .toArray();

    const testleser: TestleserDiscoverItem[] = [];

    for (const user of users) {
      const tp = user.testleserProfile ?? createDefaultTestleserProfile();

      if (!tp.name.value) continue;
      // Deaktivierte Profile ausblenden
      if (tp.deaktiviert) continue;

      const displayName =
        user.displayName
          ? user.displayName
          : tp.name.visibility === "public" && tp.name.value
            ? tp.name.value
            : user.username;

      let profileImageUrl = "";
      let profileImageCrop = tp.profileImage?.crop;
      if (tp.profileImage?.visibility === "public" && tp.profileImage.value) {
        profileImageUrl = tp.profileImage.value;
        profileImageCrop = tp.profileImage.crop;
      } else if (
        user.profile?.profileImage?.visibility === "public" &&
        user.profile.profileImage.value
      ) {
        profileImageUrl = user.profile.profileImage.value;
        profileImageCrop = user.profile.profileImage.crop;
      }

      const genres = tp.genres ? parseGenres(tp.genres) : [];

      testleser.push({
        username: user.username,
        displayName,
        profileImageUrl,
        profileImageCrop,
        genres,
        verfuegbar: !!tp.verfuegbar,
        lesezeichenTotal: 0,
      });
    }

    const lzCol = await getLesezeichenCollection();
    const lzDocs = await lzCol
      .find({ username: { $in: testleser.map((t) => t.username) } }, { projection: { username: 1, total: 1 } })
      .toArray();
    const lzMap = new Map(lzDocs.map((l) => [l.username, l.total ?? 0]));
    const testleserWithLz = testleser.map((t) => ({ ...t, lesezeichenTotal: lzMap.get(t.username) ?? 0 }));

    return NextResponse.json({ testleser: testleserWithLz });
  } catch {
    return NextResponse.json(
      { message: "Testleser konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}
