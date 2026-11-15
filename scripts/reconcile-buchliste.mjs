import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import { readFileSync, writeFileSync } from "node:fs";

dotenv.config({ path: ".env.local" });

const normalize = (value = "") => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/ß/g, "ss").replace(/[^\p{L}\p{N}]/gu, "");
const candidates = [
  ["Romane und Gegenwart", "P2", "Elif Shafak", "Die vierzig Geheimnisse der Liebe"],
  ["Romane und Gegenwart", "P2", "Elif Shafak", "Die Insel der verlorenen Bäume"],
  ["Romane und Gegenwart", "P2", "Delia Owens", "Der Gesang der Flusskrebse – Das Kochbuch"],
  ["Romane und Gegenwart", "P2", "Mariana Leky", "Was man von hier aus sehen kann"],
  ["Romane und Gegenwart", "P2", "Mariana Leky", "Kummer aller Art"],
  ["Romane und Gegenwart", "P2", "Hanya Yanagihara", "Zum Paradies"],
  ["Romane und Gegenwart", "P2", "Meg Wolitzer", "Die Interessanten"],
  ["Romane und Gegenwart", "P2", "Eleanor Catton", "Die Gestirne"],
  ["Romane und Gegenwart", "P2", "Mieko Kawakami", "Brüste und Eier"],
  ["Romane und Gegenwart", "P2", "Mieko Kawakami", "Himmel"],
  ["Romane und Gegenwart", "P2", "Bora Chung", "Der Fluch des Hasen"],
  ["Romane und Gegenwart", "P2", "Han Kang", "Die Vegetarierin"],
  ["Romane und Gegenwart", "P2", "Annie Ernaux", "Die Jahre"],
  ["Romane und Gegenwart", "P2", "Jhumpa Lahiri", "Der Namensvetter"],
  ["Romane und Gegenwart", "P2", "Ocean Vuong", "Auf Erden sind wir kurz grandios"],
  ["Romane und Gegenwart", "P2", "Sigrid Nunez", "Der Freund"],
  ["Romane und Gegenwart", "P2", "Rachel Cusk", "Outline"],
  ["Romane und Gegenwart", "P2", "Jon Fosse", "Morgen und Abend"],
  ["Romane und Gegenwart", "P2", "Herta Müller", "Atemschaukel"],
  ["Romane und Gegenwart", "P2", "Saša Stanišić", "Herkunft"],
  ["Krimi und Thriller", "P2", "Robert Galbraith", "Der Ruf des Kuckucks"],
  ["Krimi und Thriller", "P2", "Robert Galbraith", "Der Seidenspinner"],
  ["Krimi und Thriller", "P2", "Robert Galbraith", "Die Ernte des Bösen"],
  ["Krimi und Thriller", "P2", "Karin Slaughter", "Die gute Tochter"],
  ["Krimi und Thriller", "P2", "Karin Slaughter", "Ein Teil von ihr"],
  ["Krimi und Thriller", "P2", "Don Winslow", "Tage der Toten"],
  ["Krimi und Thriller", "P2", "Don Winslow", "Das Kartell"],
  ["Krimi und Thriller", "P2", "Dennis Lehane", "Mystic River"],
  ["Krimi und Thriller", "P2", "Dennis Lehane", "Shutter Island"],
  ["Krimi und Thriller", "P2", "Tana French", "Grabesgrün"],
  ["Krimi und Thriller", "P2", "Tana French", "Totengleich"],
  ["Krimi und Thriller", "P2", "Jean-Christophe Grangé", "Die purpurnen Flüsse"],
  ["Krimi und Thriller", "P2", "Pierre Lemaitre", "Wir sehen uns dort oben"],
  ["Krimi und Thriller", "P2", "Nicci French", "Der achte Tag"],
  ["Krimi und Thriller", "P2", "Val McDermid", "Das Lied der Sirenen"],
  ["Krimi und Thriller", "P2", "Kathy Reichs", "Tote lügen nicht"],
  ["Krimi und Thriller", "P2", "Jeffery Deaver", "Der Knochenjäger"],
  ["Krimi und Thriller", "P2", "Stuart MacBride", "Die dunklen Wasser von Aberdeen"],
  ["Krimi und Thriller", "P2", "Andreas Gruber", "Todesfrist"],
  ["Krimi und Thriller", "P2", "Andreas Gruber", "Todesurteil"],
  ["Fantasy und Science-Fiction", "P2", "N. K. Jemisin", "Die fünfte Jahreszeit"],
  ["Fantasy und Science-Fiction", "P2", "N. K. Jemisin", "Das Tor der Welt"],
  ["Fantasy und Science-Fiction", "P2", "Ann Leckie", "Die Maschinen"],
  ["Fantasy und Science-Fiction", "P2", "Martha Wells", "Künstliche Verhältnisse"],
  ["Fantasy und Science-Fiction", "P2", "John Scalzi", "Krieg der Klone"],
  ["Fantasy und Science-Fiction", "P2", "John Scalzi", "Der wilde Planet"],
  ["Fantasy und Science-Fiction", "P2", "Neal Stephenson", "Snow Crash"],
  ["Fantasy und Science-Fiction", "P2", "William Gibson", "Neuromancer"],
  ["Fantasy und Science-Fiction", "P2", "Octavia E. Butler", "Die Parabel vom Sämann"],
  ["Fantasy und Science-Fiction", "P2", "Ted Chiang", "Die große Stille"],
  ["Fantasy und Science-Fiction", "P2", "Andy Weir", "Projekt Hail Mary"],
  ["Fantasy und Science-Fiction", "P2", "Maja Lunde", "Die Geschichte des Wassers"],
  ["Fantasy und Science-Fiction", "P2", "Kai Meyer", "Die Seiten der Welt"],
  ["Fantasy und Science-Fiction", "P2", "Kai Meyer", "Frostfeuer"],
  ["Fantasy und Science-Fiction", "P2", "Markus Heitz", "Die Zwerge"],
  ["Fantasy und Science-Fiction", "P2", "Markus Heitz", "Die Elfen"],
  ["Fantasy und Science-Fiction", "P2", "Bernhard Hennen", "Die Elfenkönigin"],
  ["Fantasy und Science-Fiction", "P2", "Christelle Dabos", "Die Verlobten des Winters"],
  ["Fantasy und Science-Fiction", "P2", "V. E. Schwab", "Vier Farben der Magie"],
  ["Fantasy und Science-Fiction", "P2", "Joe Abercrombie", "Kriegsklingen"],
  ["Klassiker und Weltliteratur", "P3", "Sophokles", "König Ödipus"],
  ["Klassiker und Weltliteratur", "P3", "Homer", "Ilias"],
  ["Klassiker und Weltliteratur", "P3", "Homer", "Odyssee"],
  ["Klassiker und Weltliteratur", "P3", "Dante Alighieri", "Die göttliche Komödie"],
  ["Klassiker und Weltliteratur", "P3", "Molière", "Der eingebildete Kranke"],
  ["Klassiker und Weltliteratur", "P3", "William Shakespeare", "Hamlet"],
  ["Klassiker und Weltliteratur", "P3", "William Shakespeare", "Romeo und Julia"],
  ["Klassiker und Weltliteratur", "P3", "William Shakespeare", "Macbeth"],
  ["Klassiker und Weltliteratur", "P3", "Johann Wolfgang von Goethe", "Faust. Der Tragödie erster Teil"],
  ["Klassiker und Weltliteratur", "P3", "Friedrich Schiller", "Die Räuber"],
  ["Klassiker und Weltliteratur", "P3", "Georg Büchner", "Woyzeck"],
  ["Klassiker und Weltliteratur", "P3", "Theodor Fontane", "Effi Briest"],
  ["Klassiker und Weltliteratur", "P3", "Heinrich Heine", "Deutschland. Ein Wintermärchen"],
  ["Klassiker und Weltliteratur", "P3", "Rainer Maria Rilke", "Duineser Elegien"],
  ["Klassiker und Weltliteratur", "P3", "Albert Camus", "Die Pest"],
  ["Klassiker und Weltliteratur", "P3", "Jean-Paul Sartre", "Der Ekel"],
  ["Klassiker und Weltliteratur", "P3", "George Eliot", "Middlemarch"],
  ["Klassiker und Weltliteratur", "P3", "Mary Shelley", "Der letzte Mensch"],
  ["Klassiker und Weltliteratur", "P3", "Oscar Wilde", "Das Bildnis des Dorian Gray"],
  ["Klassiker und Weltliteratur", "P3", "Joseph Conrad", "Herz der Finsternis"],
  ["Kinder und Jugend", "P2", "J. K. Rowling", "Harry Potter und das verwunschene Kind"],
  ["Kinder und Jugend", "P2", "Cornelia Funke", "Reckless – Steinernes Fleisch"],
  ["Kinder und Jugend", "P2", "Cornelia Funke", "Reckless – Lebendige Schatten"],
  ["Kinder und Jugend", "P2", "Cornelia Funke", "Drachenreiter – Die Feder eines Greifs"],
  ["Kinder und Jugend", "P2", "Rüdiger Bertram", "Coolman und ich"],
  ["Kinder und Jugend", "P2", "Kirsten Boie", "Paule ist ein Glücksgriff"],
  ["Kinder und Jugend", "P2", "Kirsten Boie", "Thabo – Detektiv und Gentleman"],
  ["Kinder und Jugend", "P2", "Nina Blazon", "Wolfszeit"],
  ["Kinder und Jugend", "P2", "Nina Blazon", "Faunblut"],
  ["Kinder und Jugend", "P2", "Ulf Stark", "Kannst du pfeifen, Johanna?"],
  ["Kinder und Jugend", "P2", "Jeff Kinney", "Gregs Tagebuch – Von Idioten umzingelt!"],
  ["Kinder und Jugend", "P2", "Dav Pilkey", "Dog Man"],
  ["Kinder und Jugend", "P2", "Julia Donaldson", "Der Grüffelo"],
  ["Kinder und Jugend", "P2", "Axel Scheffler", "Für Hund und Katz ist auch noch Platz"],
  ["Kinder und Jugend", "P2", "Oliver Jeffers", "Der Streik der Farben"],
  ["Kinder und Jugend", "P2", "Benji Davies", "Das längste Schnupfen der Welt"],
  ["Sachbuch und Biografie", "P2", "Mary Roach", "Darm mit Charme?"],
  ["Sachbuch und Biografie", "P2", "Yuval Noah Harari", "Sapiens – Eine kurze Geschichte der Menschheit"],
  ["Sachbuch und Biografie", "P2", "Tim Marshall", "Die Macht der Geographie"],
  ["Sachbuch und Biografie", "P2", "Philipp Blom", "Die Welt aus den Angeln"],
  ["Sachbuch und Biografie", "P2", "Jared Diamond", "Kollaps"],
  ["Sachbuch und Biografie", "P2", "Robert Sapolsky", "Warum Zebras keine Migräne bekommen"],
  ["Sachbuch und Biografie", "P2", "Oliver Sacks", "Der Mann, der seine Frau mit einem Hut verwechselte"],
  ["Sachbuch und Biografie", "P2", "David Attenborough", "Ein Leben auf unserer Erde"],
  ["Sachbuch und Biografie", "P2", "Jane Goodall", "Das Vermächtnis"],
  ["Sachbuch und Biografie", "P2", "Sally Ride", "Challenger"],
  ["Sachbuch und Biografie", "P2", "Stephen Fry", "Mythos"],
  ["Sachbuch und Biografie", "P2", "Robert Macfarlane", "Alte Wege"],
  ["Sachbuch und Biografie", "P2", "Rebecca Solnit", "Die Mutter aller Fragen"],
  ["Sachbuch und Biografie", "P2", "Erich Fromm", "Haben oder Sein"],
  ["Sachbuch und Biografie", "P2", "Hannah Arendt", "Eichmann in Jerusalem"],
];

const markdownPath = "BUCHLISTE.md";
let markdown = readFileSync(markdownPath, "utf8");
const rows = markdown.split(/\r?\n/).filter((line) => /^\| B\d{3} \|/.test(line));
const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI fehlt");
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
await client.connect();
try {
  const books = client.db(process.env.MONGODB_DB_NAME || "bucharena").collection("books");
  const liveBooks = await books.find({}, { projection: { title: 1, isbn: 1 } }).toArray();
  const liveTitles = new Set(liveBooks.map((book) => normalize(book.title)));
  const liveIsbns = new Set(liveBooks.map((book) => normalize(book.isbn)));
  const kept = [];
  const removed = [];
  for (const line of rows) {
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    const title = cells[2];
    const isbn = cells[5];
    if (liveTitles.has(normalize(title)) || (isbn !== "offen" && liveIsbns.has(normalize(isbn)))) removed.push({ id: cells[0], title });
    else kept.push(line);
  }
  const knownTitles = new Set([...kept.map((line) => normalize(line.split("|")[3])), ...liveTitles]);
  const added = [];
  let nextId = kept.length + removed.length + 1;
  for (const [area, priority, author, title] of candidates) {
    const key = normalize(title);
    if (knownTitles.has(key)) continue;
    knownTitles.add(key);
    const id = `B${String(nextId++).padStart(3, "0")}`;
    added.push(`| ${id} | ${priority} | ${title} | ${author} | ${area} | offen | Vorschlag | — | — |`);
  }
  const allRows = [...kept, ...added].map((line, index) => {
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    cells[0] = `B${String(index + 1).padStart(3, "0")}`;
    return `| ${cells.join(" | ")} |`;
  });
  const bodyStart = markdown.indexOf("## Geplante Bücher");
  const bodyEnd = markdown.indexOf("## Vorgehen pro Paket");
  const tableHeader = "| ID | Prio | Titel | Autor/in | Reihe / Schwerpunkt | ISBN-13 | Status | Zuständig / seit | Buch-ID/URL / geprüft am |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |";
  const planned = `## Geplante Bücher\n\nDie IDs werden nach jedem Live-Abgleich fortlaufend vergeben. ` +
    "`Bereits vorhanden`-Titel werden aus der offenen Liste entfernt; der Live-Bestand ist maßgeblich.\n\n" + tableHeader + "\n" + allRows.join("\n") + "\n\n";
  markdown = markdown.slice(0, bodyStart) + planned + markdown.slice(bodyEnd);
  const counts = new Map();
  for (const line of allRows) {
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    counts.set(cells[4], (counts.get(cells[4]) || 0) + 1);
  }
  const overview = `## Umfang und Navigation\n\n| Bereich | Offene Vorschläge |\n| --- | ---: |\n${[...counts.entries()].map(([area, count]) => `| ${area} | ${count} |`).join("\n")}\n| **Gesamt** | **${allRows.length}** |\n\nDie Zahlen beziehen sich ausschließlich auf noch nicht im Live-Bestand gefundene Vorschläge. Vor jedem Import erneut gegen MongoDB prüfen.\n\n`;
  const overviewStart = markdown.indexOf("## Umfang und Navigation");
  const prioritiesStart = markdown.indexOf("## Prioritäten und Status");
  markdown = markdown.slice(0, overviewStart) + overview + markdown.slice(prioritiesStart);
  markdown = markdown.replace(/\*\*\d+ konkrete Buchvorschläge\*\*/, `**${allRows.length} offene Buchvorschläge**`);
  writeFileSync(markdownPath, markdown, "utf8");
  console.log(JSON.stringify({ liveBooks: liveBooks.length, removed, added: added.length, remaining: allRows.length }, null, 2));
} finally {
  await client.close();
}
