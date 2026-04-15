import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import type { Collection } from "mongodb";

export type BlogStatus = "pending" | "approved" | "rejected";

export type BlogPostDocument = {
  _id?: ObjectId;
  title: string;
  htmlContent: string;
  /** Kurze Einleitung/Teaser (max. 200 Zeichen, automatisch aus HTML extrahiert) */
  excerpt?: string;
  status: BlogStatus;
  /** Wer hat den Post eingereicht */
  authorUsername: string;
  /** Optionaler Anzeigename */
  authorDisplayName?: string;
  rejectionNote?: string;
  /** Wer hat freigegeben/abgelehnt */
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export async function getBlogCollection(): Promise<Collection<BlogPostDocument>> {
  const db = await getDatabase();
  return db.collection<BlogPostDocument>("blog_posts");
}

/** Einfacher Text-Excerpt aus HTML */
export function extractExcerpt(html: string, maxLen = 200): string {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > maxLen ? text.slice(0, maxLen).trimEnd() + "…" : text;
}
