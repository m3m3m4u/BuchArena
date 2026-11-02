import { getDatabase } from "@/lib/mongodb";
import { type Collection } from "mongodb";
import { getLesezeichenCollection } from "@/lib/lesezeichen";
import type {
  BdwSubmissionDocument,
  BdwHistoryEntry,
  BuchDerWocheSettings,
  CycleInfo,
} from "@/lib/buch-der-woche-types";
import { getBdwCycleInfo, calculateBdwWeight } from "@/lib/buch-der-woche-cycle";

export type {
  BdwSubmissionDocument,
  BdwHistoryEntry,
  BuchDerWocheSettings,
  CycleInfo,
};
export { getBdwCycleInfo, calculateBdwWeight };

/* ── Collections ── */

export async function getBdwSubmissionsCollection(): Promise<Collection<BdwSubmissionDocument>> {
  const db = await getDatabase();
  return db.collection<BdwSubmissionDocument>("buch_der_woche_submissions");
}

export async function getBdwHistoryCollection(): Promise<Collection<BdwHistoryEntry>> {
  const db = await getDatabase();
  return db.collection<BdwHistoryEntry>("buch_der_woche_history");
}

/* ── Auslosung durchführen (Option B: Autorenweite Bremse) ── */

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
    return { success: false, message: "Auslosung laeuft bereits." };
  }
  isSelectingLock = true;

  try {
    const db = await getDatabase();
    const cycleInfo = getBdwCycleInfo();
    const subsCol = await getBdwSubmissionsCollection();
    const lzCol = await getLesezeichenCollection();

    const activeSubmissions = await subsCol.find({
      status: { $ne: "withdrawn" },
    }).toArray();

    if (activeSubmissions.length === 0) {
      return { success: false, message: "Keine Bewerbungen vorhanden." };
    }

    const usernames = [...new Set(activeSubmissions.map((s) => s.username))];
    const lzDocs = await lzCol.find({ username: { $in: usernames } }).toArray();
    const lzMap = new Map<string, number>();
    for (const doc of lzDocs) {
      lzMap.set(doc.username, doc.total ?? 0);
    }

    // Autorenweite Statistik (Option B): Wie oft hat der gesamte Autor bisher gewonnen und wann zuletzt?
    const authorStatsMap = new Map<string, { timesWon: number; lastSelectedAt?: Date }>();
    for (const s of activeSubmissions) {
      const existing = authorStatsMap.get(s.username) || { timesWon: 0, lastSelectedAt: undefined };
      existing.timesWon += (s.timesSelected || 0);
      if (s.lastSelectedAt) {
        const sDate = new Date(s.lastSelectedAt);
        if (!existing.lastSelectedAt || sDate > existing.lastSelectedAt) {
          existing.lastSelectedAt = sDate;
        }
      }
      authorStatsMap.set(s.username, existing);
    }

    type Candidate = {
      sub: BdwSubmissionDocument;
      bookmarks: number;
      weight: number;
    };

    const candidates: Candidate[] = activeSubmissions.map((sub) => {
      const bkm = lzMap.get(sub.username) ?? 0;
      const aStat = authorStatsMap.get(sub.username) || { timesWon: 0 };
      const { weight } = calculateBdwWeight(bkm, aStat.timesWon, aStat.lastSelectedAt);
      return { sub, bookmarks: bkm, weight };
    });

    let chosenCandidate: Candidate;

    if (options?.manualWinnerId) {
      const found = candidates.find((c) => String(c.sub._id) === options.manualWinnerId);
      if (!found) {
        return { success: false, message: "Ausgewaehltes Buch nicht gefunden." };
      }
      chosenCandidate = found;
    } else {
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

    await db.collection("settings").updateOne(
      { key: "buchDerWoche" },
      { $set: { key: "buchDerWoche", value: bdwSetting } },
      { upsert: true }
    );

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

    try {
      const msgCol = await db.collection("messages");
      await msgCol.insertOne({
        senderUsername: "BuchArena",
        recipientUsername: winner.username,
        subject: "Dein Buch wurde als Buch der Woche ausgewaehlt!",
        body: `Hallo ${winner.authorDisplayName || winner.author},\n\ndein eingereichtes Buch „${winner.title}“ wurde vom System fuer den aktuellen Wochenzyklus (${cycleInfo.cycleStartDateStr}) als Buch der Woche ausgewaehlt.\n\nEs wird ab sofort auf der Startseite und auf dem Dashboard aller Mitglieder mit Video praesentiert.\n\nVielen Dank fuer deine Aktivitaet in der BuchArena!`,
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
      message: `"${winner.title}" wurde als Buch der Woche ausgewaehlt.`,
      selected: bdwSetting,
    };
  } finally {
    isSelectingLock = false;
  }
}

/**
 * Automatische Pruefung der Sonntags-Auslosung ab 18:00 Uhr
 */
export async function ensureBuchDerWocheSelection(): Promise<BuchDerWocheSettings | null> {
  try {
    const db = await getDatabase();
    const cycleInfo = getBdwCycleInfo();
    const doc = await db.collection("settings").findOne({ key: "buchDerWoche" });

    const currentBdw = doc?.value as BuchDerWocheSettings | undefined;

    if (currentBdw && currentBdw.cycleKey === cycleInfo.currentCycleKey) {
      return currentBdw;
    }

    const subsCol = await getBdwSubmissionsCollection();
    const count = await subsCol.countDocuments({ status: { $ne: "withdrawn" } });

    if (count > 0) {
      const result = await runBuchDerWocheSelection();
      if (result.success && result.selected) {
        return result.selected;
      }
    }

    return currentBdw ?? null;
  } catch (err) {
    console.error("Fehler bei ensureBuchDerWocheSelection:", err);
    return null;
  }
}
