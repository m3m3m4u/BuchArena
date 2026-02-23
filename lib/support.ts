import type { ObjectId } from "mongodb";

export type SupportPost = {
  _id?: ObjectId;
  authorUsername: string;
  title: string;
  body: string;
  createdAt: Date;
};

export type CreateSupportPayload = {
  authorUsername?: string;
  title?: string;
  body?: string;
};
