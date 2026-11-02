/**
 * Buch-der-Woche Worker
 *
 * Läuft im Node.js Server Runtime (über instrumentation.ts).
 * Prüft periodisch (z. B. alle 10 Minuten), ob Sonntag ab 18:00 Uhr ein neuer Zyklus begonnen hat,
 * und führt bei Bedarf die automatische Auslosung durch.
 */

import { ensureBuchDerWocheSelection } from "@/lib/buch-der-woche";

const CHECK_INTERVAL_MS = 10 * 60 * 1000; // alle 10 Minuten

let workerStarted = false;

export function startBuchDerWocheWorker(): void {
  if (workerStarted) return;
  workerStarted = true;

  // Initiale Prüfung 5 Sekunden nach Server-Start
  setTimeout(() => {
    void ensureBuchDerWocheSelection().catch((err) => {
      console.error("[BdW-Worker] Fehler bei initialer Prüfung:", err);
    });
  }, 5000);

  // Periodische Prüfung
  setInterval(() => {
    void ensureBuchDerWocheSelection().catch((err) => {
      console.error("[BdW-Worker] Fehler bei periodischer Prüfung:", err);
    });
  }, CHECK_INTERVAL_MS);
}
