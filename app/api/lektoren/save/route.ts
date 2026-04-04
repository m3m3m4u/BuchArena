import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import {
  createDefaultLektorenProfile,
  type LektorenProfileData,
  type ProfileField,
  type Visibility,
} from "@/lib/profile";
import { getServerAccount } from "@/lib/server-auth";

type SaveLektorenProfilePayload = {
  username?: string;
  lektorenProfile?: LektorenProfileData;
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

function sanitizeKapazitaeten(input: unknown): number[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((v): v is number => typeof v === "number" && v >= 1 && v <= 12)
    .filter((v, i, a) => a.indexOf(v) === i);
}

function sanitizeLektorenProfile(
  input: LektorenProfileData | undefined
): LektorenProfileData {
  const base = createDefaultLektorenProfile();
  const source = input ?? base;

  const profileImage = source.profileImage ?? base.profileImage;

  return {
    deaktiviert: typeof source.deaktiviert === "boolean" ? source.deaktiviert : false,
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
    zuMir: typeof source.zuMir === "string" ? source.zuMir.trim().slice(0, 2000) : "",
    kapazitaeten: sanitizeKapazitaeten(source.kapazitaeten),
    socialInstagram: sanitizeField(source.socialInstagram, base.socialInstagram, 250),
    socialFacebook: sanitizeField(source.socialFacebook, base.socialFacebook, 250),
    socialLinkedin: sanitizeField(source.socialLinkedin, base.socialLinkedin, 250),
    socialTiktok: sanitizeField(source.socialTiktok, base.socialTiktok, 250),
    socialYoutube: sanitizeField(source.socialYoutube, base.socialYoutube, 250),
    socialPinterest: sanitizeField(source.socialPinterest, base.socialPinterest, 250),
    socialReddit: sanitizeField(source.socialReddit, base.socialReddit, 250),
    socialWebsite: sanitizeField(source.socialWebsite, base.socialWebsite, 250),
    socialLinktree: sanitizeField(source.socialLinktree, base.socialLinktree, 250),
    socialNewsletter: sanitizeField(source.socialNewsletter, base.socialNewsletter, 250),
    socialWhatsapp: sanitizeField(source.socialWhatsapp, base.socialWhatsapp, 250),
    socialEmail: sanitizeField(source.socialEmail, base.socialEmail, 250),
  };
}

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as SaveLektorenProfilePayload;
    const username =
      account.role === "SUPERADMIN" && body.username?.trim()
        ? body.username.trim()
        : account.username;

    const sanitized = sanitizeLektorenProfile(body.lektorenProfile);
    const users = await getUsersCollection();

    const result = await users.updateOne(
      { username },
      { $set: { lektorenProfile: sanitized } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Benutzer nicht gefunden." },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Lektorenprofil gespeichert." });
  } catch (err) {
    console.error("Lektorenprofil speichern fehlgeschlagen:", err);
    return NextResponse.json(
      { message: "Lektorenprofil konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }
}
