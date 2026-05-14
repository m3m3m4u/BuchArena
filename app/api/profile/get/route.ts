import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { createDefaultProfile, createDefaultSpeakerProfile, createDefaultBloggerProfile, createDefaultTestleserProfile, createDefaultLektorenProfile, createDefaultVerlageProfile } from "@/lib/profile";
import { getServerAccount } from "@/lib/server-auth";

type GetProfilePayload = {
  username?: string;
};

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as GetProfilePayload;
    const username =
      (account.role === "SUPERADMIN" || account.role === "ADMIN") && body.username?.trim()
        ? body.username.trim()
        : account.username;

    const users = await getUsersCollection();
    const user = await users.findOne(
      { username },
      { projection: { profile: 1, speakerProfile: 1, bloggerProfile: 1, testleserProfile: 1, lektorenProfile: 1, verlageProfile: 1, newsletterOptIn: 1, emailOnUnreadMessages: 1, displayName: 1, profileSlug: 1 } }
    );

    if (!user) {
      return NextResponse.json(
        { message: "Benutzer nicht gefunden." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      profile: user.profile ?? createDefaultProfile(),
      speakerProfile: user.speakerProfile ?? createDefaultSpeakerProfile(),
      bloggerProfile: user.bloggerProfile ?? createDefaultBloggerProfile(),
      testleserProfile: user.testleserProfile ?? createDefaultTestleserProfile(),
      lektorenProfile: user.lektorenProfile ?? createDefaultLektorenProfile(),
      verlageProfile: user.verlageProfile ?? createDefaultVerlageProfile(),
      newsletterOptIn: !!user.newsletterOptIn,
      emailOnUnreadMessages: !!user.emailOnUnreadMessages,
      displayName: user.displayName ?? "",
      profileSlug: user.profileSlug ?? "",
    });
  } catch {
    return NextResponse.json(
      { message: "Profil konnte nicht geladen werden." },
      { status: 500 }
    );
  }
}
