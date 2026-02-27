import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { createDefaultSpeakerProfile } from "@/lib/profile";

type SpeakerDiscoverItem = {
  username: string;
  displayName: string;
  profileImageUrl: string;
  ort: string;
  motto: string;
  sprechprobenCount: number;
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
        { projection: { username: 1, profile: 1, speakerProfile: 1 } }
      )
      .toArray();

    const speakers: SpeakerDiscoverItem[] = [];

    for (const user of users) {
      const sp = user.speakerProfile ?? createDefaultSpeakerProfile();

      // Nur Sprecher anzeigen, die mindestens den Namen ausgefüllt haben
      if (!sp.name.value) continue;

      const displayName =
        sp.name.visibility === "public" && sp.name.value
          ? sp.name.value
          : user.username;

      const profileImageUrl =
        user.profile?.profileImage?.visibility === "public"
          ? user.profile.profileImage.value ?? ""
          : "";

      const ort =
        sp.ort.visibility === "public" ? sp.ort.value : "";

      const motto =
        sp.motto.visibility === "public" ? sp.motto.value : "";

      speakers.push({
        username: user.username,
        displayName,
        profileImageUrl,
        ort,
        motto,
        sprechprobenCount: sp.sprechproben?.length ?? 0,
      });
    }

    speakers.sort((a, b) => a.displayName.localeCompare(b.displayName, "de"));

    return NextResponse.json({ speakers });
  } catch {
    return NextResponse.json(
      { message: "Sprecher konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}
