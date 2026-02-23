import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import {
  createDefaultProfile,
  type ProfileData,
  type ProfileField,
  type Visibility,
} from "@/lib/profile";

type SaveProfilePayload = {
  username?: string;
  profile?: ProfileData;
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

function sanitizeProfile(input: ProfileData | undefined): ProfileData {
  const base = createDefaultProfile();
  const source = input ?? base;

  const crop = source.profileImage?.crop ?? base.profileImage.crop;

  return {
    profileImage: {
      value: (source.profileImage?.value ?? "").trim().slice(0, 500),
      visibility: sanitizeVisibility(source.profileImage?.visibility, base.profileImage.visibility),
      crop: {
        x: Math.max(0, Math.min(100, Number(crop.x) || 50)),
        y: Math.max(0, Math.min(100, Number(crop.y) || 50)),
        zoom: Math.max(1, Math.min(3, Number(crop.zoom) || 1)),
      },
    },
    name: sanitizeField(source.name, base.name, 120),
    city: sanitizeField(source.city, base.city, 120),
    country: sanitizeField(source.country, base.country, 120),
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
    const body = (await request.json()) as SaveProfilePayload;
    const username = body.username?.trim();

    if (!username) {
      return NextResponse.json(
        { message: "Benutzername fehlt." },
        { status: 400 }
      );
    }

    const sanitizedProfile = sanitizeProfile(body.profile);
    const users = await getUsersCollection();

    const result = await users.updateOne(
      { username },
      {
        $set: {
          profile: sanitizedProfile,
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Benutzer nicht gefunden." },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Profil gespeichert." });
  } catch {
    return NextResponse.json(
      { message: "Profil konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }
}
