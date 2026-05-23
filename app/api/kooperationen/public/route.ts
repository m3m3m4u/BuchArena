import { NextRequest, NextResponse } from "next/server";
import { getKooperationenCollection, getUsersCollection } from "@/lib/mongodb";
import { ROLLE_LABELS, ROLLE_PROFILE_PATH, type KooperationsRolle } from "@/lib/kooperationen";
import { getProfileDisplayName } from "@/lib/profile";

/** GET /api/kooperationen/public?username=xxx – Bestätigte Kooperationen eines Users */
export async function GET(req: NextRequest) {
  try {
    const username = req.nextUrl.searchParams.get("username")?.trim() ?? "";
    if (!username) {
      return NextResponse.json({ message: "Benutzername fehlt." }, { status: 400 });
    }

    const kooperationen = await getKooperationenCollection();
    const docs = await kooperationen
      .find({
        status: "confirmed",
        $or: [
          { requesterUsername: username },
          { partnerUsername: username },
        ],
      })
      .sort({ confirmedAt: -1 })
      .toArray();

    if (docs.length === 0) {
      return NextResponse.json({ partners: [] });
    }

    // Alle Partner-Usernames sammeln
    const partnerUsernames = new Set<string>();
    for (const d of docs) {
      const other = d.requesterUsername === username ? d.partnerUsername : d.requesterUsername;
      partnerUsernames.add(other);
    }

    const users = await getUsersCollection();
    const userDocs = await users
      .find(
        { username: { $in: [...partnerUsernames] } },
        { projection: { username: 1, displayName: 1, "profile.name.value": 1, "lektorenProfile.name.value": 1, "verlageProfile.name.value": 1, "testleserProfile.name.value": 1, "bloggerProfile.name.value": 1, "speakerProfile.name.value": 1, "profile.profileImage.value": 1, profileSlug: 1 } },
      )
      .toArray();

    const userMap = new Map<string, { displayName: string; profileImage: string; profileSlug: string }>();
    for (const u of userDocs) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dn = getProfileDisplayName(u as any) || (u.username as string);
      userMap.set(u.username, {
        displayName: dn,
        profileImage: u.profile?.profileImage?.value ?? "",
        profileSlug: u.profileSlug ?? "",
      });
    }

    type PublicPartner = {
      username: string;
      displayName: string;
      profileImage: string;
      rolle: KooperationsRolle;
      rolleLabel: string;
      profilePath: string;
    };

    const seen = new Set<string>();
    const partners: PublicPartner[] = [];
    for (const d of docs) {
      const isRequester = d.requesterUsername === username;
      const otherUsername = isRequester ? d.partnerUsername : d.requesterUsername;
      const otherRole = isRequester ? d.partnerRole : d.requesterRole;
      const key = `${otherUsername}::${otherRole}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const info = userMap.get(otherUsername);
      partners.push({
        username: otherUsername,
        displayName: info?.displayName ?? otherUsername,
        profileImage: info?.profileImage ?? "",
        rolle: otherRole,
        rolleLabel: ROLLE_LABELS[otherRole],
        profilePath: `${ROLLE_PROFILE_PATH[otherRole]}/${encodeURIComponent(info?.profileSlug || otherUsername)}`,
      });
    }

    return NextResponse.json({ partners });
  } catch (err) {
    console.error("GET /api/kooperationen/public error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
