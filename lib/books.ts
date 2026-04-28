import type { ObjectId } from "mongodb";

export type CoAuthorEntry = {
  username: string;
  status: "pending" | "confirmed" | "declined";
  invitedAt: Date;
  confirmedAt?: Date;
};

export type BookExcerpt = {
  id: string;
  type: "text" | "mp3";
  title: string;
  /** Plain-text content (only for type "text") */
  content?: string;
  /** WebDAV file URL (only for type "mp3") */
  fileUrl?: string;
  createdAt: Date;
};

export type BookDocument = {
  _id?: ObjectId;
  ownerUsername: string;
  coverImageUrl: string;
  title: string;
  publicationYear: number;
  genre: string;
  ageFrom: number;
  ageTo: number;
  publisher: string;
  isbn: string;
  pageCount: number;
  language: string;
  description: string;
  buyLinks: string[];
  amazonOverrideUrl?: string;
  presentationVideoUrl: string;
  presentationVideoInternal: boolean;
  excerpts: BookExcerpt[];
  coAuthors?: CoAuthorEntry[];
  createdAt: Date;
};

export type CreateBookPayload = {
  ownerUsername?: string;
  coverImageUrl?: string;
  title?: string;
  publicationYear?: number;
  genre?: string;
  ageFrom?: number;
  ageTo?: number;
  publisher?: string;
  isbn?: string;
  pageCount?: number;
  language?: string;
  description?: string;
  buyLinks?: string[];
  amazonOverrideUrl?: string;
  presentationVideoUrl?: string;
};

export function isAmazonLink(url: string): boolean {
  try {
    const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const hostname = new URL(normalizedUrl).hostname.toLowerCase();
    return hostname.includes("amazon") || hostname.includes("amzn.to") || hostname.includes("amzn.eu");
  } catch {
    return /amazon|amzn\.to|amzn\.eu/i.test(url);
  }
}

export function getFirstAmazonLink(buyLinks: string[] | undefined): string {
  return (buyLinks ?? []).find((link) => isAmazonLink(link)) ?? "";
}

export function applyAmazonOverride(buyLinks: string[] | undefined, amazonOverrideUrl?: string): string[] {
  const links = [...(buyLinks ?? [])];
  const override = amazonOverrideUrl?.trim();
  if (!override) return links;

  let replaced = false;
  const updatedLinks = links.map((link) => {
    if (!replaced && isAmazonLink(link)) {
      replaced = true;
      return override;
    }
    return link;
  });

  return replaced ? updatedLinks : [...updatedLinks, override];
}
