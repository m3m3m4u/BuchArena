import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import type { Collection } from "mongodb";

/* ── Typen ── */

export type SubscriberStatus = "active" | "unsubscribed";

export type SubscriberDocument = {
  _id?: ObjectId;
  email: string;
  status: SubscriberStatus;
  createdAt: Date;
  unsubscribedAt?: Date;
};

export type NewsletterQueueStatus = "pending" | "processing" | "sent" | "failed";

export type NewsletterQueueDocument = {
  _id?: ObjectId;
  subscriberId: ObjectId;
  email: string;
  subject: string;
  htmlContent: string;
  status: NewsletterQueueStatus;
  batchId: string;
  createdAt: Date;
  sentAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
};

/* ── Collection-Helpers ── */

export async function getSubscribersCollection(): Promise<Collection<SubscriberDocument>> {
  const db = await getDatabase();
  return db.collection<SubscriberDocument>("newsletter_subscribers");
}

export async function getNewsletterQueueCollection(): Promise<Collection<NewsletterQueueDocument>> {
  const db = await getDatabase();
  return db.collection<NewsletterQueueDocument>("newsletter_queue");
}

/* ── Indexes (beim Server-Start aufrufen) ── */

export async function initNewsletterIndexes(): Promise<void> {
  const db = await getDatabase();

  const subscribers = db.collection<SubscriberDocument>("newsletter_subscribers");
  await subscribers.createIndex({ email: 1 }, { unique: true });
  await subscribers.createIndex({ status: 1 });

  const queue = db.collection<NewsletterQueueDocument>("newsletter_queue");
  await queue.createIndex({ status: 1, createdAt: 1 });
  await queue.createIndex({ subscriberId: 1 });
  await queue.createIndex({ batchId: 1 });
}

/* ── Helfer: Unsubscribe-Token ── */

import crypto from "crypto";

function getNewsletterSecret(): string {
  const secret = process.env.NEWSLETTER_HMAC_SECRET ?? process.env.JWT_SECRET ?? "newsletter-fallback-secret";
  return secret;
}

/**
 * Erzeugt einen HMAC-signierten Token für den Abmelde-Link.
 * Kein DB-Lookup erforderlich – der Token kann serverseitig jederzeit verifiziert werden.
 */
export function createUnsubscribeToken(email: string): string {
  const hmac = crypto.createHmac("sha256", getNewsletterSecret());
  hmac.update(email.toLowerCase());
  const sig = hmac.digest("base64url");
  const emailB64 = Buffer.from(email.toLowerCase()).toString("base64url");
  return `${emailB64}.${sig}`;
}

/**
 * Verifiziert den Token und gibt die E-Mail-Adresse zurück.
 * Wirft einen Fehler, wenn der Token ungültig ist.
 */
export function verifyUnsubscribeToken(token: string): string {
  const parts = token.split(".");
  if (parts.length !== 2) throw new Error("Ungültiges Token-Format.");

  const [emailB64, sig] = parts;
  const email = Buffer.from(emailB64, "base64url").toString("utf-8");

  const hmac = crypto.createHmac("sha256", getNewsletterSecret());
  hmac.update(email.toLowerCase());
  const expectedSig = hmac.digest("base64url");

  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    throw new Error("Token-Signatur ungültig.");
  }

  return email;
}
