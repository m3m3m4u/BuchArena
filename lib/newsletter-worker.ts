/**
 * Newsletter-Background-Worker
 *
 * Läuft dauerhaft auf dem Node.js-Server (kein Serverless-Timeout).
 * - Sucht den ältesten "pending"-Eintrag in der Queue
 * - Sendet die E-Mail via SMTP (30 Sekunden Abstand zwischen je zwei Versendungen)
 * - Setzt den Status auf "sent" oder "failed"
 * - Wenn die Queue leer ist: erneute Prüfung nach 60 Sekunden
 */

import { getNewsletterQueueCollection, createUnsubscribeToken } from "@/lib/newsletter";
import { sendMail } from "@/lib/mail";

const SEND_INTERVAL_MS = 30_000;   // 30 Sekunden zwischen zwei E-Mails
const IDLE_INTERVAL_MS = 60_000;   // 60 Sekunden Pause wenn Queue leer

let workerRunning = false;

function buildUnsubscribeLink(email: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://bucharena.org";
  const token = createUnsubscribeToken(email);
  return `${baseUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function makeImagesAbsolute(html: string): string {
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://bucharena.org").replace(/\/+$/, "");
  // Max-Breite für Newsletter-Bilder (wird als WebP mit quality=80 geliefert)
  const NEWSLETTER_IMG_WIDTH = 1200;

  // Alle <img src="/...">-URLs (relative Pfade) → absolute URLs umwandeln
  return html.replace(
    /<img([^>]*?)src=["'](\/[^"']+)["']([^>]*?)\/?>/gi,
    (_fullTag, before, src, after) => {
      let absoluteSrc: string;
      // /api/profile/image?path=... → Komprimierung via ?w= aktivieren
      if (src.startsWith("/api/profile/image")) {
        const separator = src.includes("?") ? "&" : "?";
        absoluteSrc = `${baseUrl}${src}${separator}w=${NEWSLETTER_IMG_WIDTH}`;
      } else {
        absoluteSrc = `${baseUrl}${src}`;
      }
      console.log(`[Newsletter] Bild als absolute URL: ${absoluteSrc}`);
      return `<img${before}src="${absoluteSrc}"${after}>`;
    }
  );
}

function appendUnsubscribeFooter(html: string, email: string): string {
  const link = buildUnsubscribeLink(email);
  const footer = `
<div style="margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;text-align:center;">
  <p>Du erhältst diese E-Mail, weil du den BuchArena-Newsletter abonniert hast.</p>
  <p><a href="${link}" style="color:#6b7280;text-decoration:underline;">Newsletter abbestellen</a></p>
</div>`;
  return html + footer;
}

async function processNextQueueEntry(): Promise<boolean> {
  const queue = await getNewsletterQueueCollection();

  const entry = await queue.findOneAndUpdate(
    { status: "pending" },
    { $set: { status: "processing" as const } },
    { sort: { createdAt: 1 }, returnDocument: "after" }
  );

  if (!entry) return false; // Queue leer

  try {
    const htmlWithImages = makeImagesAbsolute(entry.htmlContent);
    const htmlWithFooter = appendUnsubscribeFooter(htmlWithImages, entry.email);
    await sendMail(entry.email, entry.subject, htmlWithFooter);

    await queue.updateOne(
      { _id: entry._id },
      { $set: { status: "sent", sentAt: new Date() } }
    );

    console.log(`[Newsletter] Gesendet an ${entry.email} | Betreff: "${entry.subject}"`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[Newsletter] Fehler beim Senden an ${entry.email}:`, errorMessage);

    await queue.updateOne(
      { _id: entry._id },
      { $set: { status: "failed", failedAt: new Date(), errorMessage } }
    );
  }

  return true; // Eintrag wurde verarbeitet
}

async function workerLoop(): Promise<void> {
  while (true) {
    try {
      const hadEntry = await processNextQueueEntry();

      if (hadEntry) {
        // 30 Sekunden warten, dann nächsten Eintrag verarbeiten
        await new Promise((resolve) => setTimeout(resolve, SEND_INTERVAL_MS));
      } else {
        // Queue leer: 60 Sekunden warten, dann erneut prüfen
        await new Promise((resolve) => setTimeout(resolve, IDLE_INTERVAL_MS));
      }
    } catch (err) {
      console.error("[Newsletter] Worker-Fehler:", err);
      // Bei unerwarteten Fehlern kurz pausieren und weitermachen
      await new Promise((resolve) => setTimeout(resolve, IDLE_INTERVAL_MS));
    }
  }
}

/**
 * Startet den Worker exakt einmal pro Server-Prozess.
 * Wird aus instrumentation.ts beim Start aufgerufen.
 */
export function startNewsletterWorker(): void {
  if (workerRunning) return;
  workerRunning = true;

  console.log("[Newsletter] Worker gestartet.");
  // Via void explizit als Fire-and-Forget starten
  void workerLoop();
}
