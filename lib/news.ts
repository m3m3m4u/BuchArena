import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import type { Collection } from "mongodb";

export type NewsLayout = "text-only" | "image-left" | "image-right";

export type NewsPostDocument = {
  _id?: ObjectId;
  title: string;
  layout: NewsLayout;
  htmlContent: string;
  imageUrl?: string;
  /** Bildbreite in Prozent (20–80), nur bei Image-Layouts */
  imageRatio?: number;
  active: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function getNewsCollection(): Promise<Collection<NewsPostDocument>> {
  const db = await getDatabase();
  return db.collection<NewsPostDocument>("news_posts");
}
