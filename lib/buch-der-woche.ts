import { getDatabase, getUsersCollection } from "@/lib/mongodb";
import { ObjectId, type Collection } from "mongodb";
import { extractYouTubeId } from "@/lib/bucharena-types";
import { getLesezeichenCollection } from "@/lib/lesezeichen";

export type BdwSubmissionDocument = {
  _id?: ObjectId;
  username: string;
  authorDisplayName: string;
  title: string;
  author: string;
  speaker?: string;
  youtubeUrl: string;
  buyUrl?: string;
  bookId?: string;
  speakerUsername?: string;
  status: "active" | "selected" | "paused" | "withdrawn";
  timesSelected: number;
  lastSelectedAt?: Date;
  lastCycleKey?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type BdwHistoryEntry = {
  _id?: ObjectId;
  cycleKey: string;
  submissionId?: ObjectId;
  username: string;
  title: string;
  author: string;
  speaker?: string;
  youtubeUrl: string;
  buyUrl?: string;
  bookId?: string;
  authorBookmarksAtDraw: number;
  weightAtDraw: number;
  totalCandidates: number;
  drawnAt: Date;
  isAutomatic: boolean;
};

export type BuchDerWocheSettings = {
  title: string;
  author: string;
  speaker?: string;
  youtubeUrl: string;
  buyUrl?: string;
  active: boolean;
  updatedAt: string;
  bookId?: string;
  authorUsername?: string;
  speakerUsername?: string;
  cycleKey?: string;
  submissionId?: string;
  isAutomatic?: boolean;
  selectedAt?: string;
  selectionInfo?: {
    totalCandidates: number;
    authorBookmarks: number;
    totalWeight: number;
    candidateWeight: number;
  };
};

/* ── Collections ── */

export async function getBdwSubmissionsCollection(): Promise<Collection<BdwSubmissionDocument>> {
  const db = await getDatabase();
  return db.collection<BdwSubmissionDocument>("buch_der_woche_submissions");
}

export async function getBdwHistoryCollection(): Promise<Collection<BdwHistoryEntry>> {
  const db = await getDatabase();
  return db.collection<BdwHistoryEntry>("buch_der_woche_history");
}

/* ── Cycle Logic (Sonntag ab 18:00 Uhr Berlin-Zeit) ── */

export type CycleInfo = {
  currentCycleKey: string;
  cycleStartDateStr: string;
  nextDrawDateStr: string;
  formattedNextDraw: string;
};

/**
 * Ermittelt den aktuellen Zyklus und die nächste Auslosung.
 * Zyklus-Wechsel: Jeden Sonntag um 18:00:00 Uhr deutscher Zeit (Europe/Berlin).
 */
export function getBdwCycleInfo(refDate = new Date()): CycleInfo {
  // Teile für Europe/Berlin ermitteln
  const berlinFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const parts = berlinFmt.formatToParts(refDate);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;

  const weekday = map.weekday; // Sun, Mon, Tue, Wed, Thu, Fri, Sat
  const hour = parseInt(map.hour === "24" ? "0" : map.hour, 10);
  const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);

  // Wie viele Tage liegt der letzte Sonntag 18 Uhr zurück?
  let daysAgo: number;
  if (dayIndex === 0) {
    // Es ist Sonntag
    daysAgo = hour >= 18 ? 0 : 7;
  } else {
    // Mo = 1, Di = 2, ..., Sa = 6
    daysAgo = dayIndex;
  }

  // Datum des Start-Sonntags ermitteln (mittags 12:00 UTC zum Verhindern von DST-Verschiebungen)
  const cycleStartDate = new Date(refDate.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const startFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(cycleStartDate);
  const currentCycleKey = `cycle-${startFmt}`;

  // Wann ist die nächste Ziehung (nächster Sonntag 18:00)?
  let daysUntilNext: number;
  if (dayIndex === 0 && hour < 18) {
    daysUntilNext = 0; // Heute um 18 Uhr!
  } else {
    daysUntilNext = 7 - (dayIndex === 0 ? 0 : dayIndex);
  }

  const nextDrawDate = new Date(refDate.getTime() + daysUntilNext * 24 * 60 * 60 * 1000);
  const nextDrawFmt = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(nextDrawDate);

  const formattedNextDraw = `${nextDrawFmt} ab 18:00 Uhr`;

  return {
    currentCycleKey,
    cycleStartDateStr: startFmt,
    nextDrawDateStr: new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(nextDrawDate),
    formattedNextDraw,
  };
}

/* ── Gewichtungs-Berechnung ── */

/**
 * Berechnet das Gewicht (die Ziehungs-Tickets) für eine Bewerbung.
 * - Mehr Lesezeichen = höhere Gewinnchance (Basis: 10 + Lesezeichen-Punkte)
 * - Bereits ausgewählt gewesen = verringerte Gewinnchance (Penalty nach Häufigkeit und Aktualität)
 */
export function calculateBdwWeight(
  bookmarks: number,
  timesSelected: number = 0,
  lastSelectedAt?: Date | string | null
): { weight: number; baseWeight: number; penaltyMultiplier: number } {
  const safeBookmarks = Math.max(0, bookmarks || 0);
  const baseWeight = 10 + safeBookmarks;

  let penaltyMultiplier = 1.0;

  if (timesSelected > 0) {
    // 1x gewonnen: / 5 (0.2), 2x: / 10 (0.1), 3x: / 15 (0.067)
    penaltyMultiplier = 1 / (timesSelected * 5);

    // Wenn innerhalb der letzten 4 Wochen bereits dran gewesen: zusätzliche Abkühlphase
    if (lastSelectedAt) {
      const lastDate = new Date(lastSelectedAt);
      const daysSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 28) {
        penaltyMultiplier *= 0.5;
      }
    }
  }

  const calculated = Math.max(0.1, Math.round(baseWeight * penaltyMultiplier * 10) / 10);
  return {
    weight: calculated,
    baseWeight,
    penaltyMultiplier,
  };
}

/* ── Auslosung durchführen ── */

let isSelectingLock = false;

export async function runBuchDerWocheSelection(options?: {
  force?: boolean;
  manualWinnerId?: string;
  adminUsername?: string;
}): Promise<{
  success: boolean;
  message: string;
  selected?: BuchDerWocheSettings;
}> {
  if (isSelectingLock) {
    return { success: false, message: "Auslosung läuft bereits." };
  }
  isSelectingLock = true;

  try {
    const db = await getDatabase();
    const cycleInfo = getBdwCycleInfo();
    const subsCol = await getBdwSubmissionsCollection();
    const lzCol = await getLesezeichenCollection();

    // Alle aktiven Bewerbungen abrufen
    const activeSubmissions = await subsCol.find({
      status: { $ne: "withdrawn" },
    }).toArray();

    if (activeSubmissions.length === 0) {
      return { success: false, message: "Keine Bewerbungen vorhanden." };
    }

    // Für jede Bewerbung die aktuellen Lesezeichen des Autors laden
    const usernames = [...new Set(activeSubmissions.map((s) => s.username))];
    const lzDocs = await lzCol.find({ username: { $in: usernames } }).toArray();
    const lzMap = new Map<string, number>();
    for (const doc of lzDocs) {
      lzMap.set(doc.username, doc.total ?? 0);
    }

    // Kandidaten mit Gewichten vorbereiten
    type Candidate = {
      sub: BdwSubmissionDocument;
      bookmarks: number;
      weight: number;
    };

    const candidates: Candidate[] = activeSubmissions.map((sub) => {
      const bkm = lzMap.get(sub.username) ?? 0;
      const { weight } = calculateBdwWeight(bkm, sub.timesSelected, sub.lastSelectedAt);
      return { sub, bookmarks: bkm, weight };
    });

    let chosenCandidate: Candidate;

    if (options?.manualWinnerId) {
      const found = candidates.find((c) => String(c.sub._id) === options.manualWinnerId);
      if (!found) {
        return { success: false, message: "Ausgewähltes Buch nicht gefunden." };
      }
      chosenCandidate = found;
    } else {
      // Gewichtete Zufallsauswahl (Lotterie)
      const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
      let rand = Math.random() * totalWeight;
      chosenCandidate = candidates[0];

      for (const cand of candidates) {
        if (rand < cand.weight) {
          chosenCandidate = cand;
          break;
        }
        rand -= cand.weight;
      }
    }

    const winner = chosenCandidate.sub;
    const now = new Date();

    // Buch der Woche Einstellungen aufbauen
    const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
    const bdwSetting: BuchDerWocheSettings = {
      title: winner.title,
      author: winner.author,
      speaker: winner.speaker || "",
      youtubeUrl: winner.youtubeUrl,
      buyUrl: winner.buyUrl || "",
      active: true,
      updatedAt: now.toISOString(),
      bookId: winner.bookId || undefined,
      authorUsername: winner.username,
      speakerUsername: winner.speakerUsername || undefined,
      cycleKey: cycleInfo.currentCycleKey,
      submissionId: String(winner._id),
      isAutomatic: !options?.manualWinnerId,
      selectedAt: now.toISOString(),
      selectionInfo: {
        totalCandidates: candidates.length,
        authorBookmarks: chosenCandidate.bookmarks,
        totalWeight: Math.round(totalWeight * 10) / 10,
        candidateWeight: chosenCandidate.weight,
      },
    };

    // In settings aktualisieren
    await db.collection("settings").updateOne(
      { key: "buchDerWoche" },
      { $set: { key: "buchDerWoche", value: bdwSetting } },
      { upsert: true }
    );

    // Bewerbung aktualisieren (timesSelected hochzählen, lastSelectedAt setzen)
    if (winner._id) {
      await subsCol.updateOne(
        { _id: winner._id },
        {
          $inc: { timesSelected: 1 },
          $set: {
            lastSelectedAt: now,
            lastCycleKey: cycleInfo.currentCycleKey,
            status: "selected",
            updatedAt: now,
          },
        }
      );
    }

    // Historie speichern
    const histCol = await getBdwHistoryCollection();
    await histCol.insertOne({
      cycleKey: cycleInfo.currentCycleKey,
      submissionId: winner._id,
      username: winner.username,
      title: winner.title,
      author: winner.author,
      speaker: winner.speaker,
      youtubeUrl: winner.youtubeUrl,
      buyUrl: winner.buyUrl,
      bookId: winner.bookId,
      authorBookmarksAtDraw: chosenCandidate.bookmarks,
      weightAtDraw: chosenCandidate.weight,
      totalCandidates: candidates.length,
      drawnAt: now,
      isAutomatic: !options?.manualWinnerId,
    });

    // In-App-Benachrichtigung an den Autor senden
    try {
      const msgCol = await db.collection("messages");
      await msgCol.insertOne({
        senderUsername: "BuchArena",
        recipientUsername: winner.username,
        subject: "🎉 Dein Buch wurde als 'Buch der Woche' ausgewählt!",
        body: `Herzlichen Glückwunsch, ${winner.authorDisplayName || winner.author}!\n\nDein eingereichtes Buch **„${winner.title}“** wurde vom System für den aktuellen Wochenzyklus (${cycleInfo.cycleStartDateStr}) als **Buch der Woche** ausgewählt!\n\nEs wird ab sofort auf der Startseite und auf dem Dashboard aller angemeldeten Mitglieder prominent mit Video präsentiert.\n\nVielen Dank für deine Aktivität in der BuchArena!`,
        read: false,
        deletedBySender: false,
        deletedByRecipient: false,
        createdAt: now,
      });
    } catch (msgErr) {
      console.warn("Konnte Gewinn-Nachricht nicht an Autor zustellen:", msgErr);
    }

    return {
      success: true,
      message: `"${winner.title}" wurde als Buch der Woche ausgewählt!`,
      selected: bdwSetting,
    };
  } finally {
    isSelectingLock = false;
  }
}

/**
 * Prüft automatisch, ob für den aktuellen Sonntag-18-Uhr-Zyklus bereits
 * eine Ziehung stattgefunden hat. Falls nicht, wird automatisch eine durchgeführt!
 */
export async function ensureBuchDerWocheSelection(): Promise<BuchDerWocheSettings | null> {
  try {
    const db = await getDatabase();
    const cycleInfo = getBdwCycleInfo();
    const doc = await db.collection("settings").findOne({ key: "buchDerWoche" });

    const currentBdw = doc?.value as BuchDerWocheSettings | undefined;

    // Wenn für diesen Zyklus bereits ein Buch der Woche gewählt wurde, dieses zurückgeben
    if (currentBdw && currentBdw.cycleKey === cycleInfo.currentCycleKey) {
      return currentBdw;
    }

    // Neuer Zyklus hat begonnen oder noch kein Zyklus gesetzt: Prüfen ob Bewerbungen vorliegen
    const subsCol = await getBdwSubmissionsCollection();
    const count = await subsCol.countDocuments({ status: { $ne: "withdrawn" } });

    if (count > 0) {
      const result = await runBuchDerWocheSelection();
      if (result.success && result.selected) {
        return result.selected;
      }
    }

    // Falls keine Bewerbungen existieren, behalten wir die bestehende Einstellung (falls vorhanden)
    return currentBdw ?? null;
  } catch (err) {
    console.error("Fehler bei ensureBuchDerWocheSelection:", err);
    return null;
  }
}
