/** Zentrale Genre-Liste für Bücher und Einreichungen. Alphabetisch sortiert, "Sonstiges" am Ende. */
export const GENRE_OPTIONS = [
  "Abenteuer",
  "Biografie / Autobiografie",
  "Chick-Lit",
  "Comic / Manga / Graphic Novel",
  "Contemporary / Gegenwartsliteratur",
  "Cozy Mystery",
  "Dark Romance",
  "Detektivroman",
  "Drama",
  "Dystopie",
  "Erotik",
  "Fabel",
  "Familienroman",
  "Fantasy",
  "Fantasy – Dark Fantasy",
  "Fantasy – High Fantasy",
  "Fantasy – Urban Fantasy",
  "Gedichte / Lyrik",
  "Gesellschaftsroman",
  "Historischer Roman",
  "Horror",
  "Humor / Satire",
  "Jugendbuch (ab 12)",
  "Kinderbuch (ab 2)",
  "Kinderbuch (ab 6)",
  "Kinderbuch (ab 8)",
  "Klassiker",
  "Krimi",
  "Krimi / Thriller",
  "Kurzgeschichten",
  "LitRPG / GameLit",
  "Liebesroman / Romance",
  "Märchen / Sagen",
  "Mystery",
  "Naturführer / Bestimmungsbuch",
  "New Adult",
  "Philosophie",
  "Psychothriller",
  "Ratgeber / Selbsthilfe",
  "Reisebericht / Reiseführer",
  "Sachbuch",
  "Sachbuch – Geschichte",
  "Sachbuch – Naturwissenschaft",
  "Sachbuch – Politik / Gesellschaft",
  "Sachbuch – Psychologie",
  "Sachbuch – Sprache / Kultur",
  "Sachbuch – Technologie / IT",
  "Sachbuch – Wirtschaft / Finanzen",
  "Science-Fiction",
  "Science-Fiction – Cyberpunk",
  "Science-Fiction – Space Opera",
  "Spionageroman",
  "Steampunk",
  "Thriller",
  "True Crime",
  "Western",
  "Young Adult",
  "Sonstiges",
] as const;

export type Genre = (typeof GENRE_OPTIONS)[number];

/**
 * Normalize genre aliases so variants like "High-Fantasy" / "High Fantasy"
 * are treated as one.  Builds a case-insensitive lookup once; all subsequent
 * calls are O(1).
 */
const GENRE_ALIAS_MAP: Record<string, string> = (() => {
  const map: Record<string, string> = {};

  // Map every canonical genre (lowercased) to itself.
  for (const g of GENRE_OPTIONS) {
    map[g.toLowerCase()] = g;
  }

  // Explicit short-form / hyphenated aliases → canonical form
  const aliases: [string, string][] = [
    ["high fantasy",   "Fantasy – High Fantasy"],
    ["high-fantasy",   "Fantasy – High Fantasy"],
    ["dark fantasy",   "Fantasy – Dark Fantasy"],
    ["dark-fantasy",   "Fantasy – Dark Fantasy"],
    ["urban fantasy",  "Fantasy – Urban Fantasy"],
    ["urban-fantasy",  "Fantasy – Urban Fantasy"],
    ["science fiction", "Science-Fiction"],
    ["space opera",    "Science-Fiction – Space Opera"],
    ["space-opera",    "Science-Fiction – Space Opera"],
  ];

  for (const [alias, canonical] of aliases) {
    map[alias] = canonical;
  }

  return map;
})();

export function normalizeGenre(g: string): string {
  const trimmed = g.trim();
  if (!trimmed) return trimmed;
  return GENRE_ALIAS_MAP[trimmed.toLowerCase()] ?? trimmed;
}
