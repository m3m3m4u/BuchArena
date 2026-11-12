import {
  getDatabase,
  getMessagesCollection,
  getMessageConversationsCollection,
  getUsersCollection,
} from "@/lib/mongodb";
import { type Collection } from "mongodb";
import { getLesezeichenCollection } from "@/lib/lesezeichen";
import { sendMail } from "@/lib/mail";
import { invalidateUnreadCountCache } from "@/lib/messages-unread-cache";
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
    return { success: false, message: "Auslosung läuft bereits." };
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
        return { success: false, message: "Ausgewähltes Buch nicht gefunden." };
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

    // ── Benachrichtigung an Gewinner (interne Nachricht & E-Mail) ──
    const notifyWinner = async (
      targetUsername: string,
      targetDisplayName: string,
      role: "Autor" | "Sprecher"
    ) => {
      const subject = "Dein Buch wurde als Buch der Woche ausgewählt! 🎉";
      const body = `Hallo ${targetDisplayName},\n\ndein eingereichtes Buch „${winner.title}“ wurde vom System für den aktuellen Wochenzyklus (${cycleInfo.cycleStartDateStr}) als Buch der Woche ausgewählt.\n\nEs wird ab sofort auf der Startseite und auf dem Dashboard aller Mitglieder mit Video präsentiert.\n\nVielen Dank für deine Aktivität in der BuchArena!`;

      // 1. Interne Nachricht & messageConversations aktualisieren
      try {
        const msgCol = await getMessagesCollection();
        const insertResult = await msgCol.insertOne({
          senderUsername: "BuchArena",
          recipientUsername: targetUsername,
          subject,
          body,
          read: false,
          deletedBySender: false,
          deletedByRecipient: false,
          createdAt: now,
        });

        const messageId = insertResult.insertedId;
        await msgCol.updateOne(
          { _id: messageId },
          { $set: { threadId: messageId } }
        );

        const [userA, userB] = ["BuchArena", targetUsername].sort();
        const isA = "BuchArena" === userA;
        const convCol = await getMessageConversationsCollection();
        await convCol.updateOne(
          { userA, userB },
          {
            $set: {
              latestMessageId: messageId,
              latestSender: "BuchArena",
              latestRecipient: targetUsername,
              latestSubject: subject,
              latestBody: body,
              latestCreatedAt: now,
              updatedAt: now,
            },
            $inc: { [isA ? "unreadForB" : "unreadForA"]: 1 },
            $setOnInsert: {
              userA,
              userB,
              [isA ? "unreadForA" : "unreadForB"]: 0,
            },
          },
          { upsert: true }
        );

        invalidateUnreadCountCache(targetUsername);
      } catch (msgErr) {
        console.warn(`[BdW] Konnte interne Gewinn-Nachricht nicht an ${targetUsername} zustellen:`, msgErr);
      }

      // 2. E-Mail-Benachrichtigung versenden
      try {
        const usersCol = await getUsersCollection();
        const userDoc = await usersCol.findOne(
          { username: targetUsername },
          { projection: { email: 1, displayName: 1 } }
        );

        if (userDoc?.email) {
          const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://bucharena.org").replace(/\/+$/, "");
          const salutation = userDoc.displayName || targetDisplayName || targetUsername;
          const emailSubject = `BuchArena – Dein Buch „${winner.title}“ ist Buch der Woche! 🎉`;
          const emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Buch der Woche! 🏆</h1>
                <p style="margin: 8px 0 0 0; font-size: 15px; opacity: 0.9;">Herzlichen Glückwunsch von der BuchArena</p>
              </div>

              <div style="padding: 28px 24px;">
                <p style="font-size: 16px; margin: 0 0 16px 0;">Hallo <strong>${salutation}</strong>,</p>
                <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px 0; color: #334155;">
                  Großartige Neuigkeiten: Dein eingereichtes Buch wurde soeben für den aktuellen Zyklus (ab <strong>${cycleInfo.cycleStartDateStr}</strong>) als <strong>Buch der Woche</strong> ausgewählt!
                </p>

                <div style="background: #f8fafc; border-left: 4px solid #2563eb; border-radius: 0 8px 8px 0; padding: 18px 20px; margin: 24px 0;">
                  <div style="font-size: 18px; font-weight: bold; color: #0f172a; margin-bottom: 6px;">
                    📖 ${winner.title}
                  </div>
                  <div style="font-size: 14px; color: #475569; line-height: 1.6;">
                    ✍️ <strong>Autor:</strong> ${winner.author}<br/>
                    ${winner.speaker ? `🎙️ <strong>Sprecher:</strong> ${winner.speaker}<br/>` : ""}
                    <span style="display:inline-block; margin-top: 6px; font-size: 12px; background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 4px; font-weight: 600;">Rolle: ${role}</span>
                  </div>
                </div>

                <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px 0; color: #334155;">
                  Dein Buch und dein Video stehen ab sofort im Mittelpunkt auf der <strong>Startseite</strong> sowie im <strong>Dashboard</strong> aller registrierten Mitglieder.
                </p>

                <div style="text-align: center; margin: 32px 0 24px 0;">
                  <a href="${baseUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 13px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
                    Jetzt auf der BuchArena ansehen
                  </a>
                </div>

                <div style="background: #f1f5f9; border-radius: 8px; padding: 14px 18px; margin-top: 24px; font-size: 13px; color: #64748b;">
                  💡 <strong>Tipp:</strong> Du kannst deine aktuellen Einreichungen und Auslosungsstatistiken jederzeit unter <a href="${baseUrl}/lesezeichen" style="color: #2563eb; text-decoration: underline;">Lesezeichen &rarr; Buch der Woche</a> einsehen.
                </div>
              </div>

              <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
                BuchArena – Die Community für Autoren, Leser und Buchliebhaber<br/>
                <a href="${baseUrl}" style="color: #64748b; text-decoration: underline;">bucharena.org</a>
              </div>
            </div>
          `;

          await sendMail(userDoc.email, emailSubject, emailHtml);
          console.log(`[BdW] Glückwunsch-E-Mail erfolgreich an ${userDoc.email} (${targetUsername}) versendet.`);
        }
      } catch (mailErr) {
        console.error(`[BdW] Fehler beim Senden der Glückwunsch-E-Mail an ${targetUsername}:`, mailErr);
      }
    };

    // 1. Autor benachrichtigen
    await notifyWinner(winner.username, winner.authorDisplayName || winner.author, "Autor");

    // 2. Falls ein Sprecher-Account verknüpft ist: diesen ebenfalls benachrichtigen
    if (winner.speakerUsername && winner.speakerUsername !== winner.username) {
      await notifyWinner(winner.speakerUsername, winner.speaker || winner.speakerUsername, "Sprecher");
    }

    return {
      success: true,
      message: `"${winner.title}" wurde als Buch der Woche ausgewählt.`,
      selected: bdwSetting,
    };
  } finally {
    isSelectingLock = false;
  }
}

/**
 * Automatische Prüfung der Sonntags-Auslosung ab 18:00 Uhr
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
