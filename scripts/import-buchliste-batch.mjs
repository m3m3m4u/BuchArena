import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import { readFileSync } from "node:fs";

dotenv.config({ path: ".env.local" });

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_IDS = new Set(process.argv.slice(2).filter((arg) => /^B\d{3}$/.test(arg)));
const DEFAULT_IDS = ["B001", "B002", "B003", "B004", "B005", "B006", "B007", "B008", "B009", "B010"];
const ids = BATCH_IDS.size > 0 ? [...BATCH_IDS] : DEFAULT_IDS;

// Verifizierte deutschsprachige Ausgaben für das erste Paket.
const FIRST_BATCH_EDITIONS = {
  "Die Päpstin": {
    isbn: "9783746614007", pageCount: 566, publicationYear: 1999, publisher: "Aufbau-Taschenbuch",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9783746614007-L.jpg?default=false",
  },
  "Das Bernstein-Teleskop": {
    isbn: "9783551580375", pageCount: 593, publicationYear: 2001, publisher: "Carlsen",
    coverImageUrl: "https://images-na.ssl-images-amazon.com/images/P/9783551580375.01.LZZZZZZZ.jpg",
  },
  "Der Goldene Kompass": {
    isbn: "9783453137448", pageCount: 410, publicationYear: 1996, publisher: "Heyne",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9783453137448-L.jpg?default=false",
  },
  "Berge des Wahnsinns": {
    isbn: "9783518392607", pageCount: 190, publicationYear: 1997, publisher: "Suhrkamp",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9783518392607-L.jpg?default=false",
  },
  "Holly": {
    isbn: "9783453274334", pageCount: 639, publicationYear: 2023, publisher: "Heyne",
    coverImageUrl: "https://images-na.ssl-images-amazon.com/images/P/9783453274334.01.LZZZZZZZ.jpg",
  },
  "Aquila": {
    isbn: "9783785586136", pageCount: 424, publicationYear: 2017, publisher: "Loewe",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9783785586136-L.jpg?default=false",
  },
  "Bis(s) zum Abendrot": {
    isbn: "9783551581662", pageCount: 619, publicationYear: 2008, publisher: "Carlsen",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9783551581662-L.jpg?default=false",
  },
  "Bis(s) zum Ende der Nacht": {
    isbn: "9783551581990", pageCount: 788, publicationYear: 2009, publisher: "Carlsen",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9783551581990-L.jpg?default=false",
  },
  "Bis(s) zum Morgengrauen": {
    isbn: "9783551581495", pageCount: 510, publicationYear: 2009, publisher: "Carlsen",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9783551581495-L.jpg?default=false",
  },
  "Bis(s) zur Mittagsstunde": {
    isbn: "9783551581617", pageCount: 557, publicationYear: 2008, publisher: "Carlsen",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9783551581617-L.jpg?default=false",
  },
  "Cryptos": {
    isbn: "9783743200500", pageCount: 443, publicationYear: 2020, publisher: "Loewe",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9783743200500-L.jpg?default=false",
  },
  "Das Labyrinth der Träumenden Bücher": {
    isbn: "9783813503937", pageCount: 426, publicationYear: 2011, publisher: "Knaus",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9783813503937-L.jpg?default=false",
  },
  "Brennender Fels": {
    isbn: "9783426525166", pageCount: 430, publicationYear: 2020, publisher: "Knaur",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9783426525166-L.jpg?default=false",
  },
  "Elfenkönigin": {
    isbn: "9783453315693", pageCount: 912, publicationYear: 2014, publisher: "Heyne",
    coverImageUrl: "https://images-na.ssl-images-amazon.com/images/P/9783453315693.01.LZZZZZZZ.jpg",
  },
  "Zerrissene Erde": {
    isbn: "9783426521786", pageCount: 494, publicationYear: 2018, publisher: "Knaur",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9783426521786-L.jpg?default=false",
  },
  "Die Geschichte des Wassers": {
    isbn: "9783442718313", pageCount: 479, publicationYear: 2019, publisher: "btb",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9783442718313-L.jpg?default=false",
  },
  "Die große Stille": {
    isbn: "9783965090354", pageCount: 390, publicationYear: 2023, publisher: "Golkonda",
    coverImageUrl: "https://golkonda-verlag.com/wp-content/uploads/2021/06/Chiang_Die-grosse-Stille_9783965090354_72dpi.jpg",
  },
  "Die Maschinen": {
    isbn: "9783453316362", pageCount: 544, publicationYear: 2015, publisher: "Heyne",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9783453316362-L.jpg?default=false",
  },
  "Die Parabel vom Sämann": {
    isbn: "9783453534926", pageCount: 448, publicationYear: 2023, publisher: "Heyne",
    coverImageUrl: "https://www.penguin.de/resource/responsive-image/3351116/280/19/butler-o-edie-parabel-vom-saemann-235492-jpg.jpg",
  },
  "Die Seiten der Welt": {
    isbn: "9783841421654", pageCount: 555, publicationYear: 2014, publisher: "Fischer FJB",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9783841421654-L.jpg?default=false",
  },
  "Harry Potter und der Gefangene von Askaban": { isbn: "9783551354037", pageCount: 352 },
  "Harry Potter und der Feuerkelch": { isbn: "9783551354044", pageCount: 704 },
  "Harry Potter und der Orden des Phönix": { isbn: "9783551354051", pageCount: 960 },
  "Harry Potter und der Halbblutprinz": { isbn: "9783551354068", pageCount: 640 },
  "Harry Potter und die Heiligtümer des Todes": { isbn: "9783551354075", pageCount: 752 },
  Saphirblau: { isbn: "9783401063478", pageCount: 376 },
  Smaragdgrün: { isbn: "9783401063485", pageCount: 552 },
  Tintenblut: { isbn: "9783791504674", pageCount: 736 },
  Tintentod: { isbn: "9783791504766", pageCount: 736 },
  Momo: { isbn: "9783522202756", pageCount: 304 },
  "Der Herr der Ringe: Die Gefährten": { isbn: "9783608989410", pageCount: 608 },
  "Der Herr der Ringe: Die zwei Türme": { isbn: "9783608989427", pageCount: 512 },
  "Der Herr der Ringe: Die Rückkehr des Königs": { isbn: "9783608989434", pageCount: 576 },
  "Gone Girl – Das perfekte Opfer": { isbn: "9783596188789", pageCount: 592 },
  "Friedhof der Kuscheltiere": { isbn: "9783548263106", pageCount: 608 },
  "Der Drachenläufer": { isbn: "9783833301490", pageCount: 384 },
  "Jane Eyre": { isbn: "9783150189207", pageCount: 672 },
  Sturmhöhe: { isbn: "9783423143554", pageCount: 464 },
  "Das Silmarillion": { isbn: "9783608938296", pageCount: 592 },
  "Nachrichten aus Mittelerde": { isbn: "9783608984583", pageCount: 720 },
  "Die Kinder Húrins": { isbn: "9783608960419", pageCount: 336 },
  "Die Furcht des Weisen 1": { isbn: "9783608938166", pageCount: 859 },
  "Die Furcht des Weisen 2": { isbn: "9783608938926", pageCount: 830 },
  "Die Musik der Stille": { isbn: "9783608960204", pageCount: 173 },
  "Kinder des Nebels": { isbn: "9783492704793", pageCount: 896 },
  "Krieger des Feuers": { isbn: "9783492705042", pageCount: 992 },
  "Herrscher des Lichts": { isbn: "9783453523388", pageCount: 989 },
  "Der Weg der Könige": { isbn: "9783453317109", pageCount: 832 },
  "Der Pfad der Winde": { isbn: "9783453317680", pageCount: 800 },
  "Die Worte des Lichts": { isbn: "9783453267473", pageCount: 976 },
  "Die Stürme des Zorns": { isbn: "9783453318649", pageCount: 672 },
  Elantris: { isbn: "9783453521674", pageCount: 704 },
  Sturmklänge: { isbn: "9783453321649", pageCount: 768 },
  "Der letzte Wunsch": { isbn: "9783423262644", pageCount: 384 },
  "Das Schwert der Vorsehung": { isbn: "9783423262651", pageCount: 464 },
  "Das Erbe der Elfen": { isbn: "9783423262446", pageCount: 384 },
  "Die Zeit der Verachtung": { isbn: "9783423262453", pageCount: 400 },
  Feuertaufe: { isbn: "9783423262484", pageCount: 400 },
  "Der Schwalbenturm": { isbn: "9783423262460", pageCount: 544 },
  "Die Dame vom See": { isbn: "9783423262477", pageCount: 560 },
  "Zeit des Sturms": { isbn: "9783423262668", pageCount: 448 },
  "Der Magier der Erdsee": { isbn: "9783551580900", pageCount: 272 },
  "Die Gräber von Atuan": { isbn: "9783551580894", pageCount: 215 },
  "Das ferne Ufer": { isbn: "9783551580917", pageCount: 319 },
  "Die Farben der Magie": { isbn: "9783492280624", pageCount: 256 },
  "Das Licht der Phantasie": { isbn: "9783492280167", pageCount: 288 },
  "Gevatter Tod": { isbn: "9783492280648", pageCount: 328 },
  "Wachen! Wachen!": { isbn: "9783492280686", pageCount: 424 },
  "Alles Sense": { isbn: "9783492280662", pageCount: 352 },
  "Kleine freie Männer": { isbn: "9783492282819", pageCount: 320 },
  Niemalsland: { isbn: "9783847906155", pageCount: 480 },
  "American Gods": { isbn: "9783847905875", pageCount: 672 },
  Sternwanderer: { isbn: "9783847901037", pageCount: 208 },
  Piranesi: { isbn: "9783453321984", pageCount: 269 },
  "Jonathan Strange & Mr Norrell": { isbn: "9783453424746", pageCount: 1020 },
  "Fourth Wing – Flammengeküsst": { isbn: "9783423220996", pageCount: 816 },
  "Iron Flame – Flammengeküsst": { isbn: "9783423221948", pageCount: 960 },
  "Onyx Storm – Flammengeküsst": { isbn: "9783423284493", pageCount: 896 },
  Elfenkrone: { isbn: "9783570313589", pageCount: 384 },
  Elfenkönig: { isbn: "9783570313992", pageCount: 400 },
  "Scholomance – Tödliche Lektion": { isbn: "9783570166093", pageCount: 416 },
  "Rumo & Die Wunder im Dunkeln": { isbn: "9783492267106", pageCount: 704 },
  "Die Foundation-Trilogie": { isbn: "9783453042650", pageCount: 704 },
  "Die linke Hand der Dunkelheit": { isbn: "9783453050266", pageCount: 320 },
  "Freie Geister": { isbn: "9783453050273", pageCount: 400 },
  "Tagebuch eines Killerbots": { isbn: "9783453320345", pageCount: 160 },
  "Das dunkle Herz des Waldes": { isbn: "9783570312445", pageCount: 573 },
  "Das Gold der Krähen": { isbn: "9783426654491", pageCount: 588 },
  "Das kalte Reich des Silbers": { isbn: "9783570165492", pageCount: 576 },
  "Das Lied der Krähen": { isbn: "9783426654439", pageCount: 592 },
  "Das Reich der sieben Höfe – Dornen und Rosen": { isbn: "9783423718493", pageCount: 480 },
  "Das Reich der sieben Höfe – Flammen und Finsternis": { isbn: "9783423718790", pageCount: 720 },
  "Das Reich der sieben Höfe – Frost und Mondlicht": { isbn: "9783423718967", pageCount: 352 },
  "Das Reich der sieben Höfe – Silbernes Feuer": { isbn: "9783423719223", pageCount: 848 },
  "Das Reich der sieben Höfe – Sterne und Schwerter": { isbn: "9783423718882", pageCount: 720 },
  "Das neunte Haus": { isbn: "9783426227176", pageCount: 544 },
  "Der Schrecksenmeister": { isbn: "9783328107507", pageCount: 400 },
  "Throne of Glass – Der verwundete Krieger": { isbn: "9783423765350", pageCount: 832 },
  "Throne of Glass – Die Erwählte": { isbn: "9783423765305", pageCount: 512 },
  "Throne of Glass – Die Sturmbezwingerin": { isbn: "9783423765343", pageCount: 656 },
  "Throne of Glass – Erbin des Feuers": { isbn: "9783423765329", pageCount: 656 },
  "Throne of Glass – Herrscherin über Asche und Zorn": { isbn: "9783423765367", pageCount: 896 },
  "Throne of Glass – Königin der Finsternis": { isbn: "9783423765336", pageCount: 768 },
  "Throne of Glass – Kriegerin im Schatten": { isbn: "9783423765312", pageCount: 528 },
  "Die Verlobten des Winters": { isbn: "9783458177920", pageCount: 535 },
  "Die Zwerge": { isbn: "9783492281010", pageCount: 640 },
  "Krieg der Klone": { isbn: "9783104911854", pageCount: 912 },
  Frostfeuer: { isbn: "9783570304884", pageCount: 300 },
  Kriegsklingen: { isbn: "9783453532519", pageCount: 800 },
};

function parseRows(markdown) {
  return markdown.split(/\r?\n/)
    .filter((line) => /^\| B\d{3} \|/.test(line))
    .map((line) => {
      const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
      return { id: cells[0], priority: cells[1], title: cells[2], author: cells[3], focus: cells[4], isbn: cells[5], status: cells[6], line };
    });
}

function slugify(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function profileFor(author) {
  const empty = (visibility = "hidden") => ({ value: "", visibility });
  return {
    profileImage: { value: "", visibility: "hidden", crop: { x: 50, y: 50, zoom: 1 } },
    name: { value: author, visibility: "public" },
    motto: empty(), ueberMich: empty(), beruf: empty(), postalCode: empty(), city: empty(), country: empty(),
    socialInstagram: empty(), socialFacebook: empty(), socialLinkedin: empty(), socialTiktok: empty(), socialYoutube: empty(),
    socialPinterest: empty(), socialReddit: empty(), socialWebsite: empty(), socialLinktree: empty(), socialNewsletter: empty(),
    socialWhatsapp: empty(), socialEmail: empty(), socialVerlag: empty(),
  };
}

async function lookup(title, author) {
  const query = encodeURIComponent(`title:${title} author:${author}`);
  const response = await fetch(`https://openlibrary.org/search.json?q=${query}&limit=20&fields=title,author_name,isbn,first_publish_year,publisher,number_of_pages_median,cover_i,key,subject,language`, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`Open Library HTTP ${response.status}`);
  const data = await response.json();
  const docs = Array.isArray(data.docs) ? data.docs : [];
  const normalizedTitle = title.toLocaleLowerCase("de");
  const germanDocs = docs.filter((doc) => {
    const hasGermanLanguage = Array.isArray(doc.language) && doc.language.some((language) => ["ger", "deu", "de"].includes(String(language).toLowerCase()));
    const hasGermanIsbn = Array.isArray(doc.isbn) && doc.isbn.some((value) => String(value).startsWith("9783"));
    return hasGermanLanguage || hasGermanIsbn;
  });
  const match = germanDocs.find((doc) => String(doc.title ?? "").toLocaleLowerCase("de").includes(normalizedTitle)) ?? germanDocs[0];
  if (!match) return null;
  const isbn = (match.isbn ?? []).find((value) => /^9783\d{9}$/.test(value)) ?? (match.isbn ?? []).find((value) => /^97[89]\d{10}$/.test(value)) ?? (match.isbn ?? []).find((value) => /^\d{9}[\dX]$/.test(value));
  if (!isbn) return null;
  if (!String(isbn).startsWith("9783")) return null;
  const firstAuthor = Array.isArray(match.author_name) ? match.author_name.join(", ") : author;
  const year = Number(match.first_publish_year) || new Date().getFullYear();
  const pageCount = Number(match.number_of_pages_median) || 0;
  const coverImageUrl = match.cover_i ? `https://covers.openlibrary.org/b/id/${match.cover_i}-L.jpg` : `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
  const subjects = Array.isArray(match.subject) ? match.subject.slice(0, 8).join(", ") : "";
  return { isbn, publicationYear: year, pageCount, coverImageUrl, subjects, author: firstAuthor };
}

async function lookupLobidGermanEdition(title, author) {
  const response = await fetch(`https://lobid.org/resources/search?q=${encodeURIComponent(`${title} ${author}`)}&format=json&size=30`, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) return null;
  const data = await response.json();
  const normalizeTitle = (value = "") => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("de").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "");
  const wanted = normalizeTitle(title);
  const candidates = (Array.isArray(data.member) ? data.member : []).filter((entry) => {
    const candidate = normalizeTitle(entry.title);
    const german = Array.isArray(entry.language) && entry.language.some((language) => language?.label === "Deutsch");
    const isbn = Array.isArray(entry.isbn) && entry.isbn.some((value) => /^978\d{10}$/.test(String(value)));
    const extent = String(entry.extent || "");
    const publisher = String(entry.publication?.[0]?.publishedBy?.join(" ") || "");
    const print = !/(CD|DVD|MP3|Min\.|Online-Ressource)/i.test(extent) && !/(Audio|E-?Book|digital)/i.test(publisher);
    return german && isbn && print && (candidate.includes(wanted) || wanted.includes(candidate));
  });
  for (const entry of candidates) {
    const isbn = entry.isbn.find((value) => /^978\d{10}$/.test(String(value)));
    const coverCandidates = [
      `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`,
      `https://images-na.ssl-images-amazon.com/images/P/${isbn}.01.LZZZZZZZ.jpg`,
    ];
    for (const coverImageUrl of coverCandidates) {
      try {
        const cover = await fetch(coverImageUrl, { signal: AbortSignal.timeout(5000) });
        const bytes = (await cover.arrayBuffer()).byteLength;
        if (cover.ok && String(cover.headers.get("content-type") || "").startsWith("image/") && bytes >= 1000) {
          const year = Number(entry.publication?.[0]?.startDate) || new Date().getFullYear();
          const pageCount = Number(String(entry.extent || "").match(/\d+/)?.[0]) || 0;
          return { isbn, publicationYear: year, pageCount, publisher: entry.publication?.[0]?.publishedBy?.[0] || "", coverImageUrl, subjects: "" };
        }
      } catch {}
    }
  }
  return null;
}

async function lookupGermanEdition(title, author) {
  const queries = [`intitle:${title} inauthor:${author}`, `${title} ${author}`, title];
  let items = [];
  for (const rawQuery of queries) {
    const query = encodeURIComponent(rawQuery);
    let response;
    try {
      response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&langRestrict=de&maxResults=40&printType=books`, { signal: AbortSignal.timeout(5000) });
    } catch {
      continue;
    }
    if (!response.ok) continue;
    const data = await response.json();
    items = Array.isArray(data.items) ? data.items : [];
    if (items.length > 0) break;
  }
  const normalizedTitle = title.toLocaleLowerCase("de").replace(/[^a-z0-9äöüß]+/gi, " ").trim();
  const titleWords = normalizedTitle.split(/\s+/).filter((word) => word.length > 3);
  const match = items.find((item) => {
    const info = item.volumeInfo ?? {};
    const candidate = String(info.title ?? "").toLocaleLowerCase("de");
    return info.language === "de" && (candidate.includes(normalizedTitle) || titleWords.filter((word) => candidate.includes(word)).length >= Math.max(2, Math.ceil(titleWords.length * 0.6)));
  }) ?? items.find((item) => (item.volumeInfo ?? {}).language === "de");
  if (!match) return await lookupLobidGermanEdition(title, author) ?? lookup(title, author);
  const info = match.volumeInfo ?? {};
  const identifiers = Array.isArray(info.industryIdentifiers) ? info.industryIdentifiers : [];
  const isbn = identifiers.find((entry) => entry.type === "ISBN_13")?.identifier ?? identifiers.find((entry) => entry.type === "ISBN_10")?.identifier;
  if (!isbn) return await lookupLobidGermanEdition(title, author) ?? lookup(title, author);
  return {
    isbn,
    publicationYear: Number(String(info.publishedDate ?? "").match(/\d{4}/)?.[0]) || new Date().getFullYear(),
    pageCount: Number(info.pageCount) || 0,
    coverImageUrl: info.imageLinks?.thumbnail?.replace(/^http:/, "https:") || `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
    subjects: Array.isArray(info.categories) ? info.categories.join(", ") : "",
  };
}

function replaceStatus(markdown, row, replacement) {
  const oldCells = row.line.split("|").slice(1, -1).map((cell) => cell.trim());
  oldCells[5] = replacement.isbn;
  oldCells[6] = replacement.status;
  oldCells[7] = replacement.assignee;
  oldCells[8] = replacement.reference;
  const newLine = `| ${oldCells.join(" | ")} |`;
  return markdown.replace(row.line, newLine);
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      try {
        results[index] = await mapper(items[index]);
      } catch (error) {
        results[index] = { error: error instanceof Error ? error.message : String(error) };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

const markdownPath = "BUCHLISTE.md";
let markdown = readFileSync(markdownPath, "utf8");
const rows = parseRows(markdown);
const selected = ids.map((id) => rows.find((row) => row.id === id)).filter(Boolean);
if (selected.length !== ids.length) throw new Error(`Nicht alle IDs in BUCHLISTE.md gefunden: ${ids.join(", ")}`);

const uri = process.env.MONGODB_DIRECT_HOST
  ? process.env.MONGODB_URI.replace("mongodb+srv://", "mongodb://").replace("cluster0.zom4b9y.mongodb.net", process.env.MONGODB_DIRECT_HOST) + "&directConnection=true&tls=true"
  : process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI fehlt.");
const dbName = process.env.MONGODB_DB_NAME || "bucharena";
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
await client.connect();
try {
  const db = client.db(dbName);
  const users = db.collection("users");
  const books = db.collection("books");
  const results = [];
  const resolvedMetadata = await mapWithConcurrency(selected, 30, async (row) => {
    const edition = FIRST_BATCH_EDITIONS[row.title];
    const metadata = row.isbn !== "offen" ? { isbn: row.isbn } : edition ? { isbn: edition.isbn, pageCount: edition.pageCount } : await lookupGermanEdition(row.title, row.author);
    if (metadata && edition) {
      metadata.isbn = edition.isbn;
      metadata.pageCount = edition.pageCount;
      metadata.publicationYear = edition.publicationYear;
      metadata.publisher = edition.publisher;
      metadata.coverImageUrl = edition.coverImageUrl || `https://covers.openlibrary.org/b/isbn/${edition.isbn}-L.jpg?default=false`;
    }
    if (metadata?.coverImageUrl) {
      const coverResponse = await fetch(metadata.coverImageUrl, { signal: AbortSignal.timeout(5000) });
      const coverType = coverResponse.headers.get("content-type") || "";
      const coverBytes = (await coverResponse.arrayBuffer()).byteLength;
      if (!coverResponse.ok || !coverType.startsWith("image/") || coverBytes < 1000) {
        return { error: `Cover ungültig (${coverResponse.status}, ${coverType || "kein Typ"}, ${coverBytes} Bytes)` };
      }
    } else if (metadata) {
      return { error: "Kein Cover gefunden" };
    }
    return metadata;
  });
  for (const row of selected) {
    if (row.status === "Eingebaut" || row.status === "Bereits vorhanden") {
      results.push({ id: row.id, title: row.title, status: "skipped", reason: `bereits ${row.status}` });
      continue;
    }
    const metadata = resolvedMetadata[selected.indexOf(row)];
    if (!metadata || metadata.error) {
      results.push({ id: row.id, title: row.title, status: "error", reason: "Keine verifizierte deutschsprachige Ausgabe gefunden" });
      continue;
    }
    const now = new Date();
    const preferredAuthorUsername = `autor-${slugify(row.author)}`;
    const existingUser = await users.findOne({
      $or: [
        { displayName: row.author },
        { "profile.name.value": row.author },
        { username: preferredAuthorUsername },
      ],
    }, { sort: { createdAt: 1 }, projection: { username: 1 } });
    const authorUsername = existingUser?.username || preferredAuthorUsername;
    const existingBook = await books.findOne({
      $or: [
        { isbn: metadata.isbn },
        { title: { $regex: `^${escapeRegex(row.title)}$`, $options: "i" }, ownerUsername: authorUsername },
      ],
    }, { projection: { _id: 1, title: 1, isbn: 1, coverImageUrl: 1 } });
    if (DRY_RUN) {
      results.push({ id: row.id, title: row.title, status: existingBook ? "already-present" : "ready", isbn: metadata.isbn, authorUsername, existingUser: Boolean(existingUser), reference: existingBook ? `/buch/${existingBook._id.toString()}` : undefined });
      continue;
    }
    if (!existingUser) {
      await users.insertOne({
        username: authorUsername,
        email: `${authorUsername}@bucharena.local`,
        passwordHash: "!UNCLAIMED_PROFILE!",
        role: "USER",
        displayName: row.author,
        profile: profileFor(row.author),
        isUnclaimed: true,
        source: "imported",
        createdAt: now,
      });
    }
    let insertedBook = existingBook;
    if (!existingBook) {
      const insertResult = await books.insertOne({
        ownerUsername: authorUsername,
        coverImageUrl: metadata.coverImageUrl,
        title: row.title,
        subtitle: "",
        publicationYear: metadata.publicationYear,
        genre: row.focus,
        ageFrom: row.focus.includes("Kinder") || row.focus.includes("Jugend") ? 10 : 12,
        ageTo: 99,
        publisher: metadata.publisher || "",
        isbn: metadata.isbn,
        pageCount: metadata.pageCount,
        language: "Deutsch",
        description: `Importierter Katalogeintrag. Schlagwörter: ${metadata.subjects || row.focus}.`,
        buyLinks: [`https://www.amazon.de/s?k=${encodeURIComponent(metadata.isbn)}`],
        presentationVideoUrl: "",
        presentationVideoInternal: true,
        excerpts: [],
        isUnclaimed: true,
        source: "imported",
        createdAt: now,
      });
      insertedBook = { _id: insertResult.insertedId };
    }
    const reference = `/buch/${insertedBook._id.toString()}`;
    markdown = replaceStatus(markdown, row, { isbn: existingBook?.isbn || metadata.isbn, status: existingBook ? "Bereits vorhanden" : "Eingebaut", assignee: "Codex / 26.11.2026", reference: `${reference} / geprüft am 26.11.2026` });
    row.line = markdown.split(/\r?\n/).find((line) => line.includes(`| ${row.id} |`)) ?? row.line;
    results.push({ id: row.id, title: row.title, status: existingBook ? "already-present" : "created", isbn: metadata.isbn, reference });
  }
  if (!DRY_RUN) {
    const stillOpen = results.filter((result) => result.status === "error");
    if (stillOpen.length > 0) console.warn(`Nicht importiert: ${stillOpen.map((result) => result.id).join(", ")}`);
    const { writeFileSync } = await import("node:fs");
    writeFileSync(markdownPath, markdown, "utf8");
  }
  console.log(JSON.stringify({ dryRun: DRY_RUN, selected: selected.length, results }, null, 2));
} finally {
  await client.close();
}
