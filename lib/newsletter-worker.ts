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

/**
 * Bereitet HTML für den E-Mail-Versand vor:
 * - Relative Bild-URLs → absolute URLs (mit Komprimierung via ?w=)
 * - CSS-Styles → E-Mail-kompatible HTML-Attribute (width, align, centering-div)
 */
export function prepareEmailHtml(html: string): string {
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://bucharena.org").replace(/\/+$/, "");
  const NEWSLETTER_IMG_WIDTH = 1200;

  return html.replace(/<img([^>]*?)>/gi, (_fullTag, innerAttrs: string) => {
    // src extrahieren
    const srcMatch = innerAttrs.match(/src=["']([^"']*)["']/i);
    if (!srcMatch) return _fullTag;
    const src = srcMatch[1];

    // alt extrahieren
    const altMatch = innerAttrs.match(/alt=["']([^"']*)["']/i);
    const alt = altMatch ? altMatch[1] : "";

    // data-align extrahieren (vom ResizableImage-Node gesetzt)
    const dataAlignMatch = innerAttrs.match(/data-align=["']([^"']*)["']/i);
    const dataAlign = dataAlignMatch ? dataAlignMatch[1] : null;

    // Breite aus style extrahieren (z.B. "width: 600px" oder "width: 100%")
    const styleMatch = innerAttrs.match(/style=["']([^"']*)["']/i);
    const styleStr = styleMatch ? styleMatch[1] : "";
    const widthMatch = styleStr.match(/width:\s*([\d.]+%|[\d.]+px)/i);
    let width = "";
    if (widthMatch) {
      const w = widthMatch[1];
      width = w.endsWith("%") ? w : w.replace("px", "");
    }

    // Zentrierungslogik aus Style (margin: auto = zentriert)
    const isCentered = dataAlign === "center" ||
      (styleStr.includes("margin-left: auto") || styleStr.includes("margin-left:auto"));

    // Absolute src aufbauen
    let absoluteSrc = src;
    if (src.startsWith("/")) {
      if (src.startsWith("/api/profile/image")) {
        const sep = src.includes("?") ? "&" : "?";
        absoluteSrc = `${baseUrl}${src}${sep}w=${NEWSLETTER_IMG_WIDTH}`;
      } else {
        absoluteSrc = `${baseUrl}${src}`;
      }
      console.log(`[Newsletter] Bild: ${absoluteSrc}`);
    }

    // E-Mail-kompatibles <img>-Tag aufbauen (kein float-CSS, stattdessen align-Attribut)
    let imgTag = `<img src="${absoluteSrc}"`;
    if (alt) imgTag += ` alt="${alt}"`;
    if (width) imgTag += ` width="${width}"`;
    if (dataAlign === "left") imgTag += ` align="left"`;
    else if (dataAlign === "right") imgTag += ` align="right"`;
    imgTag += ` style="display:block;max-width:100%;height:auto;" border="0">`;

    // Zentriert: in <div> einwickeln
    if (isCentered) {
      return `<div style="text-align:center;margin:0 auto;">${imgTag}</div>`;
    }
    return imgTag;
  });
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
    const htmlWithImages = prepareEmailHtml(entry.htmlContent);
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
