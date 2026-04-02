import bcrypt from "bcryptjs";
import { MongoClient, type Collection, type Db, MongoServerError } from "mongodb";
import type { BookDocument } from "@/lib/books";
import type { ProfileData, SpeakerProfileData, BloggerProfileData, TestleserProfileData, LektorenProfileData } from "@/lib/profile";
import type { SupportPost } from "@/lib/support";
import type { DiscussionDocument } from "@/lib/discussions";
import type { PollDocument, TauschDocument } from "@/lib/discussions";
import type { MessageDocument } from "@/lib/messages";

export type UserRole = "USER" | "ADMIN" | "SUPERADMIN";

export type UserStatus = "active" | "deactivated";

export type UserDocument = {
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status?: UserStatus;
  displayName?: string;
  createdAt: Date;
  lastOnline?: Date;
  profile?: ProfileData;
  speakerProfile?: SpeakerProfileData;
  bloggerProfile?: BloggerProfileData;
  testleserProfile?: TestleserProfileData;
  lektorenProfile?: LektorenProfileData;
  newsletterOptIn?: boolean;
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
  await books.createIndex({ ownerUsername: 1, createdAt: -1 });

  const support = db.collection<SupportPost>("support");
  await support.createIndex({ createdAt: -1 });

  const discussions = db.collection<DiscussionDocument>("discussions");
  await discussions.createIndex({ lastActivityAt: -1 });
  await discussions.createIndex({ authorUsername: 1 });

  const messages = db.collection<MessageDocument>("messages");
  await messages.createIndex({ recipientUsername: 1, createdAt: -1 });
  await messages.createIndex({ senderUsername: 1, createdAt: -1 });

  const analytics = db.collection("analytics");
  await analytics.createIndex({ timestamp: -1 });
  await analytics.createIndex({ page: 1, timestamp: -1 });
  await analytics.createIndex({ visitorId: 1, timestamp: -1 });

  const lesezeichen = db.collection("lesezeichen");
  await lesezeichen.createIndex({ username: 1 }, { unique: true });
  await lesezeichen.createIndex({ total: -1 });

  const buchempfehlungen = db.collection("buchempfehlungen");
  await buchempfehlungen.createIndex({ bookId: 1, createdAt: -1 });
  await buchempfehlungen.createIndex({ bookId: 1, username: 1 }, { unique: true });

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

  const existingSuperAdmin = await users.findOne(
    { username: "Kopernikus" },
    { projection: { _id: 1, passwordHash: 1, role: 1 } }
  );

  const defaultPassword = process.env.SUPERADMIN_PASSWORD ?? "BuchArena!2024#Secure";

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
    // Sicherstellen, dass Rolle und Passwort korrekt sind
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

export function isDuplicateKeyError(error: unknown) {
  return error instanceof MongoServerError && error.code === 11000;
}
