/**
 * Einmalige Migration: Bestehende Diskussionen einem Thema zuordnen.
 *
 * Aufruf:  node migrate-discussion-topics.mjs
 *          (verwendet MONGODB_URI aus .env.local / .env)
 */

import { readFileSync } from "fs";
import { MongoClient } from "mongodb";

function loadEnv(path) {
  try {
    const lines = readFileSync(path, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch { /* Datei existiert nicht */ }
}
loadEnv(".env.local");
loadEnv(".env");

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI ist nicht gesetzt.");
  process.exit(1);
}

const TOPICS = [
  "Allgemein",
  "Autorentipps",
  "Schreibtipps",
  "Selfpublishing",
  "Buchmarketing",
  "Social Media & Werbung",
  "Buchcover",
  "Lektoren & Testleser",
  "Genre-Diskussion",
  "Veranstaltungen",
];

/**
 * Einfache Keyword-basierte Zuordnung.
 * Gibt das passendste Thema zurück oder "Allgemein".
 */
function classifyDiscussion(title, body) {
  const text = `${title} ${body}`.toLowerCase();

  const rules = [
    {
      topic: "Lektoren & Testleser",
      keywords: ["lektor", "testleser", "korrektur", "lektorat", "korrektorat", "beta-leser", "betaleser", "feedback geben", "manuskript lesen"],
    },
    {
      topic: "Buchcover",
      keywords: ["cover", "buchcover", "coverdesign", "covergestaltung", "umschlag", "titelgestaltung", "titelbild"],
    },
    {
      topic: "Social Media & Werbung",
      keywords: ["social media", "instagram", "tiktok", "facebook", "booktok", "bookstagram", "werbung", "ads", "marketing-kampagne", "reichweite", "follower"],
    },
    {
      topic: "Buchmarketing",
      keywords: ["marketing", "buchmarketing", "vermarktung", "verkauf", "verkäufe", "kindle unlimited", "ku-seiten", "amazon ads", "buchpromotion", "rezension", "rezensionsexemplar", "blog-tour", "blogtour", "promo"],
    },
    {
      topic: "Selfpublishing",
      keywords: ["selfpublishing", "self-publishing", "selfpub", "indie-autor", "indieautor", "self publish", "kdp", "kindle direct", "eigenverlag", "veröffentlich", "isbn", "epub", "ebook formatier"],
    },
    {
      topic: "Autorentipps",
      keywords: ["autorentipp", "autoren-tipp", "schreiballtag", "schreibroutine", "autorenleben", "schreibblockade", "motivation schreib", "zeitmanagement", "als autor"],
    },
    {
      topic: "Schreibtipps",
      keywords: ["schreibtipp", "schreib-tipp", "plot", "plotten", "plotentwicklung", "charakterentwicklung", "charakter", "protagonist", "antagonist", "worldbuilding", "world-building", "erzählperspektive", "perspektive", "dialog", "spannungsbogen", "show don't tell", "schreibstil", "stilmittel", "schreibhandwerk"],
    },
    {
      topic: "Genre-Diskussion",
      keywords: ["genre", "liebesroman", "fantasy", "thriller", "krimi", "science fiction", "sci-fi", "romance", "dark romance", "young adult", "new adult", "historisch", "horror", "sachbuch", "kinderbuch", "jugendbuch"],
    },
    {
      topic: "Veranstaltungen",
      keywords: ["buchmesse", "lesung", "lesungen", "event", "veranstaltung", "messe", "frankfurt", "leipzig", "signier", "convention", "workshop", "webinar", "autorenmesse", "autorentreffen"],
    },
  ];

  for (const rule of rules) {
    for (const kw of rule.keywords) {
      if (text.includes(kw)) {
        return rule.topic;
      }
    }
  }

  return "Allgemein";
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const dbName = process.env.MONGODB_DB_NAME ?? "bucharena";
  const db = client.db(dbName);
  const col = db.collection("discussions");

  const docs = await col.find({}).project({ _id: 1, title: 1, body: 1, topic: 1 }).toArray();

  console.log(`\n${docs.length} Diskussionen gefunden.\n`);

  const updates = [];

  for (const doc of docs) {
    const currentTopic = doc.topic || null;
    const newTopic = classifyDiscussion(doc.title, doc.body);

    const titleShort = doc.title.length > 60 ? doc.title.slice(0, 57) + "..." : doc.title;

    if (currentTopic && currentTopic !== "Allgemein") {
      console.log(`  SKIP  "${titleShort}"  →  bereits: ${currentTopic}`);
      continue;
    }

    console.log(`  ${newTopic.padEnd(24)} ←  "${titleShort}"`);
    updates.push({ id: doc._id, topic: newTopic });
  }

  if (updates.length === 0) {
    console.log("\nKeine Updates nötig.");
    await client.close();
    return;
  }

  console.log(`\n→ ${updates.length} Diskussionen werden aktualisiert …`);

  for (const u of updates) {
    await col.updateOne({ _id: u.id }, { $set: { topic: u.topic } });
  }

  console.log("✓ Fertig.\n");
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
