/**
 * BuchArena Typen und CSV-Parser
 *
 * Die CSV-Struktur:
 * - Spalte A: Metadaten/Beschreibungen (Labels)
 * - Ab Spalte B: Einzelne Bücher (Daten)
 *
 * Zeilen (0-basiert):
 * 0: #Videolink - Video-Links
 * 1: Veröffentlichungsdatum des Videos
 * 2: #LinkmitHinweis - Text mit Link unter dem Video
 * 3: #Amazonlink - Amazon Affiliate Links
 * 4: #Dateiname - Dateiname
 * 5: #Titel und Autor - Titel + Autor (für Menü)
 * 6: #Titel - Buchtitel (detailliert)
 * 7: #Autor - Autor
 * 8: #xx - Einleitung Label
 * Ab 9: Inhaltssektionen (Überschriften und Texte wechseln sich ab)
 */

export interface Buch {
  id: string;
  menuTitle: string;
  title: string;
  author: string;
  genre?: string;
  ageLevel?: string;
  videoLink?: string;
  videoPublishDate?: string;
  videoLinkText?: string;
  sections: {
    heading: string;
    text: string;
  }[];
}

export function isVideoPublished(publishDate?: string): boolean {
  if (!publishDate) return false;
  try {
    const date = new Date(publishDate);
    const now = new Date();
    return date <= now;
  } catch {
    return false;
  }
}

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export function parseBuchArenaCSV(csvContent: string): Buch[] {
  const lines = csvContent.split(/\r?\n/);

  if (lines.length < 10) {
    throw new Error("CSV-Datei hat zu wenige Zeilen");
  }

  const parsedLines = lines.map((line) => line.split(";"));

  const firstRow = parsedLines[0];
  if (!firstRow || firstRow.length < 2) {
    throw new Error("CSV-Datei hat keine Bücher-Spalten");
  }

  const books: Buch[] = [];

  for (let col = 1; col < firstRow.length; col++) {
    const menuTitle = parsedLines[5]?.[col]?.trim() || "";

    if (!menuTitle || menuTitle === "") continue;

    const videoLink = parsedLines[0]?.[col]?.trim() || "";
    const videoPublishDate = parsedLines[1]?.[col]?.trim() || "";
    const videoLinkText = parsedLines[2]?.[col]?.trim() || "";
    const title = parsedLines[6]?.[col]?.trim() || menuTitle;
    const author = parsedLines[7]?.[col]?.trim() || "";
    const genre = parsedLines[8]?.[col]?.trim() || "";
    const ageLevel = parsedLines[9]?.[col]?.trim() || "";

    const sections = [];

    const headingRows = [10, 12, 14, 16];
    const textRows = [11, 13, 15, 17];

    for (let i = 0; i < headingRows.length; i++) {
      const heading = parsedLines[headingRows[i]]?.[col]?.trim() || "";
      const text = parsedLines[textRows[i]]?.[col]?.trim() || "";

      if (heading || text) {
        sections.push({ heading, text });
      }
    }

    books.push({
      id: generateBookId(col),
      menuTitle,
      title,
      author,
      genre: genre || undefined,
      ageLevel: ageLevel || undefined,
      videoLink: videoLink || undefined,
      videoPublishDate: videoPublishDate || undefined,
      videoLinkText: videoLinkText || undefined,
      sections,
    });
  }

  return books;
}

function generateBookId(colIndex: number): string {
  if (colIndex < 27) {
    return String.fromCharCode(96 + colIndex);
  }
  const first = Math.floor((colIndex - 1) / 26);
  const second = (colIndex - 1) % 26;
  return String.fromCharCode(96 + first) + String.fromCharCode(97 + second);
}
