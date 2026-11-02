import { ObjectId } from "mongodb";

export type BdwSubmissionDocument = {
  _id?: ObjectId;
  username: string;
  authorDisplayName: string;
  title: string;
  author: string;
  speaker?: string;
  youtubeUrl: string;
  buyUrl?: string;
  bookId?: string;
  speakerUsername?: string;
  status: "active" | "selected" | "paused" | "withdrawn";
  timesSelected: number;
  lastSelectedAt?: Date;
  lastCycleKey?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type BdwHistoryEntry = {
  _id?: ObjectId;
  cycleKey: string;
  submissionId?: ObjectId;
  username: string;
  title: string;
  author: string;
  speaker?: string;
  youtubeUrl: string;
  buyUrl?: string;
  bookId?: string;
  authorBookmarksAtDraw: number;
  weightAtDraw: number;
  totalCandidates: number;
  drawnAt: Date;
  isAutomatic: boolean;
};

export type BuchDerWocheSettings = {
  title: string;
  author: string;
  speaker?: string;
  youtubeUrl: string;
  buyUrl?: string;
  active: boolean;
  updatedAt: string;
  bookId?: string;
  authorUsername?: string;
  speakerUsername?: string;
  cycleKey?: string;
  submissionId?: string;
  isAutomatic?: boolean;
  selectedAt?: string;
  selectionInfo?: {
    totalCandidates: number;
    authorBookmarks: number;
    totalWeight: number;
    candidateWeight: number;
  };
};

export type CycleInfo = {
  currentCycleKey: string;
  cycleStartDateStr: string;
  nextDrawDateStr: string;
  formattedNextDraw: string;
};
