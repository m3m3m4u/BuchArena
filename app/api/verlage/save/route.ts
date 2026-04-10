import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import {
  createDefaultVerlageProfile,
  type VerlageProfileData,
  type ProfileField,
  type Visibility,
} from "@/lib/profile";
import { getServerAccount } from "@/lib/server-auth";

type SaveVerlageProfilePayload = {
  username?: string;
  verlageProfile?: VerlageProfileData;
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

function sanitizeVerlageProfile(
  input: VerlageProfileData | undefined
): VerlageProfileData {
  const base = createDefaultVerlageProfile();
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
    motto: typeof source.motto === "string" ? source.motto.trim().slice(0, 300) : "",
    beschreibung: typeof source.beschreibung === "string" ? source.beschreibung.trim().slice(0, 2000) : "",
    ansprechperson: typeof source.ansprechperson === "string" ? source.ansprechperson.trim().slice(0, 200) : "",
    voraussetzungen: typeof source.voraussetzungen === "string" ? source.voraussetzungen.trim().slice(0, 2000) : "",
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

    const body = (await request.json()) as SaveVerlageProfilePayload;
    const username =
      account.role === "SUPERADMIN" && body.username?.trim()
        ? body.username.trim()
        : account.username;

    const sanitized = sanitizeVerlageProfile(body.verlageProfile);
    const users = await getUsersCollection();

    const result = await users.updateOne(
      { username },
      { $set: { verlageProfile: sanitized } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Benutzer nicht gefunden." },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Verlagsprofil gespeichert." });
  } catch (err) {
    console.error("Verlagsprofil speichern fehlgeschlagen:", err);
    return NextResponse.json(
      { message: "Verlagsprofil konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }
}
