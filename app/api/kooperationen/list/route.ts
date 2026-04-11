import { NextResponse } from "next/server";
import { getServerAccount } from "@/lib/server-auth";
import { getKooperationenCollection, getUsersCollection } from "@/lib/mongodb";
import { ROLLE_LABELS, type KooperationsRolle } from "@/lib/kooperationen";

/** GET /api/kooperationen/list – Alle eigenen Kooperationen (pending + confirmed) */
export async function GET() {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const kooperationen = await getKooperationenCollection();
    const docs = await kooperationen
      .find({
        $or: [
          { requesterUsername: account.username },
          { partnerUsername: account.username },
        ],
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Alle beteiligten Usernames sammeln
    const usernames = new Set<string>();
    for (const d of docs) {
      usernames.add(d.requesterUsername);
      usernames.add(d.partnerUsername);
    }

    const users = await getUsersCollection();
    const userDocs = await users
      .find(
        { username: { $in: [...usernames] } },
        { projection: { username: 1, displayName: 1, profile: 1 } },
      )
      .toArray();

    const userMap = new Map<string, { displayName: string; profileImage: string }>();
    for (const u of userDocs) {
      const dn = u.displayName || (u.profile?.name?.visibility === "public" && u.profile?.name?.value ? u.profile.name.value : u.username);
      userMap.set(u.username, {
        displayName: dn,
        profileImage: u.profile?.profileImage?.value ?? "",
      });
    }

    type KooperationItem = {
      id: string;
      partnerUsername: string;
      partnerDisplayName: string;
      partnerProfileImage: string;
      partnerRole: KooperationsRolle;
      partnerRoleLabel: string;
      myRole: KooperationsRolle;
      myRoleLabel: string;
      status: string;
      iAmRequester: boolean;
      createdAt: string;
    };

    const items: KooperationItem[] = docs.map((d) => {
      const iAmRequester = d.requesterUsername === account.username;
      const otherUsername = iAmRequester ? d.partnerUsername : d.requesterUsername;
      const otherRole = iAmRequester ? d.partnerRole : d.requesterRole;
      const myRole = iAmRequester ? d.requesterRole : d.partnerRole;
      const info = userMap.get(otherUsername);
      return {
        id: d._id!.toString(),
        partnerUsername: otherUsername,
        partnerDisplayName: info?.displayName ?? otherUsername,
        partnerProfileImage: info?.profileImage ?? "",
        partnerRole: otherRole,
        partnerRoleLabel: ROLLE_LABELS[otherRole],
        myRole,
        myRoleLabel: ROLLE_LABELS[myRole],
        status: d.status,
        iAmRequester,
        createdAt: d.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ kooperationen: items });
  } catch (err) {
    console.error("GET /api/kooperationen/list error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
