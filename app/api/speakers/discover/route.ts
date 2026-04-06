import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { createDefaultSpeakerProfile } from "@/lib/profile";
import { getLesezeichenCollection } from "@/lib/lesezeichen";

type SpeakerDiscoverItem = {
  username: string;
  displayName: string;
  profileImageUrl: string;
  profileImageCrop?: { x: number; y: number; zoom: number };
  ort: string;
  motto: string;
  sprechprobenCount: number;
  lesezeichenTotal: number;
};

export async function GET() {
  try {
    const usersCollection = await getUsersCollection();

    const users = await usersCollection
      .find(
        {
          speakerProfile: { $exists: true },
          $or: [{ status: { $exists: false } }, { status: "active" }],
        },
        { projection: { username: 1, profile: 1, speakerProfile: 1, displayName: 1 } }
      )
      .limit(500)
      .toArray();

    const speakers: SpeakerDiscoverItem[] = [];

    for (const user of users) {
      const sp = user.speakerProfile ?? createDefaultSpeakerProfile();

      // Nur Sprecher anzeigen, die mindestens den Namen ausgefüllt haben
      if (!sp.name.value) continue;
      // Deaktivierte Profile ausblenden
      if (sp.deaktiviert) continue;

      const displayName =
        user.displayName
          ? user.displayName
          : sp.name.visibility === "public" && sp.name.value
            ? sp.name.value
            : user.username;

      // Prefer speaker-specific image; fall back to general profile image
      let profileImageUrl = "";
      let profileImageCrop = sp.profileImage?.crop;
      if (sp.profileImage?.visibility === "public" && sp.profileImage.value) {
        profileImageUrl = sp.profileImage.value;
        profileImageCrop = sp.profileImage.crop;
      } else if (
        user.profile?.profileImage?.visibility === "public" &&
        user.profile.profileImage.value
      ) {
        profileImageUrl = user.profile.profileImage.value;
        profileImageCrop = user.profile.profileImage.crop;
      }

      const ort =
        sp.ort.visibility === "public" ? sp.ort.value : "";

      const motto =
        sp.motto.visibility === "public" ? sp.motto.value : "";

      speakers.push({
        username: user.username,
        displayName,
        profileImageUrl,
        profileImageCrop,
        ort,
        motto,
        sprechprobenCount: sp.sprechproben?.length ?? 0,
        lesezeichenTotal: 0,
      });
    }

    const lzCol = await getLesezeichenCollection();
    const lzDocs = await lzCol
      .find({ username: { $in: speakers.map((s) => s.username) } }, { projection: { username: 1, total: 1 } })
      .toArray();
    const lzMap = new Map(lzDocs.map((l) => [l.username, l.total ?? 0]));
    const speakersWithLz = speakers.map((s) => ({ ...s, lesezeichenTotal: lzMap.get(s.username) ?? 0 }));

    return NextResponse.json({ speakers: speakersWithLz });
  } catch {
    return NextResponse.json(
      { message: "Sprecher konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}
