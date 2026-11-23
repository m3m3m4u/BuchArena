import { ObjectId } from "mongodb";
import { getDatabase, getUsersCollection } from "@/lib/mongodb";
import { getProfileDisplayName } from "@/lib/profile";
import { ROLLE_LABELS, ROLLE_PROFILE_PATH, type KooperationsRolle } from "@/lib/kooperationen";
import type { Collection } from "mongodb";

/* ── Startseite ─────────────────────────────────────────────────────── */

export type PodcastStartseiteDocument = {
  _id?: ObjectId;
  /** Singleton-Schlüssel */
  key: "startseite";
  htmlContent: string;
  updatedAt: Date;
};

export async function getPodcastStartseiteCollection(): Promise<
  Collection<PodcastStartseiteDocument>
> {
  const db = await getDatabase();
  return db.collection<PodcastStartseiteDocument>("podcast_startseite");
}

/* ── Folgen ─────────────────────────────────────────────────────────── */

export const PODCAST_PROFILE_TYPES: KooperationsRolle[] = [
  "autor",
  "sprecher",
  "blogger",
  "testleser",
  "lektor",
  "verlag",
];

export type PodcastLinkedProfileRef = {
  username: string;
  profileType: KooperationsRolle;
};

export type PodcastLinkedProfileResolved = {
  username: string;
  profileType: KooperationsRolle;
  displayName: string;
  profileImage: string;
  profilePath: string;
  roleLabel: string;
};

export type PodcastFolgeDocument = {
  _id?: ObjectId;
  title: string;
  text: string;
  youtubeUrl: string;
  audioUrl?: string;
  audioFileName?: string;
  audioFileSize?: number;
  coverUrl?: string;
  linkedProfiles?: PodcastLinkedProfileRef[];
  published: boolean;
  views: number;
  createdAt: Date;
  updatedAt: Date;
};

export function sanitizeLinkedProfiles(raw: unknown): PodcastLinkedProfileRef[] {
  if (!Array.isArray(raw)) return [];
  const validTypes = new Set<string>(PODCAST_PROFILE_TYPES);
  const seen = new Set<string>();
  const result: PodcastLinkedProfileRef[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as { username?: unknown; profileType?: unknown };
    const username = typeof rec.username === "string" ? rec.username.trim() : "";
    const profileType = typeof rec.profileType === "string" && validTypes.has(rec.profileType)
      ? (rec.profileType as KooperationsRolle)
      : "autor";
    if (!username) continue;
    const key = `${username}::${profileType}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ username, profileType });
  }

  return result;
}

/** Lädt Profildaten (Anzeigename, Bild, Slug) für verlinkte Profile in einem Batch */
export async function resolvePodcastLinkedProfiles(
  folgen: { linkedProfiles?: PodcastLinkedProfileRef[] }[],
): Promise<Map<string, PodcastLinkedProfileResolved>> {
  const usernames = new Set<string>();
  for (const f of folgen) {
    for (const ref of f.linkedProfiles ?? []) {
      if (ref.username) usernames.add(ref.username);
    }
  }

  const resolvedMap = new Map<string, PodcastLinkedProfileResolved>();
  if (usernames.size === 0) return resolvedMap;

  const usersCol = await getUsersCollection();
  const userDocs = await usersCol
    .find(
      { username: { $in: [...usernames] } },
      {
        projection: {
          username: 1,
          displayName: 1,
          profileSlug: 1,
          "profile.name.value": 1,
          "profile.profileImage.value": 1,
          "speakerProfile.name.value": 1,
          "speakerProfile.profileImage.value": 1,
          "bloggerProfile.name.value": 1,
          "bloggerProfile.profileImage.value": 1,
          "testleserProfile.name.value": 1,
          "testleserProfile.profileImage.value": 1,
          "lektorenProfile.name.value": 1,
          "lektorenProfile.profileImage.value": 1,
          "verlageProfile.name.value": 1,
          "verlageProfile.profileImage.value": 1,
        },
      },
    )
    .toArray();

  const userByUsername = new Map(userDocs.map((u) => [u.username, u]));

  const roleProfileField: Record<KooperationsRolle, string> = {
    autor: "profile",
    sprecher: "speakerProfile",
    blogger: "bloggerProfile",
    testleser: "testleserProfile",
    lektor: "lektorenProfile",
    verlag: "verlageProfile",
  };

  for (const f of folgen) {
    for (const ref of f.linkedProfiles ?? []) {
      const key = `${ref.username}::${ref.profileType}`;
      if (resolvedMap.has(key)) continue;

      const u = userByUsername.get(ref.username);
      const profileField = roleProfileField[ref.profileType];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const roleProfile = u ? ((u as any)[profileField] as { name?: { value?: string }; profileImage?: { value?: string } } | undefined) : undefined;

      const displayName =
        roleProfile?.name?.value?.trim() ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (u ? getProfileDisplayName(u as any) : "") ||
        ref.username;

      const profileImage =
        roleProfile?.profileImage?.value ||
        u?.profile?.profileImage?.value ||
        "";

      const slugOrUsername = u?.profileSlug || ref.username;

      resolvedMap.set(key, {
        username: ref.username,
        profileType: ref.profileType,
        displayName,
        profileImage,
        profilePath: `${ROLLE_PROFILE_PATH[ref.profileType]}/${encodeURIComponent(slugOrUsername)}`,
        roleLabel: ROLLE_LABELS[ref.profileType],
      });
    }
  }

  return resolvedMap;
}

export function mapResolvedLinkedProfiles(
  refs: PodcastLinkedProfileRef[] | undefined,
  resolvedMap: Map<string, PodcastLinkedProfileResolved>,
): PodcastLinkedProfileResolved[] {
  if (!refs || refs.length === 0) return [];
  return refs
    .map((ref) => resolvedMap.get(`${ref.username}::${ref.profileType}`))
    .filter((item): item is PodcastLinkedProfileResolved => Boolean(item));
}

export async function getPodcastFolgenCollection(): Promise<
  Collection<PodcastFolgeDocument>
> {
  const db = await getDatabase();
  return db.collection<PodcastFolgeDocument>("podcast_folgen");
}

// extractYoutubeId wurde nach lib/podcast-utils.ts verschoben (client-sicher)
