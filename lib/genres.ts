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
  "Grounded Fantasy Sci-Fi",
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
  "Medical Drama",
  "Mystery",
  "Naturführer / Bestimmungsbuch",
  "New Adult",
  "Philosophie",
  "Psychothriller",
  "Queere Literatur",
  "Ratgeber / Selbsthilfe",
  "Reisebericht / Reiseführer",
  "Romantasy",
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
  "Spirituelles",
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
const GENRE_ALIAS_ENTRIES: [string, string][] = [
  ["high fantasy",    "Fantasy – High Fantasy"],
  ["high-fantasy",    "Fantasy – High Fantasy"],
  ["dark fantasy",    "Fantasy – Dark Fantasy"],
  ["dark-fantasy",    "Fantasy – Dark Fantasy"],
  ["urban fantasy",   "Fantasy – Urban Fantasy"],
  ["urban-fantasy",   "Fantasy – Urban Fantasy"],
  ["science fiction", "Science-Fiction"],
  ["space opera",     "Science-Fiction – Space Opera"],
  ["space-opera",     "Science-Fiction – Space Opera"],
];

const GENRE_ALIAS_MAP: Record<string, string> = (() => {
  const map: Record<string, string> = {};

  // Map every canonical genre (lowercased) to itself.
  for (const g of GENRE_OPTIONS) {
    map[g.toLowerCase()] = g;
  }

  // Explicit short-form / hyphenated aliases → canonical form
  for (const [alias, canonical] of GENRE_ALIAS_ENTRIES) {
    map[alias] = canonical;
  }

  return map;
})();

export function normalizeGenre(g: string): string {
  const trimmed = g.trim();
  if (!trimmed) return trimmed;
  return GENRE_ALIAS_MAP[trimmed.toLowerCase()] ?? trimmed;
}

/**
 * Returns all raw strings (canonical name + known aliases) that normalize to
 * the given canonical genre.  Used by server-side DB queries to match books
 * regardless of which format their genre field was stored in.
 *
 * Example: getGenreVariants("Fantasy – High Fantasy")
 *   → ["Fantasy – High Fantasy", "high fantasy", "high-fantasy"]
 */
export function getGenreVariants(canonical: string): string[] {
  const variants: string[] = [canonical];
  for (const [alias, target] of GENRE_ALIAS_ENTRIES) {
    if (target === canonical) {
      variants.push(alias);
    }
  }
  return variants;
}

/**
 * Parst einen Genre-String (kommasepariert) in ein sauberes Array.
 * Einzelwerte wie "Fantasy" werden zu ["Fantasy"].
 */
export function parseGenres(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
}

/** Wandelt ein Genre-Array zurück in einen kommaseparierten String. */
export function joinGenres(genres: string[]): string {
  return genres.join(", ");
}
