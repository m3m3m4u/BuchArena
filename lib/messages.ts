import type { ObjectId } from "mongodb";

export type MessageDocument = {
  _id?: ObjectId;
  senderUsername: string;
  recipientUsername: string;
  subject: string;
  body: string;
  read: boolean;
  deletedBySender: boolean;
  deletedByRecipient: boolean;
  createdAt: Date;
};

export type SendMessagePayload = {
  recipientUsername?: string;
  subject?: string;
  body?: string;
};
