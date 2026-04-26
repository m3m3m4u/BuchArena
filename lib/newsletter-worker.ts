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
import { sendMail, type MailAttachment } from "@/lib/mail";
import { getWebdavClient, isAllowedRemotePath } from "@/lib/webdav-storage";

const SEND_INTERVAL_MS = 30_000;   // 30 Sekunden zwischen zwei E-Mails
const IDLE_INTERVAL_MS = 60_000;   // 60 Sekunden Pause wenn Queue leer

let workerRunning = false;

function buildUnsubscribeLink(email: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://bucharena.org";
  const token = createUnsubscribeToken(email);
  return `${baseUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
}

function mimeFromPath(p: string): string {
  const lower = p.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

export async function embedImages(
  html: string
): Promise<{ html: string; attachments: MailAttachment[] }> {
  const attachments: MailAttachment[] = [];
  const cidMap = new Map<string, string>(); // path -> cid
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://bucharena.org").replace(/\/+$/, "");

  // Alle <img src="/...">-URLs finden (relative Pfade)
  // Unterstützt sowohl <img ...> als auch <img ... /> (self-closing)
  const imgRegex = /<img([^>]*?)src=["'](\/[^"']+)["']([^>]*?)\/?>/gi;
  let match: RegExpExecArray | null;
  const replacements: Array<{ original: string; replacement: string }> = [];

  while ((match = imgRegex.exec(html)) !== null) {
    const fullTag = match[0];
    const before = match[1];
    const src = match[2];
    const after = match[3];

    let remotePath: string | null = null;

    // Intern: /api/profile/image?path=...
    if (src.startsWith("/api/profile/image")) {
      try {
        const u = new URL(src, "http://localhost");
        remotePath = u.searchParams.get("path");
      } catch {
        // ignore
      }
    }

    // Wenn kein gültiger WebDAV-Pfad: relative URL → absolute URL umwandeln
    if (!remotePath || !isAllowedRemotePath(remotePath)) {
      const absoluteSrc = `${baseUrl}${src}`;
      const newTag = `<img${before}src="${absoluteSrc}"${after}>`;
      replacements.push({ original: fullTag, replacement: newTag });
      console.warn(`[Newsletter] Bild als absolute URL eingebettet: ${absoluteSrc}`);
      continue;
    }

    let cid = cidMap.get(remotePath);
    if (!cid) {
      try {
        const client = getWebdavClient();
        const content = (await client.getFileContents(remotePath, {
          format: "binary",
        })) as Buffer;
        cid = `img-${attachments.length}-${Date.now()}`;
        attachments.push({
          filename: remotePath.split("/").pop() ?? "image",
          content,
          content_type: mimeFromPath(remotePath),
          content_id: cid,
        });
        cidMap.set(remotePath, cid);
        console.log(`[Newsletter] Bild eingebettet: ${remotePath}`);
      } catch (err) {
        // WebDAV-Fehler: als absolute URL einbetten
        const absoluteSrc = `${baseUrl}${src}`;
        const newTag = `<img${before}src="${absoluteSrc}"${after}>`;
        replacements.push({ original: fullTag, replacement: newTag });
        console.error(`[Newsletter] Bild nicht erreichbar (${remotePath}), als absolute URL: ${absoluteSrc}`, err instanceof Error ? err.message : err);
        continue;
      }
    }

    const newTag = `<img${before}src="cid:${cid}"${after}>`;
    replacements.push({ original: fullTag, replacement: newTag });
  }

  let result = html;
  for (const { original, replacement } of replacements) {
    result = result.replace(original, replacement);
  }

  return { html: result, attachments };
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
    const { html: htmlEmbedded, attachments } = await embedImages(entry.htmlContent);
    const htmlWithFooter = appendUnsubscribeFooter(htmlEmbedded, entry.email);
    await sendMail(entry.email, entry.subject, htmlWithFooter, attachments.length > 0 ? attachments : undefined);

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
