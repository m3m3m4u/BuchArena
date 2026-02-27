import type { ObjectId } from "mongodb";

export type MessageDocument = {
  _id?: ObjectId;
  senderUsername: string;
  recipientUsername: string;
  subject: string;
  body: string;
  read: boolean;
  readAt?: Date;
  threadId?: ObjectId;
  deletedBySender: boolean;
  deletedByRecipient: boolean;
  createdAt: Date;
};

export type SendMessagePayload = {
  recipientUsername?: string;
  subject?: string;
  body?: string;
  threadId?: string;
};
