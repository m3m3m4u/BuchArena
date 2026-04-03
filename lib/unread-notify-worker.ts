/**
 * Unread-Message-Notification Worker
 *
 * Läuft als Hintergrundprozess auf dem Node.js-Server.
 * - Prüft alle 15 Minuten auf ungelesene Nachrichten, die älter als 24 Stunden sind
 * - Sendet eine E-Mail-Benachrichtigung an User, die `emailOnUnreadMessages` aktiviert haben
 * - Speichert Zeitstempel der letzten Benachrichtigung, um Spam zu vermeiden
 */

import { getMessagesCollection, getUsersCollection } from "@/lib/mongodb";
import { sendMail } from "@/lib/mail";

const CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 Minuten
const UNREAD_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 Stunden
const MIN_NOTIFY_GAP_MS = 24 * 60 * 60 * 1000; // Max. 1 Benachrichtigung pro 24h

let workerRunning = false;

async function checkUnreadMessages(): Promise<void> {
  const users = await getUsersCollection();
  const messages = await getMessagesCollection();

  // Alle User mit aktivierter Benachrichtigung
  type EligibleUser = Pick<import("mongodb").WithId<import("@/lib/mongodb").UserDocument>, "_id" | "username" | "email" | "displayName" | "lastUnreadNotifiedAt">;

  const eligibleUsers: EligibleUser[] = await users
    .find(
      { emailOnUnreadMessages: true, status: { $ne: "deactivated" } },
      { projection: { username: 1, email: 1, lastUnreadNotifiedAt: 1, displayName: 1 } },
    )
    .toArray();

  const now = new Date();
  const threshold = new Date(now.getTime() - UNREAD_THRESHOLD_MS);

  for (const user of eligibleUsers) {
    // Nicht öfter als einmal pro 24h benachrichtigen
    if (user.lastUnreadNotifiedAt) {
      const gap = now.getTime() - new Date(user.lastUnreadNotifiedAt).getTime();
      if (gap < MIN_NOTIFY_GAP_MS) continue;
    }

    // Ungelesene Nachrichten älter als 24h zählen
    // Nur persönliche Nachrichten zählen (keine Broadcasts)
    const unreadCount = await messages.countDocuments({
      recipientUsername: user.username,
      read: false,
      deletedByRecipient: false,
      broadcast: { $ne: true },
      createdAt: { $lt: threshold },
    });

    if (unreadCount === 0) continue;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://bucharena.org";
    const name = user.displayName || user.username;

    try {
      await sendMail(
        user.email,
        `BuchArena – ${unreadCount} ungelesene Nachricht${unreadCount > 1 ? "en" : ""}`,
        `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2>Ungelesene Nachrichten</h2>
          <p>Hallo <strong>${name}</strong>,</p>
          <p>du hast <strong>${unreadCount}</strong> ungelesene Nachricht${unreadCount > 1 ? "en" : ""} auf der BuchArena, die seit mehr als 24\u00a0Stunden auf dich warten.</p>
          <p><a href="${baseUrl}/nachrichten" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none">Nachrichten lesen</a></p>
          <p style="font-size:0.85em;color:#666">Du kannst diese Benachrichtigung jederzeit in deinen <a href="${baseUrl}/profil?tab=konto" style="color:#2563eb">Kontoeinstellungen</a> deaktivieren.</p>
        </div>
        `,
      );

      await users.updateOne(
        { username: user.username },
        { $set: { lastUnreadNotifiedAt: now } },
      );

      console.log(`[UnreadNotify] Benachrichtigung an ${user.username} (${unreadCount} ungelesen)`);
    } catch (err) {
      console.error(`[UnreadNotify] Fehler beim Senden an ${user.username}:`, err);
    }
  }
}

async function workerLoop(): Promise<void> {
  while (true) {
    try {
      await checkUnreadMessages();
    } catch (err) {
      console.error("[UnreadNotify] Worker-Fehler:", err);
    }

    await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL_MS));
  }
}

/**
 * Startet den Worker exakt einmal pro Server-Prozess.
 */
export function startUnreadNotifyWorker(): void {
  if (workerRunning) return;
  workerRunning = true;

  console.log("[UnreadNotify] Worker gestartet.");
  void workerLoop();
}
