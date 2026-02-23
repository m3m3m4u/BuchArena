import bcrypt from "bcryptjs";
import { MongoClient, type Collection, type Db, MongoServerError } from "mongodb";
import type { BookDocument } from "@/lib/books";
import type { ProfileData } from "@/lib/profile";
import type { SupportPost } from "@/lib/support";

export type UserRole = "USER" | "SUPERADMIN";

export type UserDocument = {
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  profile?: ProfileData;
};

const uri = process.env.MONGODB_URI ?? "";
const dbName = process.env.MONGODB_DB_NAME ?? "bucharena";

if (!uri) {
  throw new Error("MONGODB_URI ist nicht gesetzt.");
}

let client: MongoClient | null = null;
let connectPromise: Promise<MongoClient> | null = null;
let setupPromise: Promise<void> | null = null;

async function getClient() {
  if (client) {
    return client;
  }

  if (!connectPromise) {
    connectPromise = new MongoClient(uri).connect();
  }

  client = await connectPromise;
  return client;
}

async function initializeDatabase(db: Db) {
  const users = db.collection<UserDocument>("users");
  const books = db.collection<BookDocument>("books");

  await users.createIndex({ username: 1 }, { unique: true });
  await users.createIndex({ email: 1 }, { unique: true });
  await books.createIndex({ ownerUsername: 1, createdAt: -1 });

  const support = db.collection<SupportPost>("support");
  await support.createIndex({ createdAt: -1 });

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
  const activeClient = await getClient();
  const db = activeClient.db(dbName);

  if (!setupPromise) {
    setupPromise = initializeDatabase(db);
  }
  await setupPromise;

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

export function isDuplicateKeyError(error: unknown) {
  return error instanceof MongoServerError && error.code === 11000;
}
