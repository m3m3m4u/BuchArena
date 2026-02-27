import type { ObjectId } from "mongodb";

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
  presentationVideoUrl: string;
  presentationVideoInternal: boolean;
  excerpts: BookExcerpt[];
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
  presentationVideoUrl?: string;
};
