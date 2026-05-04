import bcrypt from "bcryptjs";
import { MongoClient, type Collection, type Db, MongoServerError } from "mongodb";
import type { BookDocument } from "@/lib/books";
import type { ProfileData, SpeakerProfileData, BloggerProfileData, TestleserProfileData, LektorenProfileData, VerlageProfileData } from "@/lib/profile";
import type { SupportPost } from "@/lib/support";
import type { DiscussionDocument } from "@/lib/discussions";
import type { PollDocument, TauschDocument } from "@/lib/discussions";
import type { MessageDocument } from "@/lib/messages";
import type { KalenderEvent } from "@/lib/kalender";
import type { KooperationDocument } from "@/lib/kooperationen";
import type { BuchzirkelDocument, BuchzirkelBewerbungDocument, BuchzirkelTeilnahmeDocument, BuchzirkelBeitragDocument } from "@/lib/buchzirkel";

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
  lastSettingsCheckAt?: Date;
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

  await users.createIndex({ username: 1 }, { unique: true });
  await users.createIndex({ email: 1 }, { unique: true });
  await users.createIndex({ profileSlug: 1 }, { unique: true, sparse: true });
  await books.createIndex({ ownerUsername: 1, createdAt: -1 });
  await books.createIndex({ "coAuthors.username": 1, "coAuthors.status": 1 });

  const support = db.collection<SupportPost>("support");
  await support.createIndex({ createdAt: -1 });

  const discussions = db.collection<DiscussionDocument>("discussions");
  await discussions.createIndex({ lastActivityAt: -1 });
  await discussions.createIndex({ authorUsername: 1 });

  const discussionReads = db.collection("discussionReads");
  await discussionReads.createIndex({ username: 1, discussionId: 1 }, { unique: true });

  const messages = db.collection<MessageDocument>("messages");
  await messages.createIndex({ recipientUsername: 1, createdAt: -1 });
  await messages.createIndex({ senderUsername: 1, createdAt: -1 });
  await messages.createIndex({ senderUsername: 1, deletedBySender: 1, createdAt: -1 });
  await messages.createIndex({ recipientUsername: 1, deletedByRecipient: 1, createdAt: -1 });
  // Partner-Chat-Query: beide Richtungen abdecken
  await messages.createIndex({ senderUsername: 1, recipientUsername: 1, deletedBySender: 1, createdAt: 1 });
  await messages.createIndex({ recipientUsername: 1, senderUsername: 1, deletedByRecipient: 1, createdAt: 1 });
  // Unread-Count-Query
  await messages.createIndex({ recipientUsername: 1, read: 1, deletedByRecipient: 1 });
  // Batch-Read by partner
  await messages.createIndex({ senderUsername: 1, recipientUsername: 1, read: 1 });

  const analytics = db.collection("analytics");
  await analytics.createIndex({ timestamp: -1 });
  await analytics.createIndex({ page: 1, timestamp: -1 });
  await analytics.createIndex({ visitorId: 1, timestamp: -1 });

  const socialMediaDesigns = db.collection("social_media_designs");
  await socialMediaDesigns.createIndex({ username: 1, name: 1 }, { unique: true });
  await socialMediaDesigns.createIndex({ username: 1, updatedAt: -1 });

  const socialMediaGallery = db.collection("social_media_gallery");
  await socialMediaGallery.createIndex({ order: 1, createdAt: 1 });

  const pixabayBlacklist = db.collection("social_media_pixabay_blacklist");
  await pixabayBlacklist.createIndex({ userId: 1 }, { unique: true });
  await pixabayBlacklist.createIndex({ createdAt: -1 });

  const pixabayFlagged = db.collection("social_media_pixabay_flagged_images");
  await pixabayFlagged.createIndex({ imageId: 1 }, { unique: true });
  await pixabayFlagged.createIndex({ createdAt: -1 });

  const pixabayLicenseSafes = db.collection("social_media_pixabay_license_safes");
  await pixabayLicenseSafes.createIndex({ username: 1, createdAt: -1 });
  await pixabayLicenseSafes.createIndex({ imageId: 1, createdAt: -1 });
  await pixabayLicenseSafes.createIndex({ uploaderUserId: 1, createdAt: -1 });

  const lesezeichen = db.collection("lesezeichen");
  await lesezeichen.createIndex({ username: 1 }, { unique: true });
  await lesezeichen.createIndex({ total: -1 });

  const buchempfehlungen = db.collection("buchempfehlungen");
  await buchempfehlungen.createIndex({ bookId: 1, createdAt: -1 });
  await buchempfehlungen.createIndex({ bookId: 1, username: 1 }, { unique: true });

  const profilempfehlungen = db.collection("profilempfehlungen");
  await profilempfehlungen.createIndex({ profileType: 1, profileUsername: 1, createdAt: -1 });
  await profilempfehlungen.createIndex({ profileType: 1, profileUsername: 1, username: 1 }, { unique: true });

  const vorlagen = db.collection("bucharenavorlagen");
  await vorlagen.createIndex({ username: 1, updatedAt: -1 });

  const submissions = db.collection("bucharenasubmissions");
  await submissions.createIndex({ submittedBy: 1, createdAt: -1 });

  const nlSubscribers = db.collection("newsletter_subscribers");
  await nlSubscribers.createIndex({ email: 1 }, { unique: true });
  await nlSubscribers.createIndex({ status: 1 });

  const nlQueue = db.collection("newsletter_queue");
  await nlQueue.createIndex({ status: 1, createdAt: 1 });
  await nlQueue.createIndex({ subscriberId: 1 });

  const newsPosts = db.collection("news_posts");
  await newsPosts.createIndex({ active: 1, createdAt: -1 });

  const blogPosts = db.collection("blog_posts");
  await blogPosts.createIndex({ status: 1, createdAt: -1 });
  await blogPosts.createIndex({ authorUsername: 1 });

  const kalender = db.collection("kalender_events");
  await kalender.createIndex({ date: 1 });
  await kalender.createIndex({ createdBy: 1 });

  const kooperationen = db.collection("kooperationen");
  await kooperationen.createIndex({ requesterUsername: 1, partnerUsername: 1, requesterRole: 1, partnerRole: 1 }, { unique: true });
  await kooperationen.createIndex({ partnerUsername: 1, status: 1 });
  await kooperationen.createIndex({ requesterUsername: 1, status: 1 });

  const buchzirkel = db.collection("buchzirkel");
  await buchzirkel.createIndex({ veranstalterUsername: 1, createdAt: -1 });
  await buchzirkel.createIndex({ status: 1, bewerbungBis: 1 });
  await buchzirkel.createIndex({ typ: 1, status: 1 });

  const buchzirkelBewerbungen = db.collection("buchzirkel_bewerbungen");
  await buchzirkelBewerbungen.createIndex({ buchzirkelId: 1, bewerberUsername: 1 }, { unique: true });
  await buchzirkelBewerbungen.createIndex({ buchzirkelId: 1, status: 1 });
  await buchzirkelBewerbungen.createIndex({ bewerberUsername: 1 });

  const buchzirkelTeilnahmen = db.collection("buchzirkel_teilnahmen");
  await buchzirkelTeilnahmen.createIndex({ buchzirkelId: 1, teilnehmerUsername: 1 }, { unique: true });
  await buchzirkelTeilnahmen.createIndex({ teilnehmerUsername: 1 });

  const buchzirkelBeitraege = db.collection("buchzirkel_beitraege");
  await buchzirkelBeitraege.createIndex({ buchzirkelId: 1, topicId: 1, lastActivityAt: -1 });
  await buchzirkelBeitraege.createIndex({ autorUsername: 1 });

  // Superadmin beim Serverstart anlegen / Passwort synchronisieren
  const defaultPassword = process.env.SUPERADMIN_PASSWORD ?? "12345";
  const existingSuperAdmin = await users.findOne(
    { username: "Kopernikus" },
    { projection: { _id: 1, passwordHash: 1, role: 1 } }
  );

  if (!existingSuperAdmin) {
    const passwordHash = await bcrypt.hash(defaultPassword, 12);
    await users.insertOne({
      username: "Kopernikus",
      email: "kopernikus@bucharena.local",
      passwordHash,
      role: "SUPERADMIN",
      createdAt: new Date(),
    });
  } else {
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

export function isDuplicateKeyError(error: unknown) {
  return error instanceof MongoServerError && error.code === 11000;
}
