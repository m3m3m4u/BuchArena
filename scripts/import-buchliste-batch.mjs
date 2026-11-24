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
  "Elfenkönigin": { isbn: "9783570304570", pageCount: 318 },
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
  const response = await fetch(`https://openlibrary.org/search.json?q=${query}&limit=20&fields=title,author_name,isbn,first_publish_year,publisher,number_of_pages_median,cover_i,key,subject,language`);
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

async function lookupGermanEdition(title, author) {
  const queries = [`intitle:${title} inauthor:${author}`, `${title} ${author}`, title];
  let items = [];
  for (const rawQuery of queries) {
    const query = encodeURIComponent(rawQuery);
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&langRestrict=de&maxResults=40&printType=books`);
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
  if (!match) return lookup(title, author);
  const info = match.volumeInfo ?? {};
  const identifiers = Array.isArray(info.industryIdentifiers) ? info.industryIdentifiers : [];
  const isbn = identifiers.find((entry) => entry.type === "ISBN_13")?.identifier ?? identifiers.find((entry) => entry.type === "ISBN_10")?.identifier;
  if (!isbn) return lookup(title, author);
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
  for (const row of selected) {
    if (row.status === "Eingebaut" || row.status === "Bereits vorhanden") {
      results.push({ id: row.id, title: row.title, status: "skipped", reason: `bereits ${row.status}` });
      continue;
    }
    const edition = FIRST_BATCH_EDITIONS[row.title];
    const metadata = row.isbn !== "offen" ? { isbn: row.isbn } : edition ? { isbn: edition.isbn, pageCount: edition.pageCount } : await lookupGermanEdition(row.title, row.author);
    if (!metadata) {
      results.push({ id: row.id, title: row.title, status: "error", reason: "Keine verifizierte deutschsprachige Ausgabe gefunden" });
      continue;
    }
    if (edition) {
      metadata.isbn = edition.isbn;
      metadata.pageCount = edition.pageCount;
      metadata.coverImageUrl = `https://covers.openlibrary.org/b/isbn/${edition.isbn}-L.jpg`;
    }
    const authorUsername = `autor-${slugify(row.author)}`;
    const now = new Date();
    const existingUser = await users.findOne({ username: authorUsername }, { projection: { username: 1 } });
    const existingBook = await books.findOne({
      $or: [
        { isbn: metadata.isbn },
        { title: { $regex: `^${escapeRegex(row.title)}$`, $options: "i" }, ownerUsername: authorUsername },
      ],
    }, { projection: { _id: 1, title: 1 } });
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
        publisher: "",
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
    markdown = replaceStatus(markdown, row, { isbn: metadata.isbn, status: existingBook ? "Bereits vorhanden" : "Eingebaut", assignee: "Codex / 15.11.2026", reference });
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
