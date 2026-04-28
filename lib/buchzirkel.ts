import type { ObjectId } from "mongodb";

// ── Typen ──────────────────────────────────────────────────────────────────

export type BuchzirkelTyp = "testleser" | "betaleser";

export type BuchzirkelStatus =
  | "entwurf"
  | "bewerbung"
  | "aktiv"
  | "abgeschlossen"
  | "archiviert";

export type BuchzirkelTopicTyp =
  | "abschnitt"
  | "charakter"
  | "buchoutfit"
  | "fragen"
  | "allgemein";

export type BuchzirkelLeseabschnitt = {
  id: string;
  titel: string;
  deadline: Date;
  beschreibung?: string;
};

export type BuchzirkelTopic = {
  id: string;
  titel: string;
  typ: BuchzirkelTopicTyp;
};

export type BuchzirkelDatei = {
  id: string;
  abschnittId?: string;
  originalName: string;
  webdavPath: string;       // Pfad im WebDAV (ohne Wasserzeichen-Variante)
  uploadedAt: Date;
  uploadedBy: string;
};

export type BuchzirkelFragebogenFrage = {
  id: string;
  frage: string;
};

export type BuchzirkelDocument = {
  _id?: ObjectId;
  typ: BuchzirkelTyp;

  // Verknüpfungen
  veranstalterUsername: string;
  buchId?: string;              // optional: existierendes Buch in der DB

  // Basis-Info
  titel: string;
  beschreibung: string;
  coverImageUrl?: string;
  genre: string;

  // Status
  status: BuchzirkelStatus;

  // Bewerbungsphase
  bewerbungBis: Date;
  maxTeilnehmer: number;
  bewerbungsFragen: string[];
  genreFilter: string[];

  // AGB / Verschwiegenheit
  agbPflicht: boolean;
  agbText: string;

  // Zeitplan
  leseabschnitte: BuchzirkelLeseabschnitt[];

  // Dateien (für Betaleser)
  dateien: BuchzirkelDatei[];

  // Diskussions-Bereiche
  diskussionsTopics: BuchzirkelTopic[];

  // Fragebogen (am Ende)
  fragebogen: BuchzirkelFragebogenFrage[];

  createdAt: Date;
  updatedAt: Date;
};

// ── Bewerbungen ────────────────────────────────────────────────────────────

export type BewerbungStatus = "ausstehend" | "angenommen" | "abgelehnt";

export type BuchzirkelBewerbungDocument = {
  _id?: ObjectId;
  buchzirkelId: ObjectId;
  bewerberUsername: string;
  status: BewerbungStatus;
  antworten: { frageIndex: number; antwort: string }[];
  agbAkzeptiert?: boolean;
  agbAkzeptiertAt?: Date;
  bewirbtSichAm: Date;
  entschiedenAm?: Date;
};

// ── Teilnahmen ─────────────────────────────────────────────────────────────

export type RezensionsLink = {
  plattform: string;
  url: string;
  eingetragen: Date;
};

export type FragebogenAntwort = {
  frageId: string;
  antwort: string;
  abgegebenAm: Date;
};

export type TeilnehmerDatei = {
  dateiId: string;
  webdavPath: string;   // personalisierter Pfad mit Wasserzeichen
};

export type BuchzirkelTeilnahmeDocument = {
  _id?: ObjectId;
  buchzirkelId: ObjectId;
  teilnehmerUsername: string;

  // Fortschritt
  abgeschlosseneAbschnitte: string[];

  // Wasserzeichen-Dateien (pro Teilnehmer)
  persoenlicheDateien: TeilnehmerDatei[];

  // Rezensions-Links
  rezensionsLinks: RezensionsLink[];

  // Fragebogen
  fragebogenAntworten: FragebogenAntwort[];

  // Gütesiegel
  abgebrochen: boolean;
  abgebrochenAm?: Date;

  beigetreten: Date;
};

// ── Beiträge ───────────────────────────────────────────────────────────────

export type BeitragReaktion = {
  username: string;
  emoji: string;
};

export type BeitragAntwort = {
  _id?: ObjectId;
  autorUsername: string;
  body: string;
  createdAt: Date;
  reactions: BeitragReaktion[];
};

export type BuchzirkelBeitragDocument = {
  _id?: ObjectId;
  buchzirkelId: ObjectId;
  topicId: string;
  autorUsername: string;

  titel?: string;
  body: string;

  reactions: BeitragReaktion[];
  replies: BeitragAntwort[];

  // Teilen-Features (Autor)
  imTreffpunktGeteilt: boolean;
  treffpunktDiscussionId?: ObjectId;
  inBuchbeschreibungGeteilt: boolean;

  createdAt: Date;
  lastActivityAt: Date;
};

// ── Standard AGB-Text ─────────────────────────────────────────────────────

export const STANDARD_AGB_TEXT = `Mit der Teilnahme an diesem Buchzirkel verpflichte ich mich zur vollständigen Verschwiegenheit gegenüber Dritten bezüglich aller im Rahmen dieses Buchzirkels erhaltenen unveröffentlichten Texte, Kapitel und Materialien.

Ich werde keine der erhaltenen Dateien, Texte oder Inhalte ohne ausdrückliche schriftliche Genehmigung des Autors/der Autorin:
• vervielfältigen, weitergeben oder veröffentlichen
• in sozialen Medien oder auf anderen Plattformen teilen
• für eigene Zwecke verwenden

Ich nehme zur Kenntnis, dass alle erhaltenen Dateien mit einem persönlichen Wasserzeichen versehen sind und die Weitergabe von Dateien rückverfolgbar ist.

Die Verschwiegenheitspflicht gilt auch nach Abschluss des Buchzirkels zeitlich unbegrenzt, solange das Werk nicht offiziell veröffentlicht wurde.`;

// ── Standard Diskussions-Topics ────────────────────────────────────────────

export const STANDARD_TOPICS: BuchzirkelTopic[] = [
  { id: "allgemein", titel: "Allgemein", typ: "allgemein" },
  { id: "fragen", titel: "Frag den Autor", typ: "fragen" },
  { id: "charakter", titel: "Charaktere & Entwicklung", typ: "charakter" },
  { id: "buchoutfit", titel: "Cover & Buchsatz", typ: "buchoutfit" },
];

export const ALLOWED_BEITRAG_EMOJIS = ["👍", "❤️", "😂", "🎉", "🤔", "👎"];
