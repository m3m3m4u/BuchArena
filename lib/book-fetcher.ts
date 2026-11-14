/**
 * BuchArena Book & Cover Fetcher
 * Ruft Metadaten und Cover-Bilder anhand der ISBN ab (Open Library / Google Books)
 * und generiert automatisch den Amazon-Affiliate-Kauf-Link.
 */

export type BookLookupResult = {
  isbn: string;
  title: string;
  subtitle?: string;
  authors: string[];
  publisher: string;
  publicationYear: number;
  pageCount: number;
  description: string;
  coverImageUrl: string;
  amazonAffiliateUrl: string;
  buyLinks: string[];
  genre?: string;
};

/**
 * Wandelt eine 13-stellige ISBN (beginnend mit 978) in die 10-stellige ISBN/ASIN um,
 * die Amazon für direkte /dp/-Produktlinks verlangt.
 */
export function isbn13ToIsbn10(isbn13: string): string | null {
  const clean = isbn13.replace(/[^0-9X]/gi, "");
  if (clean.length === 10) return clean;
  if (!clean.startsWith("978") || clean.length !== 13) return null;
  const core = clean.substring(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(core[i], 10) * (10 - i);
  }
  const remainder = sum % 11;
  const check = (11 - remainder) % 11;
  const checkChar = check === 10 ? "X" : String(check);
  return core + checkChar;
}

/**
 * Erzeugt einen direkten Amazon-Produktlink (/dp/ASIN) mit deinem Partner-Tag.
 */
export function buildAmazonAffiliateUrl(isbnOrAsin: string): string {
  const tag = process.env.AMAZON_PARTNER_TAG || "erklaerung-21";
  const cleanId = isbnOrAsin.replace(/[^0-9X]/gi, "");

  // Wenn es 13-stellig ist, in 10-stellige ASIN/ISBN für den direkten Produkt-Link umrechnen
  const asin = cleanId.length === 13 ? (isbn13ToIsbn10(cleanId) || cleanId) : cleanId;

  return `https://www.amazon.de/dp/${asin}?tag=${tag}`;
}

/**
 * Fragt Buchdaten und hochauflösendes Cover über Open Library ab.
 */
export async function lookupBookByIsbn(rawIsbn: string): Promise<BookLookupResult | null> {
  const cleanIsbn = rawIsbn.replace(/[^0-9X]/gi, "");
  if (!cleanIsbn || (cleanIsbn.length !== 10 && cleanIsbn.length !== 13)) {
    return null;
  }

  const amazonLink = buildAmazonAffiliateUrl(cleanIsbn);

  try {
    const bibKey = `ISBN:${cleanIsbn}`;
    const url = `https://openlibrary.org/api/books?bibkeys=${bibKey}&format=json&jscmd=data`;
    const res = await fetch(url, { next: { revalidate: 3600 } });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const entry = data[bibKey];

    if (!entry) {
      // Wenn Open Library keine Daten hat, liefern wir Basisdaten mit Cover-URL-Schema
      return {
        isbn: cleanIsbn,
        title: "",
        authors: [],
        publisher: "",
        publicationYear: new Date().getFullYear(),
        pageCount: 0,
        description: "",
        coverImageUrl: `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`,
        amazonAffiliateUrl: amazonLink,
        buyLinks: [amazonLink]
      };
    }

    // Autoren extrahieren
    const authors = Array.isArray(entry.authors)
      ? entry.authors.map((a: { name?: string }) => a.name?.trim()).filter(Boolean)
      : [];

    // Verlag
    const publisher = Array.isArray(entry.publishers) && entry.publishers.length > 0
      ? entry.publishers[0].name ?? ""
      : "";

    // Erscheinungsjahr (extrahiert aus z.B. "2000" oder "October 15, 2018")
    let publicationYear = new Date().getFullYear();
    if (entry.publish_date) {
      const yearMatch = entry.publish_date.match(/\b(19\d\d|20\d\d)\b/);
      if (yearMatch) {
        publicationYear = parseInt(yearMatch[1], 10);
      }
    }

    // Cover-URL: Bevorzuge 'large', dann 'medium', Fallback auf Direkt-Link
    let coverImageUrl = entry.cover?.large || entry.cover?.medium || "";
    if (!coverImageUrl) {
      coverImageUrl = `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`;
    }

    // Beschreibung oder Excerpt
    let description = "";
    if (typeof entry.description === "string") {
      description = entry.description;
    } else if (entry.description && typeof entry.description.value === "string") {
      description = entry.description.value;
    } else if (Array.isArray(entry.excerpts) && entry.excerpts.length > 0) {
      description = entry.excerpts[0].text || "";
    }

    return {
      isbn: cleanIsbn,
      title: entry.title || "",
      subtitle: entry.subtitle || "",
      authors,
      publisher,
      publicationYear,
      pageCount: Number(entry.number_of_pages) || 0,
      description,
      coverImageUrl,
      amazonAffiliateUrl: amazonLink,
      buyLinks: [amazonLink]
    };
  } catch (error) {
    console.error("Fehler beim Abruf von Open Library:", error);
    return null;
  }
}
