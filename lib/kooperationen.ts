import type { ObjectId } from "mongodb";

/**
 * Kooperations-Rollen, die ein Partner haben kann.
 * "autor" ist immer eine Seite der Beziehung.
 */
export type KooperationsRolle = "autor" | "sprecher" | "blogger" | "testleser" | "lektor" | "verlag";

export const ROLLE_LABELS: Record<KooperationsRolle, string> = {
  autor: "Autor/in",
  sprecher: "Sprecher/in",
  blogger: "Blogger/in",
  testleser: "Testleser/in",
  lektor: "Lektor/in",
  verlag: "Verlag",
};

/** URL-Prefix für das öffentliche Profil je Rolle */
export const ROLLE_PROFILE_PATH: Record<KooperationsRolle, string> = {
  autor: "/autor",
  sprecher: "/sprecher",
  blogger: "/blogger",
  testleser: "/testleser",
  lektor: "/lektoren",
  verlag: "/verlage",
};

export type KooperationStatus = "pending" | "confirmed";

export type KooperationDocument = {
  _id?: ObjectId;
  /** Wer hat die Anfrage erstellt */
  requesterUsername: string;
  /** In welcher Rolle tritt der Requester auf */
  requesterRole: KooperationsRolle;
  /** Wer soll bestätigen */
  partnerUsername: string;
  /** In welcher Rolle tritt der Partner auf */
  partnerRole: KooperationsRolle;
  status: KooperationStatus;
  createdAt: Date;
  confirmedAt?: Date;
};

/** Payload für die öffentliche Anzeige */
export type KooperationPartner = {
  username: string;
  displayName: string;
  rolle: KooperationsRolle;
  profileImage?: string;
};
