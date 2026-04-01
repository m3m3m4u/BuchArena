/**
 * Next.js Instrumentation-Hook
 *
 * Wird einmalig beim Start des Node.js-Servers ausgeführt.
 * Startet den Newsletter-Worker als Hintergrundprozess.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startNewsletterWorker } = await import("@/lib/newsletter-worker");
    startNewsletterWorker();
  }
}
