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
  topic?: DiscussionTopic;
  replies: DiscussionReply[];
  replyCount: number;
  lastActivityAt: Date;
  createdAt: Date;
  reactions?: Reaction[];
};

export const ALLOWED_EMOJIS = ["👍", "❤️", "😂", "🎉", "🤔", "👎"];

/* ── Diskussions-Themen ── */

export const DISCUSSION_TOPICS = [
  "Allgemein",
  "Autorentipps",
  "Schreibtipps",
  "Selfpublishing",
  "Buchmarketing",
  "Social Media & Werbung",
  "Buchcover",
  "Lektoren & Testleser",
  "Genre-Diskussion",
  "Veranstaltungen",
  "Abstimmung",
] as const;

export const GENRE_TOPICS = [
  "Krimi",
  "Thriller",
  "Fantasy",
  "Science-Fiction",
  "Liebesroman",
  "Historischer Roman",
  "Horror",
  "Abenteuer",
  "Jugendbuch",
  "Kinderbuch",
  "Sachbuch",
  "Reiseführer",
  "Biographie",
  "Poesie",
  "Anthologie",
] as const;

export type GenreTopic = (typeof GENRE_TOPICS)[number];

export const ALL_DISCUSSION_TOPICS = [...DISCUSSION_TOPICS, ...GENRE_TOPICS] as const;

export type DiscussionTopic = (typeof ALL_DISCUSSION_TOPICS)[number];

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

export type PollReply = {
  _id?: ObjectId;
  authorUsername: string;
  body: string;
  createdAt: Date;
};

export type PollDocument = {
  _id?: ObjectId;
  authorUsername: string;
  question: string;
  options: string[];
  votes: PollVote[];
  replies: PollReply[];
  createdAt: Date;
};

/* ── Tauschbörse ── */

export type TauschStatus = "offen" | "reserviert" | "abgeschlossen";

export type TauschDocument = {
  _id?: ObjectId;
  authorUsername: string;
  title: string;
  description: string;
  category: string;
  status: TauschStatus;
  createdAt: Date;
};
