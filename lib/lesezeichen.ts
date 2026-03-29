import { getDatabase, getUsersCollection } from "@/lib/mongodb";
import type { Collection } from "mongodb";
import type { LesezeichenReason } from "@/lib/lesezeichen-rules";

export type { LesezeichenReason } from "@/lib/lesezeichen-rules";
export { LESEZEICHEN_RULES } from "@/lib/lesezeichen-rules";

export type LesezeichenEntry = {
  reason: LesezeichenReason;
  amount: number;
  date: Date;
};

export type LesezeichenDocument = {
  username: string;
  total: number;
  entries: LesezeichenEntry[];
  /** Tage, an denen der User eingeloggt war (YYYY-MM-DD) */
  loginDays: string[];
  /** Tage, an denen der User Quiz gespielt hat (YYYY-MM-DD) */
  quizDays: string[];
  /** Tage, an denen der User im Treffpunkt geschrieben hat (YYYY-MM-DD) */
  treffpunktDays: string[];
  /** Empfehlungen pro Tag: key = YYYY-MM-DD, value = Anzahl */
  empfehlungenHeute: Record<string, number>;
  /** Nicht in der Highscore-Rangliste anzeigen */
  hideFromHighscores?: boolean;
  updatedAt: Date;
};

/* ── Helpers ── */

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getConsecutiveDays(days: string[]): number {
  if (days.length === 0) return 0;
  const sorted = [...days].sort().reverse();
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (Math.round(diff) === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export async function getLesezeichenCollection(): Promise<
  Collection<LesezeichenDocument>
> {
  const db = await getDatabase();
  return db.collection<LesezeichenDocument>("lesezeichen");
}

export async function getOrCreateDoc(
  username: string,
): Promise<LesezeichenDocument> {
  const col = await getLesezeichenCollection();
  const doc = await col.findOne({ username });
  if (doc) return doc;

  const newDoc: LesezeichenDocument = {
    username,
    total: 0,
    entries: [],
    loginDays: [],
    quizDays: [],
    treffpunktDays: [],
    empfehlungenHeute: {},
    updatedAt: new Date(),
  };
  await col.insertOne(newDoc);
  return newDoc;
}

async function addLesezeichen(
  username: string,
  reason: LesezeichenReason,
  amount: number,
) {
  const col = await getLesezeichenCollection();
  await col.updateOne(
    { username },
    {
      $inc: { total: amount },
      $push: { entries: { reason, amount, date: new Date() } },
      $set: { updatedAt: new Date() },
    },
    { upsert: true },
  );
}

/* ── Award-Funktionen ── */

/** Profil ausgefüllt: 10 Lesezeichen (einmalig) */
export async function awardProfilAusgefuellt(username: string) {
  const doc = await getOrCreateDoc(username);
  const already = doc.entries.some((e) => e.reason === "profil_ausgefuellt");
  if (already) return;
  await addLesezeichen(username, "profil_ausgefuellt", 10);
}

/** Buch hochgeladen: 3 Lesezeichen pro Buch */
export async function awardBuecherHochgeladen(username: string) {
  await addLesezeichen(username, "buecher_hochgeladen", 3);
}

/** Täglicher Login: 1 Lesezeichen + evtl. 7 Streak-Bonus */
export async function awardTagesLogin(username: string) {
  const today = todayKey();
  const col = await getLesezeichenCollection();
  const doc = await getOrCreateDoc(username);

  if (doc.loginDays.includes(today)) return;

  // Tag hinzufügen
  const updatedDays = [...doc.loginDays, today];
  await col.updateOne(
    { username },
    {
      $addToSet: { loginDays: today },
      $set: { updatedAt: new Date() },
    },
  );

  // +1 für täglichen Login
  await addLesezeichen(username, "tages_login", 1);

  // Streak prüfen
  const streak = getConsecutiveDays(updatedDays);
  if (streak > 0 && streak % 7 === 0) {
    await addLesezeichen(username, "wochen_streak", 7);
  }
}

/** Treffpunkt-Beitrag: 1 Lesezeichen pro Beitrag */
export async function awardTreffpunktBeitrag(username: string) {
  await addLesezeichen(username, "treffpunkt_beitrag", 1);
}

/** Abstimmung: 1 Lesezeichen pro Abstimmung */
export async function awardAbstimmung(username: string) {
  await addLesezeichen(username, "abstimmung", 1);
}

/** Quiz gespielt: 1 Lesezeichen pro Tag */
export async function awardQuizTag(username: string) {
  const today = todayKey();
  const doc = await getOrCreateDoc(username);

  if (doc.quizDays.includes(today)) return;

  const col = await getLesezeichenCollection();
  await col.updateOne(
    { username },
    {
      $addToSet: { quizDays: today },
      $set: { updatedAt: new Date() },
    },
  );
  await addLesezeichen(username, "quiz_tag", 1);
}

/** MC-Quiz 10+ Punkte: 1 Lesezeichen (pro Spiel) */
export async function awardMcQuiz10Punkte(username: string) {
  await addLesezeichen(username, "mc_quiz_10_punkte", 1);
}

/** Buchempfehlung: +1 Lesezeichen, max. 3 pro Tag */
export async function awardBuchempfehlung(username: string): Promise<boolean> {
  const today = todayKey();
  const doc = await getOrCreateDoc(username);
  const todayCount = doc.empfehlungenHeute?.[today] ?? 0;
  if (todayCount >= 3) return false;

  const col = await getLesezeichenCollection();
  await col.updateOne(
    { username },
    {
      $set: { [`empfehlungenHeute.${today}`]: todayCount + 1, updatedAt: new Date() },
    },
  );
  await addLesezeichen(username, "buchempfehlung", 1);
  return true;
}

/** Buchempfehlung erhalten: +1 Lesezeichen für Buchbesitzer (ohne Tageslimit) */
export async function awardBuchempfehlungErhalten(username: string) {
  await addLesezeichen(username, "buchempfehlung", 1);
}

/* ── Abfragen ── */

/** Lesezeichen-Stand eines Users */
export async function getLesezeichenTotal(username: string): Promise<number> {
  const doc = await getOrCreateDoc(username);
  return doc.total;
}

/** Top-Highscores mit Anzeigename */
export async function getLesezeichenHighscores(
  limit = 20,
): Promise<{ username: string; displayName: string; total: number }[]> {
  const col = await getLesezeichenCollection();
  const rows = await col
    .find(
      { hideFromHighscores: { $ne: true } },
      { projection: { username: 1, total: 1, _id: 0 } },
    )
    .sort({ total: -1 })
    .limit(limit)
    .toArray();

  if (rows.length === 0) return [];

  const users = await getUsersCollection();
  const userDocs = await users
    .find(
      { username: { $in: rows.map((r) => r.username) } },
      { projection: { username: 1, profile: 1, speakerProfile: 1, bloggerProfile: 1 } },
    )
    .toArray();

  const nameMap = new Map<string, string>();
  for (const u of userDocs) {
    const name =
      u.profile?.name?.value ||
      u.speakerProfile?.name?.value ||
      u.bloggerProfile?.name?.value ||
      u.username;
    nameMap.set(u.username, name);
  }

  return rows.map((r) => ({
    username: r.username,
    displayName: nameMap.get(r.username) ?? r.username,
    total: r.total,
  }));
}
