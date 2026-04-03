import type { ObjectId } from "mongodb";

export type KalenderCategory = "Buchmesse" | "Lesung" | "Release" | "Sonstiges";

export interface KalenderLocation {
  street?: string;
  city?: string;
  zipCode?: string;
  country?: string;
}

export interface KalenderEvent {
  _id?: ObjectId;
  title: string;
  description: string;
  category: KalenderCategory;
  date: string;          // ISO date string YYYY-MM-DD
  timeFrom?: string;     // HH:mm (optional)
  timeTo?: string;       // HH:mm (optional)
  location?: KalenderLocation;
  createdBy: string;     // username
  participants: string[]; // usernames
  createdAt: Date;
  updatedAt: Date;
}
