import bcrypt from "bcryptjs";
import { MongoClient, ObjectId, type Collection, type Db, MongoServerError } from "mongodb";
import type { BookDocument } from "@/lib/books";
import type { ProfileData, SpeakerProfileData, BloggerProfileData, TestleserProfileData, LektorenProfileData, VerlageProfileData } from "@/lib/profile";
import type { SupportPost } from "@/lib/support";
import type { DiscussionDocument } from "@/lib/discussions";
import type { PollDocument, TauschDocument } from "@/lib/discussions";
import type { MessageDocument } from "@/lib/messages";

export type MessageConversationDocument = {
  _id?: ObjectId;
  /** Alphabetisch kleinerer Username */
  userA: string;
  /** Alphabetisch größerer Username */
  userB: string;
  latestMessageId: ObjectId;
  latestSender: string;
  latestRecipient: string;
  latestSubject: string;
  latestBody: string;
  latestKooperationId?: string | null;
  latestBookCoAuthorId?: string | null;
  latestCreatedAt: Date;
  updatedAt: Date;
  /** Anzahl ungelesener Nachrichten für userA */
  unreadForA: number;
  /** Anzahl ungelesener Nachrichten für userB */
  unreadForB: number;
};
import type { KalenderEvent } from "@/lib/kalender";
import type { KooperationDocument } from "@/lib/kooperationen";
import type { BuchzirkelDocument, BuchzirkelBewerbungDocument, BuchzirkelTeilnahmeDocument, BuchzirkelBeitragDocument, BuchzirkelChatNachrichtDocument } from "@/lib/buchzirkel";
import type { GewinnspielDocument, GewinnspielteilnahmeDocument } from "@/lib/gewinnspiel";

export type SocialMediaDesign = {
  _id?: import("mongodb").ObjectId;
  username: string;
  name: string;
  data: string;       // JSON-String mit format, bgColor, elements
  updatedAt: Date;
};

export type SocialMediaGalleryItem = {
  _id?: import("mongodb").ObjectId;
  label: string;
  src: string;        // data-URL oder absoluter Pfad
  order: number;
  createdAt: Date;
};

export type SocialMediaPromoContentItem = {
  _id?: import("mongodb").ObjectId;
  title: string;
  mediaType: "image" | "video";
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  files?: Array<{
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }>;
  captions: [string, string, string];
  createdAt: Date;
  uploadedBy: string;
};

export type SocialMediaPixabayUploaderBlacklist = {
  _id?: import("mongodb").ObjectId;
  userId: number;
  uploaderName?: string;
  reason: string;
  createdAt: Date;
  createdBy: string;
};

export type SocialMediaPixabayFlaggedImage = {
  _id?: import("mongodb").ObjectId;
  imageId: number;
  pageUrl?: string;
  reason: string;
  createdAt: Date;
  createdBy: string;
};

export type SocialMediaPixabayLicenseSafe = {
  _id?: import("mongodb").ObjectId;
  username: string;
  imageId: number;
  uploaderUserId: number;
  uploaderName: string;
  pageUrl: string;
  profileUrl: string;
  imagePath: string;
  apiResponsePath: string;
  htmlSnapshotPath: string;
  profileSnapshotPath: string;
  manifestPath: string;
  packageHash: string;
  joinedAt?: Date;
  accountAgeDays?: number | null;
  uploadedImageCount?: number | null;
  licenseVerification: {
    status: "verified" | "degraded";
    reason?: string;
  };
  uploaderVerification: {
    status: "verified" | "degraded";
    reason?: string;
  };
  reverseImageCheck: {
    status: "passed" | "failed" | "skipped";
    reason?: string;
    provider?: string;
    matchedSource?: string;
    matchedOwner?: string;
  };
  createdAt: Date;
};

export type UserRole = "USER" | "ADMIN" | "SUPERADMIN";

export type UserStatus = "active" | "deactivated";

export type UserDocument = {
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status?: UserStatus;
  displayName?: string;
  profileSlug?: string;
  createdAt: Date;
  lastOnline?: Date;
  profile?: ProfileData;
  speakerProfile?: SpeakerProfileData;
  bloggerProfile?: BloggerProfileData;
  testleserProfile?: TestleserProfileData;
  lektorenProfile?: LektorenProfileData;
  verlageProfile?: VerlageProfileData;
  newsletterOptIn?: boolean;
  emailOnUnreadMessages?: boolean;
  lastUnreadNotifiedAt?: Date;
  emailNotifyFailCount?: number;
  lastSettingsCheckAt?: Date;
  genreTreffpunktFilter?: string[];
};

const dbName = process.env.MONGODB_DB_NAME ?? "bucharena";

function getUri(): string {
  const value = process.env.MONGODB_URI ?? "";
  if (!value) {
    throw new Error("MONGODB_URI ist nicht gesetzt.");
  }
  return value;
}

/* ── Serverless-safe connection caching via globalThis ── */

const globalWithMongo = globalThis as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
  _mongoSetupDone?: boolean;
};

function getClientPromise(): Promise<MongoClient> {
  if (!globalWithMongo._mongoClientPromise) {
    const uri = getUri();
    const client = new MongoClient(uri, {
      connectTimeoutMS: 10_000,
      serverSelectionTimeoutMS: 10_000,
    });
    globalWithMongo._mongoClientPromise = client.connect().catch((err) => {
      // Reset so next call retries instead of caching a rejected promise
      globalWithMongo._mongoClientPromise = undefined;
      throw err;
    });
  }
  return globalWithMongo._mongoClientPromise;
}

async function initializeDatabase(db: Db) {
  const users = db.collection<UserDocument>("users");
  const books = db.collection<BookDocument>("books");
  const support = db.collection<SupportPost>("support");
  const discussions = db.collection<DiscussionDocument>("discussions");
  const discussionReads = db.collection("discussionReads");
  const messages = db.collection<MessageDocument>("messages");
  const messageConversations = db.collection<MessageConversationDocument>("messageConversations");
  const analytics = db.collection("analytics");
  const socialMediaDesigns = db.collection("social_media_designs");
  const socialMediaGallery = db.collection("social_media_gallery");
  const socialMediaPromoContent = db.collection("social_media_promo_content");
  const pixabayBlacklist = db.collection("social_media_pixabay_blacklist");
  const pixabayFlagged = db.collection("social_media_pixabay_flagged_images");
  const pixabayLicenseSafes = db.collection("social_media_pixabay_license_safes");
  const lesezeichen = db.collection("lesezeichen");
  const buchempfehlungen = db.collection("buchempfehlungen");
  const profilempfehlungen = db.collection("profilempfehlungen");
  const vorlagen = db.collection("bucharenavorlagen");
  const submissions = db.collection("bucharenasubmissions");
  const nlSubscribers = db.collection("newsletter_subscribers");
  const nlQueue = db.collection("newsletter_queue");
  const newsPosts = db.collection("news_posts");
  const blogPosts = db.collection("blog_posts");
  const kalender = db.collection("kalender_events");
  const kooperationen = db.collection("kooperationen");
  const buchzirkel = db.collection("buchzirkel");
  const buchzirkelBewerbungen = db.collection("buchzirkel_bewerbungen");
  const buchzirkelTeilnahmen = db.collection("buchzirkel_teilnahmen");
  const buchzirkelBeitraege = db.collection("buchzirkel_beitraege");
  const buchzirkelChat = db.collection("buchzirkel_chat");
  const gewinnspiele = db.collection("gewinnspiele");
  const gewinnspielteilnahmen = db.collection("gewinnspielteilnahmen");

  // Alle Indizes parallel anlegen — MongoDB legt vorhandene Indizes idempotent als No-op an.
  // Das ist ~10-20x schneller als serielle await-Calls beim Cold-Start.
  await Promise.all([
    users.createIndex({ username: 1 }, { unique: true }),
    users.createIndex({ email: 1 }, { unique: true }),
    users.createIndex({ profileSlug: 1 }, { unique: true, sparse: true }),
    books.createIndex({ ownerUsername: 1, createdAt: -1 }),
    books.createIndex({ "coAuthors.username": 1, "coAuthors.status": 1 }),
    support.createIndex({ createdAt: -1 }),
    discussions.createIndex({ lastActivityAt: -1 }),
    discussions.createIndex({ authorUsername: 1 }),
    discussionReads.createIndex({ username: 1, discussionId: 1 }, { unique: true }),
    messages.createIndex({ recipientUsername: 1, createdAt: -1 }),
    messages.createIndex({ senderUsername: 1, createdAt: -1 }),
    messages.createIndex({ senderUsername: 1, deletedBySender: 1, createdAt: -1 }),
    messages.createIndex({ recipientUsername: 1, deletedByRecipient: 1, createdAt: -1 }),
    messages.createIndex({ senderUsername: 1, recipientUsername: 1, deletedBySender: 1, createdAt: 1 }),
    messages.createIndex({ recipientUsername: 1, senderUsername: 1, deletedByRecipient: 1, createdAt: 1 }),
    messages.createIndex({ senderUsername: 1, recipientUsername: 1, createdAt: -1 }),
    messages.createIndex({ recipientUsername: 1, senderUsername: 1, createdAt: -1 }),
    messages.createIndex({ recipientUsername: 1, read: 1, deletedByRecipient: 1 }),
    messages.createIndex({ senderUsername: 1, recipientUsername: 1, read: 1 }),
    messageConversations.createIndex({ userA: 1, userB: 1 }, { unique: true }),
    messageConversations.createIndex({ userA: 1, updatedAt: -1 }),
    messageConversations.createIndex({ userB: 1, updatedAt: -1 }),
    analytics.createIndex({ timestamp: -1 }),
    analytics.createIndex({ page: 1, timestamp: -1 }),
    analytics.createIndex({ visitorId: 1, timestamp: -1 }),
    socialMediaDesigns.createIndex({ username: 1, name: 1 }, { unique: true }),
    socialMediaDesigns.createIndex({ username: 1, updatedAt: -1 }),
    socialMediaGallery.createIndex({ order: 1, createdAt: 1 }),
    socialMediaPromoContent.createIndex({ createdAt: -1 }),
    socialMediaPromoContent.createIndex({ mediaType: 1, createdAt: -1 }),
    pixabayBlacklist.createIndex({ userId: 1 }, { unique: true }),
    pixabayBlacklist.createIndex({ createdAt: -1 }),
    pixabayFlagged.createIndex({ imageId: 1 }, { unique: true }),
    pixabayFlagged.createIndex({ createdAt: -1 }),
    pixabayLicenseSafes.createIndex({ username: 1, createdAt: -1 }),
    pixabayLicenseSafes.createIndex({ imageId: 1, createdAt: -1 }),
    pixabayLicenseSafes.createIndex({ uploaderUserId: 1, createdAt: -1 }),
    lesezeichen.createIndex({ username: 1 }, { unique: true }),
    lesezeichen.createIndex({ total: -1 }),
    buchempfehlungen.createIndex({ bookId: 1, createdAt: -1 }),
    buchempfehlungen.createIndex({ bookId: 1, username: 1 }, { unique: true }),
    profilempfehlungen.createIndex({ profileType: 1, profileUsername: 1, createdAt: -1 }),
    profilempfehlungen.createIndex({ profileType: 1, profileUsername: 1, username: 1 }, { unique: true }),
    vorlagen.createIndex({ username: 1, updatedAt: -1 }),
    submissions.createIndex({ submittedBy: 1, createdAt: -1 }),
    nlSubscribers.createIndex({ email: 1 }, { unique: true }),
    nlSubscribers.createIndex({ status: 1 }),
    nlQueue.createIndex({ status: 1, createdAt: 1 }),
    nlQueue.createIndex({ subscriberId: 1 }),
    newsPosts.createIndex({ active: 1, createdAt: -1 }),
    blogPosts.createIndex({ status: 1, createdAt: -1 }),
    blogPosts.createIndex({ authorUsername: 1 }),
    kalender.createIndex({ date: 1 }),
    kalender.createIndex({ createdBy: 1 }),
    kooperationen.createIndex({ requesterUsername: 1, partnerUsername: 1, requesterRole: 1, partnerRole: 1 }, { unique: true }),
    kooperationen.createIndex({ partnerUsername: 1, status: 1 }),
    kooperationen.createIndex({ requesterUsername: 1, status: 1 }),
    buchzirkel.createIndex({ veranstalterUsername: 1, createdAt: -1 }),
    buchzirkel.createIndex({ status: 1, bewerbungBis: 1 }),
    buchzirkel.createIndex({ typ: 1, status: 1 }),
    buchzirkelBewerbungen.createIndex({ buchzirkelId: 1, bewerberUsername: 1 }, { unique: true }),
    buchzirkelBewerbungen.createIndex({ buchzirkelId: 1, status: 1 }),
    buchzirkelBewerbungen.createIndex({ bewerberUsername: 1 }),
    buchzirkelTeilnahmen.createIndex({ buchzirkelId: 1, teilnehmerUsername: 1 }, { unique: true }),
    buchzirkelTeilnahmen.createIndex({ teilnehmerUsername: 1 }),
    buchzirkelBeitraege.createIndex({ buchzirkelId: 1, topicId: 1, lastActivityAt: -1 }),
    buchzirkelBeitraege.createIndex({ autorUsername: 1 }),
    buchzirkelChat.createIndex({ buchzirkelId: 1, _id: -1 }),
    buchzirkelChat.createIndex({ buchzirkelId: 1, createdAt: -1 }),
    gewinnspiele.createIndex({ status: 1, anmeldungBis: -1 }),
    gewinnspiele.createIndex({ autorUsername: 1, createdAt: -1 }),
    gewinnspiele.createIndex({ ziehungAm: 1, status: 1 }),
    gewinnspielteilnahmen.createIndex({ gewinnspielId: 1, username: 1 }, { unique: true }),
    gewinnspielteilnahmen.createIndex({ username: 1, angemeldetAt: -1 }),
  ]);

  // Superadmin beim Serverstart anlegen / Passwort synchronisieren
  const defaultPassword = process.env.SUPERADMIN_PASSWORD;
  const existingSuperAdmin = await users.findOne(
    { username: "Kopernikus" },
    { projection: { _id: 1, passwordHash: 1, role: 1 } }
  );

  if (!existingSuperAdmin) {
    if (!defaultPassword || defaultPassword.length < 8) {
      console.warn(
        "[mongodb] Kein Superadmin gefunden und SUPERADMIN_PASSWORD nicht gesetzt — Account wird nicht angelegt.",
      );
    } else {
      const passwordHash = await bcrypt.hash(defaultPassword, 12);
      await users.insertOne({
        username: "Kopernikus",
        email: "kopernikus@bucharena.local",
        passwordHash,
        role: "SUPERADMIN",
        createdAt: new Date(),
      });
    }
  } else if (defaultPassword && defaultPassword.length >= 8) {
    // Nur synchronisieren, wenn die Env-Variable explizit gesetzt ist —
    // sonst riskieren wir, ein produktives Passwort versehentlich zu überschreiben.
    const isValid = await bcrypt.compare(defaultPassword, existingSuperAdmin.passwordHash ?? "");
    const updates: Record<string, unknown> = {};
    if (!isValid) {
      updates.passwordHash = await bcrypt.hash(defaultPassword, 12);
    }
    if (existingSuperAdmin.role !== "SUPERADMIN") {
      updates.role = "SUPERADMIN";
    }
    if (Object.keys(updates).length > 0) {
      await users.updateOne({ username: "Kopernikus" }, { $set: updates });
    }
  } else if (existingSuperAdmin.role !== "SUPERADMIN") {
    // Mindestens Rolle korrigieren, auch ohne Env-Variable
    await users.updateOne({ username: "Kopernikus" }, { $set: { role: "SUPERADMIN" } });
  }
}

export async function getDatabase(): Promise<Db> {
  const activeClient = await getClientPromise();
  const db = activeClient.db(dbName);

  if (!globalWithMongo._mongoSetupDone) {
    try {
      await initializeDatabase(db);
      globalWithMongo._mongoSetupDone = true;
    } catch (err) {
      // Don't cache setup failures – allow retries
      console.error("MongoDB setup error:", err);
      throw err;
    }
  }

  return db;
}

export async function getUsersCollection(): Promise<Collection<UserDocument>> {
  const db = await getDatabase();
  return db.collection<UserDocument>("users");
}

/** Sucht einen User zuerst über profileSlug, dann über username. */
export async function findUserBySlugOrUsername(
  identifier: string,
  projection?: Record<string, number>,
): Promise<UserDocument | null> {
  const users = await getUsersCollection();
  const proj = projection ? { projection } : undefined;
  return (
    (await users.findOne({ profileSlug: identifier }, proj)) ??
    (await users.findOne({ username: identifier }, proj))
  );
}

export async function getBooksCollection(): Promise<Collection<BookDocument>> {
  const db = await getDatabase();
  return db.collection<BookDocument>("books");
}

export async function getSupportCollection(): Promise<Collection<SupportPost>> {
  const db = await getDatabase();
  return db.collection<SupportPost>("support");
}

export async function getDiscussionsCollection(): Promise<Collection<DiscussionDocument>> {
  const db = await getDatabase();
  return db.collection<DiscussionDocument>("discussions");
}

export async function getDiscussionReadsCollection(): Promise<Collection<{ username: string; discussionId: string; readAt: Date }>> {
  const db = await getDatabase();
  return db.collection("discussionReads");
}

export async function getPollsCollection(): Promise<Collection<PollDocument>> {
  const db = await getDatabase();
  return db.collection<PollDocument>("polls");
}

export async function getMessagesCollection(): Promise<Collection<MessageDocument>> {
  const db = await getDatabase();
  return db.collection<MessageDocument>("messages");
}

export async function getMessageConversationsCollection(): Promise<Collection<MessageConversationDocument>> {
  const db = await getDatabase();
  return db.collection<MessageConversationDocument>("messageConversations");
}

export async function getTauschCollection(): Promise<Collection<TauschDocument>> {
  const db = await getDatabase();
  return db.collection<TauschDocument>("tausch");
}

export async function getKalenderCollection(): Promise<Collection<KalenderEvent>> {
  const db = await getDatabase();
  return db.collection<KalenderEvent>("kalender_events");
}

export async function getSocialMediaDesignsCollection(): Promise<Collection<SocialMediaDesign>> {
  const db = await getDatabase();
  return db.collection<SocialMediaDesign>("social_media_designs");
}

export async function getSocialMediaGalleryCollection(): Promise<Collection<SocialMediaGalleryItem>> {
  const db = await getDatabase();
  return db.collection<SocialMediaGalleryItem>("social_media_gallery");
}

export async function getSocialMediaPromoContentCollection(): Promise<Collection<SocialMediaPromoContentItem>> {
  const db = await getDatabase();
  return db.collection<SocialMediaPromoContentItem>("social_media_promo_content");
}

export async function getSocialMediaPixabayUploaderBlacklistCollection(): Promise<Collection<SocialMediaPixabayUploaderBlacklist>> {
  const db = await getDatabase();
  return db.collection<SocialMediaPixabayUploaderBlacklist>("social_media_pixabay_blacklist");
}

export async function getSocialMediaPixabayFlaggedImagesCollection(): Promise<Collection<SocialMediaPixabayFlaggedImage>> {
  const db = await getDatabase();
  return db.collection<SocialMediaPixabayFlaggedImage>("social_media_pixabay_flagged_images");
}

export async function getSocialMediaPixabayLicenseSafesCollection(): Promise<Collection<SocialMediaPixabayLicenseSafe>> {
  const db = await getDatabase();
  return db.collection<SocialMediaPixabayLicenseSafe>("social_media_pixabay_license_safes");
}

export async function getKooperationenCollection(): Promise<Collection<KooperationDocument>> {
  const db = await getDatabase();
  return db.collection<KooperationDocument>("kooperationen");
}

export async function getBuchzirkelCollection(): Promise<Collection<BuchzirkelDocument>> {
  const db = await getDatabase();
  return db.collection<BuchzirkelDocument>("buchzirkel");
}

export async function getBuchzirkelBewerbungenCollection(): Promise<Collection<BuchzirkelBewerbungDocument>> {
  const db = await getDatabase();
  return db.collection<BuchzirkelBewerbungDocument>("buchzirkel_bewerbungen");
}

export async function getBuchzirkelTeilnahmenCollection(): Promise<Collection<BuchzirkelTeilnahmeDocument>> {
  const db = await getDatabase();
  return db.collection<BuchzirkelTeilnahmeDocument>("buchzirkel_teilnahmen");
}

export async function getBuchzirkelBeitraegeCollection(): Promise<Collection<BuchzirkelBeitragDocument>> {
  const db = await getDatabase();
  return db.collection<BuchzirkelBeitragDocument>("buchzirkel_beitraege");
}

export async function getBuchzirkelChatCollection(): Promise<Collection<BuchzirkelChatNachrichtDocument>> {
  const db = await getDatabase();
  return db.collection<BuchzirkelChatNachrichtDocument>("buchzirkel_chat");
}

export async function getGewinnspieleCollection(): Promise<Collection<GewinnspielDocument>> {
  const db = await getDatabase();
  return db.collection<GewinnspielDocument>("gewinnspiele");
}

export async function getGewinnspielteilnahmenCollection(): Promise<Collection<GewinnspielteilnahmeDocument>> {
  const db = await getDatabase();
  return db.collection<GewinnspielteilnahmeDocument>("gewinnspielteilnahmen");
}

export function isDuplicateKeyError(error: unknown) {
  return error instanceof MongoServerError && error.code === 11000;
}
