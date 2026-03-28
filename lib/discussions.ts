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
  parentReplyId?: ObjectId;
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

/* ── Polls / Abstimmungen ── */

export type PollVote = {
  username: string;
  optionIndex: number;
  votedAt: Date;
};

export type PollDocument = {
  _id?: ObjectId;
  authorUsername: string;
  question: string;
  options: string[];
  votes: PollVote[];
  createdAt: Date;
};
