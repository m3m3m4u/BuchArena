"use client";

/**
 * Gewinnspiel-Ziehung – animierte Slot-Machine mit Canvas-Video-Export
 * Quadratisch (1080×1080), social-media-optimiert
 */

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getStoredAccount } from "@/lib/client-account";

type Teilnehmer = { username: string; displayName: string; angemeldetAt: string };

type GewinnspielInfo = {
  _id: string;
  buchTitel: string;
  autorName: string;
  autorUsername: string;
  coverImageUrl?: string;
  status: string;
  gewinnerName?: string;
  ziehungAm?: string;
  anmeldungBis?: string;
};

const SIZE = 700; // Canvas-Größe (wird auf 1080 skaliert für Export)

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

// ── Slot-Machine Konstanten ──────────────────────────────────────────────────
const SLOT_H = 70;      // Zeilenhöhe im Slot
const SLOT_VISIBLE = 7; // Sichtbare Zeilen
const SLOT_CENTER = Math.floor(SLOT_VISIBLE / 2); // = 3 (Mitte)
const SLOT_DRUM_Y = 75;
const SLOT_DRUM_H = SLOT_VISIBLE * SLOT_H; // 490
const SLOT_DRUM_X = 50;
const SLOT_DRUM_W = SIZE - 100; // 600

function drawSlotFrame(
  ctx: CanvasRenderingContext2D,
  namen: string[],
  scrollY: number,
  done: boolean,
  winnerIdx: number | null
) {
  const n = namen.length;

  // Hintergrund
  ctx.fillStyle = "#0d1b3e";
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Drum-Hintergrund
  ctx.fillStyle = "#112256";
  ctx.fillRect(SLOT_DRUM_X, SLOT_DRUM_Y, SLOT_DRUM_W, SLOT_DRUM_H);

  const startItemIndex = Math.floor(scrollY / SLOT_H);
  const offsetInItem = scrollY - startItemIndex * SLOT_H;

  // Fixierter Mittelbereich-Hintergrund (pixelgenau, scrollt NICHT mit)
  const fixedCenterY = SLOT_DRUM_Y + SLOT_CENTER * SLOT_H;

  // Clip auf Drum-Bereich
  ctx.save();
  ctx.beginPath();
  ctx.rect(SLOT_DRUM_X, SLOT_DRUM_Y, SLOT_DRUM_W, SLOT_DRUM_H);
  ctx.clip();

  for (let i = -1; i <= SLOT_VISIBLE; i++) {
    const listIdx = ((startItemIndex + i) % n + n) % n;
    const y = SLOT_DRUM_Y + i * SLOT_H - offsetInItem;

    // Bestimme ob diese Zeile visuell im Mittelbereich liegt (pixelbasiert)
    const rowCenterPx = y + SLOT_H / 2;
    const isAtCenter = rowCenterPx >= fixedCenterY && rowCenterPx < fixedCenterY + SLOT_H;

    // Trennlinie
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(SLOT_DRUM_X, y + SLOT_H - 1, SLOT_DRUM_W, 1);

    ctx.font = `${Math.min(26, SLOT_H - 32)}px sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = namen[listIdx].length > 32 ? namen[listIdx].slice(0, 31) + "…" : namen[listIdx];
    ctx.fillText(label, SIZE / 2, y + SLOT_H / 2);
  }
  ctx.restore();

  // Verlaufschattierung oben
  const gradTop = ctx.createLinearGradient(0, SLOT_DRUM_Y, 0, SLOT_DRUM_Y + SLOT_H * 2);
  gradTop.addColorStop(0, "rgba(17,34,86,1)");
  gradTop.addColorStop(1, "rgba(17,34,86,0)");
  ctx.fillStyle = gradTop;
  ctx.fillRect(SLOT_DRUM_X, SLOT_DRUM_Y, SLOT_DRUM_W, SLOT_H * 2);

  // Verlaufschattierung unten
  const gradBot = ctx.createLinearGradient(0, SLOT_DRUM_Y + SLOT_DRUM_H - SLOT_H * 2, 0, SLOT_DRUM_Y + SLOT_DRUM_H);
  gradBot.addColorStop(0, "rgba(17,34,86,0)");
  gradBot.addColorStop(1, "rgba(17,34,86,1)");
  ctx.fillStyle = gradBot;
  ctx.fillRect(SLOT_DRUM_X, SLOT_DRUM_Y + SLOT_DRUM_H - SLOT_H * 2, SLOT_DRUM_W, SLOT_H * 2);

  // Goldener Rahmen – fixiert, exakt deckend mit dem Mittelbereich-Highlight
  ctx.save();
  ctx.strokeStyle = "#f9a825";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(SLOT_DRUM_X, fixedCenterY, SLOT_DRUM_W, SLOT_H);
  ctx.restore();

  // Äußerer Drum-Rahmen
  ctx.save();
  ctx.strokeStyle = "rgba(249,168,37,0.3)";
  ctx.lineWidth = 2;
  ctx.strokeRect(SLOT_DRUM_X, SLOT_DRUM_Y, SLOT_DRUM_W, SLOT_DRUM_H);
  ctx.restore();

  // Titel oben
  ctx.fillStyle = "rgba(249,168,37,0.9)";
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("BuchArena Gewinnspiel", SIZE / 2, 40);

  // Gewinner-Banner unten (nur im exportierten Video sichtbar)
  if (done && winnerIdx !== null) {
    ctx.fillStyle = "rgba(17,34,86,0.92)";
    ctx.fillRect(0, SIZE - 85, SIZE, 85);
    ctx.fillStyle = "#f9a825";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const wLabel = namen[winnerIdx].length > 36 ? namen[winnerIdx].slice(0, 35) + "…" : namen[winnerIdx];
    ctx.fillText(`🎉 ${wLabel}`, SIZE / 2, SIZE - 42);
  }
}

export default function ZiehungsradPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [teilnehmer, setTeilnehmer] = useState<Teilnehmer[]>([]);
  const [info, setInfo] = useState<GewinnspielInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<Teilnehmer | null>(null);
  const [exporting, setExporting] = useState(false);
  const exportBlobRef = useRef<Blob | null>(null);

  const rotRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const acc = getStoredAccount();
    if (!acc) { router.replace("/gewinnspiel"); return; }

    Promise.all([
      fetch(`/api/gewinnspiele/${id}`).then((r) => r.json()),
      fetch(`/api/gewinnspiele/${id}/teilnehmer`).then((r) => r.json()),
    ]).then(([gInfo, tList]) => {
      const isAdmin = acc.role === "ADMIN" || acc.role === "SUPERADMIN";
      const isAutor = acc.username === (gInfo as GewinnspielInfo).autorUsername;
      if (!isAdmin && !isAutor) { router.replace("/gewinnspiel"); return; }
      setInfo(gInfo as GewinnspielInfo);
      setTeilnehmer(tList as Teilnehmer[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, router]);

  // Initial zeichnen
  useEffect(() => {
    if (!canvasRef.current || teilnehmer.length === 0) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    rotRef.current = 0;
    drawSlotFrame(ctx, teilnehmer.map((t) => t.displayName), 0, false, null);
  }, [teilnehmer]);

  function spin() {
    if (spinning || teilnehmer.length === 0) return;
    setSpinning(true);
    setWinner(null);

    const namen = teilnehmer.map((t) => t.displayName);
    const n = namen.length;
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    const winnerIdx = arr[0] % n;

    const ctx = canvasRef.current!.getContext("2d")!;
    const duration = 5000;
    const startTime = performance.now();
    rotRef.current = 0;

    // Mindestens so viele Zyklen, dass 20 Namen durchlaufen + alle mind. 1× sichtbar waren
    const minCycles = Math.max(Math.ceil(20 / n), 2);
    const fullCycles = minCycles + 2 + Math.floor(Math.random() * 3);
    const winnerRelative = (winnerIdx - SLOT_CENTER + n) % n;
    const targetScrollY = (fullCycles * n + winnerRelative) * SLOT_H;

    function animateSlot(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const currentScrollY = targetScrollY * easeOut(t);
      rotRef.current = currentScrollY;
      drawSlotFrame(ctx, namen, currentScrollY, t >= 1, t >= 1 ? winnerIdx : null);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animateSlot);
      } else {
        setSpinning(false);
        setWinner(teilnehmer[winnerIdx]);
      }
    }
    rafRef.current = requestAnimationFrame(animateSlot);
  }

  async function exportVideo() {
    if (!canvasRef.current || teilnehmer.length === 0) return;
    setExporting(true);
    exportBlobRef.current = null;

    // Export-Canvas in 1080×1080
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = 1080;
    exportCanvas.height = 1080;
    const ectx = exportCanvas.getContext("2d")!;

    const namen = teilnehmer.map((t) => t.displayName);
    const n = namen.length;

    // Gewinner für das Export-Video
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    const winnerIdx = arr[0] % n;

    const mimeType = MediaRecorder.isTypeSupported("video/mp4;codecs=h264")
      ? "video/mp4;codecs=h264"
      : MediaRecorder.isTypeSupported("video/mp4")
      ? "video/mp4"
      : "video/webm;codecs=vp9";
    const fileExt = mimeType.startsWith("video/mp4") ? "mp4" : "webm";

    const stream = exportCanvas.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 8_000_000,
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    const scale = 1080 / SIZE;
    // Tmp-Canvas einmal erstellen (nicht pro Frame neu)
    const tmp = document.createElement("canvas");
    tmp.width = SIZE;
    tmp.height = SIZE;
    const tctx = tmp.getContext("2d")!;

    function drawScaled(scrollY: number, hl: number | null) {
      drawSlotFrame(tctx, namen, scrollY, hl !== null, hl);
      ectx.clearRect(0, 0, 1080, 1080);
      ectx.save();
      ectx.scale(scale, scale);
      ectx.drawImage(tmp, 0, 0);
      ectx.restore();
    }

    // Phasen: 0.5s Ruhe → 5s Spin → 0.8s Gewinner-Anzeige
    const spinDelay = 500;
    const spinDuration = 5000;
    const winnerHold = 800;

    const slotWinnerRelative = (winnerIdx - SLOT_CENTER + n) % n;
    const exportMinCycles = Math.max(Math.ceil(20 / n), 2);
    const exportCycles = exportMinCycles + 2 + Math.floor(Math.random() * 3);
    const targetScrollY = (exportCycles * n + slotWinnerRelative) * SLOT_H;

    // Erstes Frame zeichnen bevor Recording startet
    drawScaled(0, null);

    await new Promise<void>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        exportBlobRef.current = blob;
        // Auto-Download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `gewinnspiel-ziehung-${id}.${fileExt}`;
        a.click();
        URL.revokeObjectURL(url);
        setExporting(false);
        resolve();
      };

      recorder.start();
      const startTime = performance.now();

      function renderFrame() {
        const elapsed = performance.now() - startTime;

        if (elapsed < spinDelay) {
          // Phase 1: statisch
          drawScaled(0, null);
        } else {
          const t = Math.min((elapsed - spinDelay) / spinDuration, 1);
          const scrollY = targetScrollY * easeOut(t);
          const done = t >= 1;
          drawScaled(scrollY, done ? winnerIdx : null);

          if (done && elapsed >= spinDelay + spinDuration + winnerHold) {
            // Gewinner-Frame nochmals zeichnen und Recording stoppen
            drawScaled(targetScrollY, winnerIdx);
            recorder.stop();
            return;
          }
        }

        requestAnimationFrame(renderFrame);
      }

      requestAnimationFrame(renderFrame);
    });
  }


  if (loading) return <main className="site-shell py-10 text-center text-sm opacity-60">Lade…</main>;

  return (
    <main className="site-shell py-8">
      <Link href="/gewinnspiel/autor" className="text-sm opacity-60 hover:opacity-100 mb-4 inline-block">← Meine Gewinnspiele</Link>

      <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--color-arena-blue)" }}>
        Ziehung
      </h1>
      {info && (
        <p className="text-sm opacity-70 mb-4">{info.buchTitel} · {teilnehmer.length} Teilnehmer</p>
      )}

      {/* Warnung wenn Ziehungszeitpunkt noch nicht erreicht */}
      {info?.ziehungAm && new Date() < new Date(info.ziehungAm) && (
        <div className="mb-4 p-3 rounded-lg text-sm font-medium"
          style={{ background: "#fef3c7", border: "1px solid #fbbf24", color: "#92400e" }}>
          Ziehung erst ab {new Date(info.ziehungAm).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })} Uhr möglich. Das Rad kann bereits ausprobiert werden, aber das Ergebnis wird erst ab dann offiziell gespeichert.
        </div>
      )}

      {teilnehmer.length === 0 ? (
        <p className="text-sm opacity-60">Keine Teilnehmer vorhanden.</p>
      ) : (
        <>
          {/* Canvas */}
          <div className="flex justify-center mb-5">
            <canvas
              ref={canvasRef}
              width={SIZE}
              height={SIZE}
              className="rounded-xl shadow-2xl"
              style={{ width: Math.min(SIZE, 480), height: Math.min(SIZE, 480) }}
            />
          </div>

          {/* Gewinner-Anzeige */}
          {winner && (
            <div className="mb-4 p-4 rounded-xl text-center font-bold text-xl"
              style={{ background: "var(--color-arena-yellow)", color: "var(--color-arena-blue)" }}>
              Gewinner: {winner.displayName}
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={spin}
              disabled={spinning}
              className="px-6 py-3 rounded-xl font-bold text-base transition-opacity disabled:opacity-50"
              style={{ background: "var(--color-arena-blue)", color: "white" }}
            >
              {spinning ? "Dreht…" : "Drehen"}
            </button>

            <button
              onClick={exportVideo}
              disabled={exporting || spinning}
              className="px-6 py-3 rounded-xl font-bold text-base border transition-opacity disabled:opacity-50"
              style={{ borderColor: "var(--color-arena-blue)", color: "var(--color-arena-blue)" }}
            >
              {exporting ? "Video wird erstellt…" : "Video erstellen & herunterladen"}
            </button>
          </div>

          <p className="text-xs opacity-50 text-center mt-3">
            Das exportierte Video ist quadratisch (1080×1080) und für Social Media optimiert.
          </p>

          {/* Teilnehmerliste */}
          <details className="mt-6">
            <summary className="text-sm font-medium cursor-pointer opacity-70 hover:opacity-100">
              Alle Teilnehmer anzeigen ({teilnehmer.length})
            </summary>
            <ul className="mt-2 text-sm space-y-1 max-h-48 overflow-y-auto">
              {teilnehmer.map((t) => (
                <li key={t.username} className="px-2 py-0.5 rounded hover:bg-gray-50">
                  {t.displayName} <span className="opacity-50">@{t.username}</span>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </main>
  );
}
