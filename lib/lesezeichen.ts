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
  /** Termine pro Tag: key = YYYY-MM-DD, value = Anzahl */
  termineHeute: Record<string, number>;
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
    termineHeute: {},
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
export async function awardProfilAusgefuellt(username: string): Promise<number> {
  const col = await getLesezeichenCollection();
  // Atomar: Nur vergeben wenn noch kein profil_ausgefuellt-Eintrag existiert
  const result = await col.updateOne(
    { username, "entries.reason": { $ne: "profil_ausgefuellt" } },
    {
      $inc: { total: 10 },
      $push: { entries: { reason: "profil_ausgefuellt" as const, amount: 10, date: new Date() } },
      $set: { updatedAt: new Date() },
    },
  );
  if (result.matchedCount === 0) {
    // Entweder schon vergeben, oder Dokument existiert noch nicht
    await getOrCreateDoc(username);
    // Nochmal versuchen falls Dokument gerade erst erstellt wurde
    const retry = await col.updateOne(
      { username, "entries.reason": { $ne: "profil_ausgefuellt" } },
      {
        $inc: { total: 10 },
        $push: { entries: { reason: "profil_ausgefuellt" as const, amount: 10, date: new Date() } },
        $set: { updatedAt: new Date() },
      },
    );
    return retry.modifiedCount > 0 ? 10 : 0;
  }
  return result.modifiedCount > 0 ? 10 : 0;
}

/** Buch hochgeladen: 3 Lesezeichen pro Buch */
export async function awardBuecherHochgeladen(username: string): Promise<number> {
  await addLesezeichen(username, "buecher_hochgeladen", 3);
  return 3;
}

/** Täglicher Login: 1 Lesezeichen + evtl. 7 Streak-Bonus */
export async function awardTagesLogin(username: string): Promise<number> {
  const today = todayKey();
  const col = await getLesezeichenCollection();
  await getOrCreateDoc(username);

  // Atomar: Tag nur hinzufügen wenn noch nicht vorhanden
  const result = await col.updateOne(
    { username, loginDays: { $ne: today } },
    {
      $addToSet: { loginDays: today },
      $set: { updatedAt: new Date() },
    },
  );
  if (result.modifiedCount === 0) return 0; // Bereits eingeloggt heute

  // +1 für täglichen Login
  await addLesezeichen(username, "tages_login", 1);
  let awarded = 1;

  // Streak prüfen
  const doc = await col.findOne({ username });
  if (doc) {
    const streak = getConsecutiveDays(doc.loginDays);
    if (streak > 0 && streak % 7 === 0) {
      await addLesezeichen(username, "wochen_streak", 7);
      awarded += 7;
    }
  }
  return awarded;
}

/** Treffpunkt-Beitrag: 1 Lesezeichen pro Beitrag */
export async function awardTreffpunktBeitrag(username: string): Promise<number> {
  const today = todayKey();
  const col = await getLesezeichenCollection();
  await col.updateOne(
    { username },
    {
      $addToSet: { treffpunktDays: today },
      $set: { updatedAt: new Date() },
    },
    { upsert: true },
  );
  await addLesezeichen(username, "treffpunkt_beitrag", 1);
  return 1;
}

/** Abstimmung: 1 Lesezeichen pro Abstimmung */
export async function awardAbstimmung(username: string): Promise<number> {
  await addLesezeichen(username, "abstimmung", 1);
  return 1;
}

/** Quiz gespielt: 1 Lesezeichen pro Tag */
export async function awardQuizTag(username: string): Promise<number> {
  const today = todayKey();
  const col = await getLesezeichenCollection();
  await getOrCreateDoc(username);

  // Atomar: Tag nur hinzufügen wenn noch nicht vorhanden
  const result = await col.updateOne(
    { username, quizDays: { $ne: today } },
    {
      $addToSet: { quizDays: today },
      $set: { updatedAt: new Date() },
    },
  );
  if (result.modifiedCount === 0) return 0;

  await addLesezeichen(username, "quiz_tag", 1);
  return 1;
}

/** MC-Quiz 10+ Punkte: 1 Lesezeichen (pro Spiel) */
export async function awardMcQuiz10Punkte(username: string): Promise<number> {
  await addLesezeichen(username, "mc_quiz_10_punkte", 1);
  return 1;
}

/** Buchempfehlung: +1 Lesezeichen, max. 3 pro Tag */
export async function awardBuchempfehlung(username: string): Promise<boolean> {
  const today = todayKey();
  const col = await getLesezeichenCollection();
  await getOrCreateDoc(username);

  // Atomar: Zähler nur erhöhen wenn < 3
  const result = await col.updateOne(
    { username, [`empfehlungenHeute.${today}`]: { $lt: 3 } },
    {
      $inc: { [`empfehlungenHeute.${today}`]: 1 },
      $set: { updatedAt: new Date() },
    },
  );

  // Falls kein Match (noch kein Key oder >= 3), prüfen ob Key fehlt
  if (result.modifiedCount === 0) {
    const setResult = await col.updateOne(
      { username, [`empfehlungenHeute.${today}`]: { $exists: false } },
      {
        $set: { [`empfehlungenHeute.${today}`]: 1, updatedAt: new Date() },
      },
    );
    if (setResult.modifiedCount === 0) return false; // Tageslimit erreicht
  }

  await addLesezeichen(username, "buchempfehlung", 1);
  return true;
}

/** Buchempfehlung erhalten: +1 Lesezeichen für Buchbesitzer (ohne Tageslimit) */
export async function awardBuchempfehlungErhalten(username: string): Promise<number> {
  await addLesezeichen(username, "buchempfehlung_erhalten", 1);
  return 1;
}

/** Termin erstellt: +1 Lesezeichen, max. 5 pro Tag */
export async function awardTerminErstellt(username: string): Promise<boolean> {
  const today = todayKey();
  const col = await getLesezeichenCollection();
  await getOrCreateDoc(username);

  // Atomar: Zähler nur erhöhen wenn < 5
  const result = await col.updateOne(
    { username, [`termineHeute.${today}`]: { $lt: 5 } },
    {
      $inc: { [`termineHeute.${today}`]: 1 },
      $set: { updatedAt: new Date() },
    },
  );

  // Falls kein Match (noch kein Key oder >= 5), prüfen ob Key fehlt
  if (result.modifiedCount === 0) {
    const setResult = await col.updateOne(
      { username, [`termineHeute.${today}`]: { $exists: false } },
      {
        $set: { [`termineHeute.${today}`]: 1, updatedAt: new Date() },
      },
    );
    if (setResult.modifiedCount === 0) return false; // Tageslimit erreicht
  }

  await addLesezeichen(username, "termin_erstellt", 1);
  return true;
}

/** Termin gelöscht: −1 Lesezeichen zurücknehmen */
export async function removeTerminErstellt(username: string): Promise<void> {
  const col = await getLesezeichenCollection();
  await col.updateOne(
    { username, total: { $gte: 1 } },
    {
      $inc: { total: -1 },
      $push: { entries: { reason: "termin_erstellt" as const, amount: -1, date: new Date() } },
      $set: { updatedAt: new Date() },
    },
  );
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
      { projection: { username: 1, profile: 1, speakerProfile: 1, bloggerProfile: 1, displayName: 1 } },
    )
    .toArray();

  const nameMap = new Map<string, string>();
  for (const u of userDocs) {
    const name =
      u.displayName ||
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
