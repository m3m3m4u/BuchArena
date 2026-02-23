import bcrypt from "bcryptjs";
import { MongoClient, type Collection, type Db, MongoServerError } from "mongodb";
import type { BookDocument } from "@/lib/books";
import type { ProfileData } from "@/lib/profile";
import type { SupportPost } from "@/lib/support";
import type { DiscussionDocument } from "@/lib/discussions";

export type UserRole = "USER" | "SUPERADMIN";

export type UserStatus = "active" | "deactivated";

export type UserDocument = {
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status?: UserStatus;
  createdAt: Date;
  profile?: ProfileData;
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

  const existingSuperAdmin = await users.findOne(
    { username: "Kopernikus" },
    { projection: { _id: 1 } }
  );

  if (!existingSuperAdmin) {
    const passwordHash = await bcrypt.hash("12345", 10);
    await users.insertOne({
      username: "Kopernikus",
      email: "kopernikus@bucharena.local",
      passwordHash,
      role: "SUPERADMIN",
      createdAt: new Date(),
    });
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

export function isDuplicateKeyError(error: unknown) {
  return error instanceof MongoServerError && error.code === 11000;
}
