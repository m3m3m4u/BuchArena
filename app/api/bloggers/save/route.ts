import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import {
  createDefaultBloggerProfile,
  type BloggerProfileData,
  type ProfileField,
  type Visibility,
} from "@/lib/profile";
import { getServerAccount } from "@/lib/server-auth";

type SaveBloggerProfilePayload = {
  username?: string;
  bloggerProfile?: BloggerProfileData;
};

const validVisibilities: Visibility[] = ["internal", "public", "hidden"];

function sanitizeVisibility(value: string | undefined, fallback: Visibility): Visibility {
  if (value && validVisibilities.includes(value as Visibility)) {
    return value as Visibility;
  }
  return fallback;
}

function sanitizeField(
  input: Partial<ProfileField> | undefined,
  fallback: ProfileField,
  maxLength: number
): ProfileField {
  return {
    value: (input?.value ?? fallback.value).trim().slice(0, maxLength),
    visibility: sanitizeVisibility(input?.visibility, fallback.visibility),
  };
}

function sanitizeBloggerProfile(
  input: BloggerProfileData | undefined
): BloggerProfileData {
  const base = createDefaultBloggerProfile();
  const source = input ?? base;

  const profileImage = source.profileImage ?? base.profileImage;

  return {
    profileImage: {
      value: (profileImage.value ?? "").trim().slice(0, 1000),
      visibility: sanitizeVisibility(profileImage.visibility, base.profileImage.visibility),
      crop: {
        x: typeof profileImage.crop?.x === "number" ? Math.max(0, Math.min(100, profileImage.crop.x)) : 50,
        y: typeof profileImage.crop?.y === "number" ? Math.max(0, Math.min(100, profileImage.crop.y)) : 50,
        zoom: typeof profileImage.crop?.zoom === "number" ? Math.max(1, Math.min(3, profileImage.crop.zoom)) : 1,
      },
    },
    name: sanitizeField(source.name, base.name, 120),
    motto: sanitizeField(source.motto, base.motto, 300),
    beschreibung: sanitizeField(source.beschreibung, base.beschreibung, 2000),
    lieblingsbuch: sanitizeField(source.lieblingsbuch, base.lieblingsbuch, 300),
    genres: typeof source.genres === "string" ? source.genres.trim().slice(0, 1000) : "",
    socialInstagram: sanitizeField(source.socialInstagram, base.socialInstagram, 250),
    socialFacebook: sanitizeField(source.socialFacebook, base.socialFacebook, 250),
    socialLinkedin: sanitizeField(source.socialLinkedin, base.socialLinkedin, 250),
    socialTiktok: sanitizeField(source.socialTiktok, base.socialTiktok, 250),
    socialYoutube: sanitizeField(source.socialYoutube, base.socialYoutube, 250),
    socialPinterest: sanitizeField(source.socialPinterest, base.socialPinterest, 250),
    socialReddit: sanitizeField(source.socialReddit, base.socialReddit, 250),
  };
}

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as SaveBloggerProfilePayload;
    const username = account.username;

    const sanitized = sanitizeBloggerProfile(body.bloggerProfile);
    const users = await getUsersCollection();

    const result = await users.updateOne(
      { username },
      { $set: { bloggerProfile: sanitized } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Benutzer nicht gefunden." },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Bloggerprofil gespeichert." });
  } catch {
    return NextResponse.json(
      { message: "Bloggerprofil konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }
}
