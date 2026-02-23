import type { ObjectId } from "mongodb";

export type BookDocument = {
  _id?: ObjectId;
  ownerUsername: string;
  coverImageUrl: string;
  title: string;
  publicationYear: number;
  genre: string;
  ageFrom: number;
  ageTo: number;
  description: string;
  buyLinks: string[];
  presentationVideoUrl: string;
  presentationVideoInternal: true;
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
  description?: string;
  buyLinks?: string[];
  presentationVideoUrl?: string;
};
