/**
 * Datenbank-Zugriffsfunktionen für die BuchArena-Autoren Collections.
 * Verwendet den raw MongoDB-Driver (kein Mongoose).
 */

import { getDatabase } from "@/lib/mongodb";
import { ObjectId, type Collection, type WithId, type Document } from "mongodb";

/* ═══════════════ Types ═══════════════ */

export type BucharenaBookDoc = {
  _id?: ObjectId;
  title: string;
  author: string;
  speaker?: string;
  authorInstagram?: string;
  amazonUrl?: string;
  instareelUrl?: string;
  youtubeLangUrl?: string;
  youtubeShortUrl?: string;
  redditUrl?: string;
  tiktokUrl?: string;
  publishDate?: string;
  isActive: boolean;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type BucharenaReviewDoc = {
  _id?: ObjectId;
  bookTitle: string;
  review: string;
  authorEmail?: string;
  authorName?: string;
  instagram?: string;
  status: "pending" | "processed";
  processedBy?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type BucharenaSnippetDoc = {
  _id?: ObjectId;
  bookTitle: string;
  text: string;
  audioFileName?: string;
  audioFilePath?: string;
  audioFileSize?: number;
  authorEmail?: string;
  authorName?: string;
  status: "pending" | "processed";
  processedBy?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type Mp3File = {
  fileName: string;
  path: string;
  url: string;
  uploadedAt: Date;
  uploadedBy?: string;
};

export type BucharenaSprecherDoc = {
  _id?: ObjectId;
  pdfFileName: string;
  pdfPath: string;
  pdfUrl: string;
  title: string;
  sprecherName?: string;
  bookedAt?: Date;
  mp3Files: Mp3File[];
  status: "offen" | "gebucht" | "erledigt";
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type BucharenaVorlageDoc = {
  _id?: ObjectId;
  /** Owner */
  username: string;
  /** Form fields */
  buchtitel: string;
  untertitel: string;
  autorName: string;
  /** @deprecated kept for backward compat with old documents */
  autorVorname?: string;
  /** @deprecated kept for backward compat with old documents */
  autorNachname?: string;
  geschlecht?: string;
  erscheinungsjahr: string;
  genre: string;
  verlag: string;
  coverDesign: string;
  hintergrund: string;
  hauptfigur: string;
  thema: string;
  inhalte: string;
  schwerpunkt: string;
  autorTitel: string;
  autorHerkunft: string;
  autorBeruf: string;
  autorStil: string;
  zusammenfassung: string[];
  notes1: string;
  notes2: string;
  notes3: string;
  notes4: string;
  notes5: string;
  notiz: string;
  /** Base64 data-URLs for images (optional) */
  coverImg?: string;
  autorImg?: string;
  /** Submission reference (set when submitted) */
  submissionId?: string;
  /** Source page: "vorlage" | "shorts" (older docs without type = "vorlage") */
  type?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type BucharenaReelVorlageDoc = {
  _id?: ObjectId;
  /** Owner */
  username: string;
  /** Form fields */
  buchtitel: string;
  untertitel: string;
  autorName: string;
  geschlecht?: string;
  erscheinungsjahr: string;
  genre: string;
  verlag: string;
  coverDesign: string;
  hintergrund: string;
  hauptfigur: string;
  thema: string;
  inhalte: string;
  autorHerkunft: string;
  autorBeruf: string;
  autorStil: string;
  notiz: string;
  beschreibung?: string;
  /** Base64 data-URLs for images (optional) */
  coverImg?: string;
  autorImg?: string;
  /** Submission reference (set when submitted) */
  submissionId?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type BucharenaSubmissionDoc = {
  _id?: ObjectId;
  bookTitle: string;
  author: string;
  genre: string;
  ageRange: string;
  fileName: string;
  fileSize: number;
  filePath: string;
  files?: { fileName: string; fileSize: number; filePath: string }[];
  notes?: string;
  beschreibung?: string;
  contact?: string;
  contactType?: "email" | "instagram";
  instagram?: string;
  submittedBy?: string;
  type?: "vorlage" | "reel";
  status: "pending" | "approved" | "rejected" | "done" | "withdrawn";
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export const GENRE_OPTIONS = [
  "Fantasy",
  "Science-Fiction",
  "Krimi / Thriller",
  "Horror",
  "Liebesroman / Romance",
  "Romantasy",
  "Historischer Roman",
  "Abenteuer",
  "Biografie / Autobiografie",
  "Sachbuch",
  "Kinderbuch",
  "Jugendbuch",
  "Comic / Manga / Graphic Novel",
  "Klassiker",
  "Drama",
  "Humor / Satire",
  "Dystopie",
  "Mystery",
  "Märchen / Sagen",
  "Gedichte / Lyrik",
  "Kurzgeschichten",
  "Sonstiges",
];

export const AGE_RANGE_OPTIONS = [
  "ab 2 Jahren",
  "ab 4 Jahren",
  "ab 6 Jahren",
  "ab 8 Jahren",
  "ab 10 Jahren",
  "ab 12 Jahren",
  "ab 14 Jahren",
  "ab 16 Jahren",
  "ab 18 Jahren",
  "Alle Altersgruppen",
];

/* ═══════════════ Collection Getters ═══════════════ */

export async function getBucharenaBooksCollection(): Promise<Collection<BucharenaBookDoc>> {
  const db = await getDatabase();
  return db.collection<BucharenaBookDoc>("bucharenabooks");
}

export async function getBucharenaReviewsCollection(): Promise<Collection<BucharenaReviewDoc>> {
  const db = await getDatabase();
  return db.collection<BucharenaReviewDoc>("bucharenareviews");
}

export async function getBucharenaSnippetsCollection(): Promise<Collection<BucharenaSnippetDoc>> {
  const db = await getDatabase();
  return db.collection<BucharenaSnippetDoc>("bucharenasnippets");
}

export async function getBucharenaSprecherCollection(): Promise<Collection<BucharenaSprecherDoc>> {
  const db = await getDatabase();
  return db.collection<BucharenaSprecherDoc>("bucharenasprechers");
}

export async function getBucharenaSubmissionsCollection(): Promise<Collection<BucharenaSubmissionDoc>> {
  const db = await getDatabase();
  return db.collection<BucharenaSubmissionDoc>("bucharenasubmissions");
}

export async function getBucharenaVorlagenCollection(): Promise<Collection<BucharenaVorlageDoc>> {
  const db = await getDatabase();
  return db.collection<BucharenaVorlageDoc>("bucharenavorlagen");
}

export async function getBucharenaReelVorlagenCollection(): Promise<Collection<BucharenaReelVorlageDoc>> {
  const db = await getDatabase();
  return db.collection<BucharenaReelVorlageDoc>("bucharenareelvorlagen");
}

/* ═══════════════ Helpers ═══════════════ */

export function toObjectId(id: string): ObjectId {
  return new ObjectId(id);
}

export function docToJson<T extends Document>(doc: WithId<T>) {
  const { _id, ...rest } = doc;
  return { id: _id.toHexString(), ...rest };
}
