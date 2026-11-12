import { utils, write } from "xlsx";

export interface ReelExportItem {
  _id?: string;
  bookTitle: string;
  author: string;
  genre?: string;
  geschlecht?: string;
  instagram?: string | null;
  authorInstagram?: string | null;
  beschreibung?: string;
  notes?: string;
  status?: string;
  vorlage?: {
    thema?: string;
    hauptfigur?: string;
    inhalte?: string;
    autorHerkunft?: string;
    autorBeruf?: string;
    autorStil?: string;
    erscheinungsjahr?: string;
    verlag?: string;
  } | null;
}

/**
 * Normalizes any Instagram handle or URL to `@handle`.
 * Returns "" if not set.
 */
export function cleanInstagramHandle(val?: string | null): string {
  if (!val) return "";
  let s = val.trim();
  // Strip URL if present
  s = s.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "");
  s = s.replace(/[/?#].*$/, "");
  s = s.replace(/^@+/, "");
  s = s.trim();
  return s ? `@${s}` : "";
}

/**
 * Sanitizes a string for use in file names.
 */
export function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Builds the PPTX file name for a reel.
 */
export function buildReelFileName(
  bookTitle?: string,
  author?: string,
  version: "v1" | "v2" = "v2"
): string {
  const safeTitle = sanitizeFileName((bookTitle || "Reel").trim());
  const safeAuthor = sanitizeFileName((author || "").trim());
  const suffix = version === "v2" ? " (v2)" : "";
  return `Reel ${safeTitle}${safeAuthor ? ` von ${safeAuthor}` : ""}${suffix}.pptx`;
}

/**
 * Generates an engaging, professional Instagram caption for a reel.
 */
export function buildInstagramCaption(item: ReelExportItem): string {
  const cleanTitle = (item.bookTitle || "").trim();
  const cleanAuthor = (item.author || "").trim();
  const insta = cleanInstagramHandle(item.instagram || item.authorInstagram);
  const autorLabel = item.geschlecht === "Autor" ? "Autor" : "Autorin";
  const authorTag = insta ? `${cleanAuthor} (${insta})` : cleanAuthor;

  let text = (item.beschreibung || "").trim();
  text = text.replace(/\bTitel\b/g, cleanTitle);
  text = text.replace(/\bAutorin\b/g, autorLabel);

  const lines: string[] = [
    `✨ Buchempfehlung: »${cleanTitle}« von ${authorTag}`,
    "",
  ];

  if (text) {
    lines.push(text);
    lines.push("");
  }

  const details: string[] = [];
  if (item.genre?.trim()) details.push(`📚 Genre: ${item.genre.trim()}`);
  if (item.vorlage?.thema?.trim()) details.push(`🔍 Thema: ${item.vorlage.thema.trim()}`);
  if (item.vorlage?.hauptfigur?.trim()) details.push(`👤 Hauptfigur: ${item.vorlage.hauptfigur.trim()}`);

  if (details.length > 0) {
    lines.push(...details);
    lines.push("");
  }

  lines.push("👉 Mehr Buchempfehlungen, Leseproben und Autoren findest du auf bucharena.org! 📖");
  lines.push("");

  // Hashtags
  const cleanTitleTag = cleanTitle
    .replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "")
    .toLowerCase()
    .slice(0, 30);
  const cleanAuthorTag = cleanAuthor
    .replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "")
    .toLowerCase()
    .slice(0, 30);

  const hashtags = [
    "#bucharena",
    "#buchempfehlung",
    "#buchtipp",
    "#bookstagramgermany",
    "#bücherliebe",
    "#lesen",
    "#reels",
    cleanAuthorTag ? `#${cleanAuthorTag}` : "",
    cleanTitleTag ? `#${cleanTitleTag}` : "",
    "#instabooks",
  ].filter(Boolean);

  lines.push(hashtags.join(" "));

  return lines.join("\n");
}

export interface ReelExcelRow {
  Title: string;
  Autor: string;
  Insta: string;
  Caption: string;
  Beschreibung: string;
  Dateiname: string;
  Genre: string;
  Status: string;
}

/**
 * Converts reel items into structured rows matching the user's requested columns:
 * title, autor, insta, caption, beschreibung
 */
export function buildReelExcelRows(
  items: ReelExportItem[],
  version: "v1" | "v2" = "v2"
): ReelExcelRow[] {
  return items.map((sub) => {
    const cleanTitle = (sub.bookTitle || "").trim();
    const cleanAuthor = (sub.author || "").trim();
    const autorLabel = sub.geschlecht === "Autor" ? "Autor" : "Autorin";
    const beschreibung = (sub.beschreibung || "")
      .replace(/\bTitel\b/g, cleanTitle)
      .replace(/\bAutorin\b/g, autorLabel)
      .trim();
    const insta = cleanInstagramHandle(sub.instagram || sub.authorInstagram);
    const caption = buildInstagramCaption(sub);
    const dateiname = buildReelFileName(cleanTitle, cleanAuthor, version);

    return {
      Title: cleanTitle,
      Autor: cleanAuthor,
      Insta: insta,
      Caption: caption,
      Beschreibung: beschreibung,
      Dateiname: dateiname,
      Genre: (sub.genre || "").trim(),
      Status: sub.status || "",
    };
  });
}

/**
 * Creates an Excel workbook buffer from reel items.
 */
export function generateReelsExcelBuffer(
  items: ReelExportItem[],
  version: "v1" | "v2" = "v2"
): Uint8Array {
  const rows = buildReelExcelRows(items, version);
  const ws = utils.json_to_sheet(rows);

  ws["!cols"] = [
    { wch: 35 }, // Title
    { wch: 25 }, // Autor
    { wch: 25 }, // Insta
    { wch: 90 }, // Caption
    { wch: 90 }, // Beschreibung
    { wch: 45 }, // Dateiname
    { wch: 25 }, // Genre
    { wch: 15 }, // Status
  ];

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, version === "v2" ? "Reels Version 02" : "Reels");
  return write(wb, { bookType: "xlsx", type: "buffer" }) as Uint8Array;
}
