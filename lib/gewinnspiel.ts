import type { ObjectId } from "mongodb";

// ── Status-Zustände eines Gewinnspiels ──────────────────────────────────────

export type GewinnspielhStatus =
  | "vorschlag"   // Vom Autor eingereicht – Admin muss noch Zeiträume setzen
  | "anmeldung"   // Anmeldephase aktiv
  | "verlost"     // Ziehung erfolgt, Gewinner benachrichtigt
  | "versendet"   // Autor hat Buch versendet
  | "archiv";     // Abgeschlossen / archiviert

// ── Haupt-Dokument ──────────────────────────────────────────────────────────

export type GewinnspielDocument = {
  _id?: ObjectId;

  /** Buchname (Snapshot zum Zeitpunkt der Erstellung) */
  buchTitel: string;
  /** MongoDB ObjectId des Buches als String */
  buchId: string;
  /** Autor-Username */
  autorUsername: string;
  /** Autor-Displayname (Snapshot) */
  autorName: string;
  /** Cover-URL (Snapshot) */
  coverImageUrl: string;

  /** "ebook" | "print" | "both" */
  format: "ebook" | "print" | "both";

  /** Beschreibungstext (optional, vom Autor) */
  beschreibung?: string;

  /** Wann darf die Anmeldung starten (UTC) – nur gesetzt wenn Admin aktiviert hat */
  anmeldungVon?: Date;
  /** Wann endet die Anmeldephase (UTC) */
  anmeldungBis?: Date;
  /** Wann findet die Ziehung statt (UTC) */
  ziehungAm?: Date;

  status: GewinnspielhStatus;

  /** Gewinner-Username – nur nach Ziehung gesetzt */
  gewinnerUsername?: string;
  /** Gewinner-Displayname (öffentlich sichtbar nach Ziehung) */
  gewinnerName?: string;
  /** Gewinner-E-Mail – nur für Autor + Admin sichtbar */
  gewinnerEmail?: string;
  /** Gewinner-Adresse (für Print) – nur für Autor + Admin */
  gewinnerAdresse?: string;

  /** Zeitstempel der Ziehung */
  verlostAm?: Date;
  /** Zeitstempel Versandbestätigung */
  versendetAm?: Date;

  createdAt: Date;
  updatedAt: Date;
};

// ── Teilnahme-Dokument ──────────────────────────────────────────────────────

export type GewinnspielteilnahmeDocument = {
  _id?: ObjectId;
  gewinnspielId: string;
  username: string;
  /** Anzeigename (Snapshot) */
  displayName: string;
  /** E-Mail für Benachrichtigung */
  email: string;
  /** Adresse für Printversand (nur bei Teilnahme an Print-Gewinnspielen) */
  adresse?: string;
  /** Stadt */
  ort?: string;
  /** Land */
  land?: string;
  angemeldetAt: Date;
};

// ── Payload-Typen ───────────────────────────────────────────────────────────

/** Vom Autor eingereicht – nur Buch + Format + Beschreibung */
export type CreateGewinnspielPayload = {
  buchId: string;
  format: "ebook" | "print" | "both";
  beschreibung?: string;
  anmeldungVon?: string;
  anmeldungBis?: string;
  ziehungAm?: string;
};

/** Vom Admin gesetzt – Zeiträume + Aktivierung */
export type AktivierungPayload = {
  anmeldungVon: string;
  anmeldungBis: string;
  ziehungAm: string;
};

export type TeilnahmePayload = {
  gewinnspielId: string;
  adresse?: string;
  ort?: string;
  land?: string;
};
