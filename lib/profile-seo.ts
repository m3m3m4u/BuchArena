import type { Metadata } from "next";
import { findUserBySlugOrUsername, type UserDocument } from "@/lib/mongodb";

export type ProfileRole = "autor" | "sprecher" | "blogger" | "lektoren" | "testleser" | "verlage";

const ROLE_CONFIG: Record<
  ProfileRole,
  {
    roleLabel: string;
    jobTitle: string;
    pathSegment: string;
    schemaType: "Person" | "Organization";
  }
> = {
  autor: {
    roleLabel: "Autor/in",
    jobTitle: "Autor / Autorin",
    pathSegment: "autor",
    schemaType: "Person",
  },
  sprecher: {
    roleLabel: "Hörbuch-Sprecher/in",
    jobTitle: "Hörbuch-Sprecher / Sprecherin",
    pathSegment: "sprecher",
    schemaType: "Person",
  },
  blogger: {
    roleLabel: "Buchblogger/in",
    jobTitle: "Buchblogger / Rezensent",
    pathSegment: "blogger",
    schemaType: "Person",
  },
  lektoren: {
    roleLabel: "Lektor/in",
    jobTitle: "Lektor / Korrektor",
    pathSegment: "lektoren",
    schemaType: "Person",
  },
  testleser: {
    roleLabel: "Testleser/in",
    jobTitle: "Testleser / Beta-Leser",
    pathSegment: "testleser",
    schemaType: "Person",
  },
  verlage: {
    roleLabel: "Verlag",
    jobTitle: "Buchverlag",
    pathSegment: "verlage",
    schemaType: "Organization",
  },
};

function getField(field: unknown): string {
  if (!field || typeof field !== "object") return "";
  return "visibility" in field && field.visibility === "public" && "value" in field && typeof field.value === "string"
    ? field.value.trim() : "";
}

function toSocialUrl(platform: string, raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (/^(www\.)?[a-z0-9-]+\.[a-z]{2,}/i.test(v)) return `https://${v}`;
  const handle = v.replace(/^@/, "");

  switch (platform) {
    case "Instagram":
      return `https://www.instagram.com/${encodeURIComponent(handle)}`;
    case "Facebook":
      return `https://www.facebook.com/${encodeURIComponent(handle)}`;
    case "TikTok":
      return `https://www.tiktok.com/@${encodeURIComponent(handle)}`;
    case "YouTube":
      return `https://www.youtube.com/@${encodeURIComponent(handle)}`;
    case "LinkedIn":
      return `https://www.linkedin.com/in/${encodeURIComponent(handle)}`;
    case "Pinterest":
      return `https://www.pinterest.com/${encodeURIComponent(handle)}`;
    case "Reddit":
      return `https://www.reddit.com/user/${encodeURIComponent(handle)}`;
    default:
      return "";
  }
}

interface ExtractedProfile {
  name: string;
  bio: string;
  imageUrl: string;
  city: string;
  country: string;
  socialUrls: string[];
  canonicalSlug: string;
}

function extractProfileData(user: UserDocument, role: ProfileRole): ExtractedProfile | null {
  if (user.status === "deactivated") return null;

  let rawProfile: Record<string, unknown> | undefined;
  switch (role) {
    case "autor":
      rawProfile = user.profile;
      break;
    case "sprecher":
      rawProfile = user.speakerProfile;
      break;
    case "blogger":
      rawProfile = user.bloggerProfile;
      break;
    case "lektoren":
      rawProfile = user.lektorenProfile;
      break;
    case "testleser":
      rawProfile = user.testleserProfile;
      break;
    case "verlage":
      rawProfile = user.verlageProfile;
      break;
  }

  if (!rawProfile || rawProfile.deaktiviert) return null;

  const name =
    getField(rawProfile.name) ||
    user.displayName ||
    user.username;

  const bio =
    getField(rawProfile.ueberMich) ||
    getField(rawProfile.beschreibung) ||
    (typeof rawProfile.beschreibung === "string" ? rawProfile.beschreibung : "") ||
    getField(rawProfile.motto) ||
    (typeof rawProfile.motto === "string" ? rawProfile.motto : "");

  const imageUrl = getField(rawProfile.profileImage);

  const city = getField(rawProfile.city) || getField(rawProfile.ort);
  const country = getField(rawProfile.country);

  const socialUrls: string[] = [];
  const socialKeys: Array<[string, unknown]> = [
    ["Instagram", rawProfile.socialInstagram],
    ["Facebook", rawProfile.socialFacebook],
    ["TikTok", rawProfile.socialTiktok],
    ["YouTube", rawProfile.socialYoutube],
    ["LinkedIn", rawProfile.socialLinkedin],
    ["Pinterest", rawProfile.socialPinterest],
    ["Reddit", rawProfile.socialReddit],
  ];

  for (const [platform, field] of socialKeys) {
    const val = getField(field);
    if (val) {
      const url = toSocialUrl(platform, val);
      if (url) socialUrls.push(url);
    }
  }

  const websiteVal = getField(rawProfile.socialWebsite) || getField(rawProfile.webseite);
  if (websiteVal && /^https?:\/\//i.test(websiteVal)) {
    socialUrls.push(websiteVal);
  }

  const canonicalSlug = user.profileSlug || user.username;

  return {
    name,
    bio,
    imageUrl,
    city,
    country,
    socialUrls,
    canonicalSlug,
  };
}

export async function buildProfileMetadata(
  identifier: string,
  role: ProfileRole,
): Promise<Metadata> {
  const config = ROLE_CONFIG[role];
  try {
    const user = await findUserBySlugOrUsername(identifier);
    if (!user) {
      return { title: `${config.roleLabel} nicht gefunden` };
    }

    const data = extractProfileData(user, role);
    if (!data) {
      return { title: `${config.roleLabel} nicht gefunden` };
    }

    const title = `${data.name} – ${config.roleLabel}`;
    const cleanBio = data.bio.replace(/\s+/g, " ").trim();
    const description = cleanBio
      ? cleanBio.length > 160
        ? cleanBio.slice(0, 157) + "…"
        : cleanBio
      : `Profil von ${data.name} (${config.roleLabel}) auf BuchArena entdecken. Bücher, Infos und Kontakt.`;

    const canonicalUrl = `https://bucharena.org/${config.pathSegment}/${data.canonicalSlug}`;

    return {
      title,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: `${data.name} | ${config.roleLabel} auf BuchArena`,
        description,
        url: canonicalUrl,
        type: "profile",
        images: data.imageUrl
          ? [{ url: data.imageUrl, alt: `Profilbild von ${data.name}` }]
          : [{ url: "/logo.png", width: 512, height: 512, alt: "BuchArena Logo" }],
      },
      twitter: {
        card: "summary",
        title,
        description,
        images: data.imageUrl ? [data.imageUrl] : ["/logo.png"],
      },
    };
  } catch {
    return { title: config.roleLabel };
  }
}

export async function buildProfileJsonLd(
  identifier: string,
  role: ProfileRole,
): Promise<Record<string, unknown> | null> {
  const config = ROLE_CONFIG[role];
  try {
    const user = await findUserBySlugOrUsername(identifier);
    if (!user) return null;

    const data = extractProfileData(user, role);
    if (!data) return null;

    const url = `https://bucharena.org/${config.pathSegment}/${data.canonicalSlug}`;

    if (config.schemaType === "Organization") {
      return {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: data.name,
        description: data.bio || undefined,
        image: data.imageUrl || undefined,
        url,
        ...(data.socialUrls.length > 0 ? { sameAs: data.socialUrls } : {}),
        ...(data.city
          ? {
              address: {
                "@type": "PostalAddress",
                addressLocality: data.city,
                addressCountry: data.country || "DE",
              },
            }
          : {}),
      };
    }

    return {
      "@context": "https://schema.org",
      "@type": "Person",
      name: data.name,
      jobTitle: config.jobTitle,
      description: data.bio || undefined,
      image: data.imageUrl || undefined,
      url,
      ...(data.socialUrls.length > 0 ? { sameAs: data.socialUrls } : {}),
      ...(data.city
        ? {
            homeLocation: {
              "@type": "Place",
              name: data.city,
              address: {
                "@type": "PostalAddress",
                addressLocality: data.city,
                addressCountry: data.country || "DE",
              },
            },
          }
        : {}),
    };
  } catch {
    return null;
  }
}
