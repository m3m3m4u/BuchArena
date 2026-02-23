import type { ObjectId } from "mongodb";

export type DiscussionReply = {
  _id?: ObjectId;
  authorUsername: string;
  body: string;
  createdAt: Date;
};

export type DiscussionDocument = {
  _id?: ObjectId;
  authorUsername: string;
  title: string;
  body: string;
  replies: DiscussionReply[];
  replyCount: number;
  lastActivityAt: Date;
  createdAt: Date;
};

export type CreateDiscussionPayload = {
  authorUsername?: string;
  title?: string;
  body?: string;
};

export type AddReplyPayload = {
  discussionId?: string;
  authorUsername?: string;
  body?: string;
};
