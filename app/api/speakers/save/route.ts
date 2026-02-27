import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import {
  createDefaultSpeakerProfile,
  type SpeakerProfileData,
  type ProfileField,
  type Visibility,
} from "@/lib/profile";

type SaveSpeakerProfilePayload = {
  username?: string;
  speakerProfile?: SpeakerProfileData;
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

function sanitizeSpeakerProfile(
  input: SpeakerProfileData | undefined
): SpeakerProfileData {
  const base = createDefaultSpeakerProfile();
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
    ort: sanitizeField(source.ort, base.ort, 120),
    motto: sanitizeField(source.motto, base.motto, 300),
    webseite: sanitizeField(source.webseite, base.webseite, 500),
    infovideo: sanitizeField(source.infovideo, base.infovideo, 500),
    sprechproben: Array.isArray(source.sprechproben) ? source.sprechproben : [],
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SaveSpeakerProfilePayload;
    const username = body.username?.trim();

    if (!username) {
      return NextResponse.json(
        { message: "Benutzername fehlt." },
        { status: 400 }
      );
    }

    const sanitized = sanitizeSpeakerProfile(body.speakerProfile);
    const users = await getUsersCollection();

    const result = await users.updateOne(
      { username },
      { $set: { speakerProfile: sanitized } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Benutzer nicht gefunden." },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Sprecherprofil gespeichert." });
  } catch {
    return NextResponse.json(
      { message: "Sprecherprofil konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }
}
