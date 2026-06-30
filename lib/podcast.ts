import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
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

export type PodcastFolgeDocument = {
  _id?: ObjectId;
  title: string;
  text: string;
  youtubeUrl: string;
  published: boolean;
  views: number;
  createdAt: Date;
  updatedAt: Date;
};

export async function getPodcastFolgenCollection(): Promise<
  Collection<PodcastFolgeDocument>
> {
  const db = await getDatabase();
  return db.collection<PodcastFolgeDocument>("podcast_folgen");
}

// extractYoutubeId wurde nach lib/podcast-utils.ts verschoben (client-sicher)
