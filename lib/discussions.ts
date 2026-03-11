import type { ObjectId } from "mongodb";

export type Reaction = {
  username: string;
  emoji: string;
};

export type DiscussionReply = {
  _id?: ObjectId;
  authorUsername: string;
  body: string;
  createdAt: Date;
  reactions?: Reaction[];
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
  reactions?: Reaction[];
};

export const ALLOWED_EMOJIS = ["👍", "❤️", "😂", "🎉", "🤔", "👎"];

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
