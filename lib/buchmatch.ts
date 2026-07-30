import type { ObjectId } from "mongodb";

export type MatchPlatform = "instagram" | "tiktok" | "blog" | "youtube" | "newsletter" | "podcast" | "egal" | "andere";

export const PLATFORM_LABELS: Record<MatchPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  blog: "Blog / Webseite",
  youtube: "YouTube",
  newsletter: "Newsletter",
  podcast: "Podcast",
  egal: "Egal / Flexibel",
  andere: "Andere Plattform",
};

export type BuchMatchOfferDoc = {
  _id?: ObjectId;
  authorUsername: string;
  bookId: string;
  bookTitle: string;
  bookCoverUrl?: string;
  offeredPlatform: MatchPlatform;
  offeredFormat: string;
  offeredChannelHandle?: string;
  requestedPlatform: MatchPlatform;
  requestedFormat?: string;
  preferredGenres?: string[];
  notes?: string;
  status: "active" | "paused" | "completed";
  createdAt: Date;
  updatedAt: Date;
};

export type BuchMatchApplicationDoc = {
  _id?: ObjectId;
  offerId: ObjectId;
  applicantUsername: string;
  applicantBookId: string;
  applicantBookTitle: string;
  applicantBookCoverUrl?: string;
  applicantPlatform: MatchPlatform;
  applicantFormat: string;
  applicantChannelHandle?: string;
  message?: string;
  status: "pending" | "matched" | "declined" | "completed";
  publishedUrlApplicant?: string;
  publishedUrlOwner?: string;
  createdAt: Date;
  matchedAt?: Date;
  updatedAt: Date;
};
