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

// Für Reel-Export: sanftes Anfahren (15%), Vollgas (60%), sanftes Bremsen (25%)
// Trapezförmiges Geschwindigkeitsprofil – keine Geschwindigkeitssprünge
function reelEaseOut(t: number): number {
  const A = 0.15;  // Anlaufphase
  const B = 0.25;  // Auslaufphase
  const vMax = 1 / (1 - A / 2 - B / 2); // ≈ 1.25 (Spitzengeschwindigkeit)
  if (t <= A) {
    // Gleichmäßige Beschleunigung von 0 auf vMax
    return vMax * t * t / (2 * A);
  } else if (t <= 1 - B) {
    // Konstante Maximalgeschwindigkeit
    return vMax * A / 2 + vMax * (t - A);
  } else {
    // Gleichmäßige Verzögerung von vMax auf 0
    const s = t - (1 - B);
    return (1 - vMax * B / 2) + vMax * s - vMax * s * s / (2 * B);
  }
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
  winnerIdx: number | null,
  seamless = false   // true = kein eigener Hintergrund (für Reel)
) {
  const n = namen.length;

  // Hintergrund (nur im normalen Modus)
  if (!seamless) {
    ctx.fillStyle = "#0d1b3e";
    ctx.fillRect(0, 0, SIZE, SIZE);
  }

  // Drum-Hintergrund
  ctx.fillStyle = seamless ? "rgba(0,8,40,0.72)" : "#112256";
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
  const drumBg = seamless ? "0,8,40" : "17,34,86";
  const gradTop = ctx.createLinearGradient(0, SLOT_DRUM_Y, 0, SLOT_DRUM_Y + SLOT_H * 2);
  gradTop.addColorStop(0, `rgba(${drumBg},1)`);
  gradTop.addColorStop(1, `rgba(${drumBg},0)`);
  ctx.fillStyle = gradTop;
  ctx.fillRect(SLOT_DRUM_X, SLOT_DRUM_Y, SLOT_DRUM_W, SLOT_H * 2);

  // Verlaufschattierung unten
  const gradBot = ctx.createLinearGradient(0, SLOT_DRUM_Y + SLOT_DRUM_H - SLOT_H * 2, 0, SLOT_DRUM_Y + SLOT_DRUM_H);
  gradBot.addColorStop(0, `rgba(${drumBg},0)`);
  gradBot.addColorStop(1, `rgba(${drumBg},1)`);
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

  // Titel oben (nur im normalen Modus)
  if (!seamless) {
    ctx.fillStyle = "rgba(249,168,37,0.9)";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("BuchArena Gewinnspiel", SIZE / 2, 40);
  }

  // Gewinner-Banner unten (nur im normalen Modus)
  if (!seamless && done && winnerIdx !== null) {
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
  const [exportingReel, setExportingReel] = useState(false);
  const [reelError, setReelError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
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
      const adminFlag = acc.role === "ADMIN" || acc.role === "SUPERADMIN";
      const isAutor = acc.username === (gInfo as GewinnspielInfo).autorUsername;
      if (!adminFlag && !isAutor) { router.replace("/gewinnspiel"); return; }
      if (adminFlag) setIsAdmin(true);
      setInfo(gInfo as GewinnspielInfo);
      setTeilnehmer(tList as Teilnehmer[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, router]);

  const DUMMY_TEILNEHMER: Teilnehmer[] = [
    { username: "test1", displayName: "Anna Mustermann", angemeldetAt: "" },
    { username: "test2", displayName: "Ben Schreiber", angemeldetAt: "" },
    { username: "test3", displayName: "Clara Lesefreudig", angemeldetAt: "" },
    { username: "test4", displayName: "David Bücherwurm", angemeldetAt: "" },
    { username: "test5", displayName: "Eva Romanliebhaberin", angemeldetAt: "" },
  ];
  const aktiveTeilnehmer = teilnehmer.length > 0 ? teilnehmer : (isAdmin ? DUMMY_TEILNEHMER : []);

  // Initial zeichnen
  useEffect(() => {
    if (!canvasRef.current || aktiveTeilnehmer.length === 0) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    rotRef.current = 0;
    drawSlotFrame(ctx, aktiveTeilnehmer.map((t) => t.displayName), 0, false, null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teilnehmer, isAdmin]);

  function spin() {
    if (spinning || aktiveTeilnehmer.length === 0) return;
    setSpinning(true);
    setWinner(null);

    const namen = aktiveTeilnehmer.map((t) => t.displayName);
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
        setWinner(aktiveTeilnehmer[winnerIdx]);
      }
    }
    rafRef.current = requestAnimationFrame(animateSlot);
  }

  async function exportVideo() {
    if (!canvasRef.current || aktiveTeilnehmer.length === 0) return;
    setExporting(true);
    exportBlobRef.current = null;

    // Export-Canvas in 1080×1080
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = 1080;
    exportCanvas.height = 1080;
    const ectx = exportCanvas.getContext("2d")!;

    const namen = aktiveTeilnehmer.map((t) => t.displayName);
    const n = namen.length;

    // Gewinner für das Export-Video
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    const winnerIdx = arr[0] % n;

    // Chrome MediaRecorder unterstützt nur WebM zuverlässig
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const fileExt = "webm";

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

  async function exportReel() {
    if (aktiveTeilnehmer.length === 0) return;
    setReelError(null);

    // WebCodecs-Support prüfen
    if (typeof VideoEncoder === "undefined") {
      setReelError("Dein Browser unterstützt keine Videoerstellung (WebCodecs). Bitte Chrome 94+ oder Edge verwenden.");
      return;
    }

    setExportingReel(true);
    try {

    const W = 1080, H = 1920;
    const reelCanvas = document.createElement("canvas");
    reelCanvas.width = W; reelCanvas.height = H;
    const rctx = reelCanvas.getContext("2d")!;

    const namen = aktiveTeilnehmer.map((t) => t.displayName);
    const n = namen.length;
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    const winnerIdx = arr[0] % n;

    // Buchcover laden (nicht mehr direkt verwendet, aber vorhanden für spätere Nutzung)
    let coverImg: HTMLImageElement | null = null;
    if (info?.coverImageUrl) {
      coverImg = await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = info!.coverImageUrl!;
      });
    }

    // Slot-Canvas (intern SIZE×SIZE)
    const tmp = document.createElement("canvas");
    tmp.width = SIZE; tmp.height = SIZE;
    const tctx = tmp.getContext("2d")!;

    // Layout: 1080×1920  (Slot 20% kleiner, gleichmäßige Abstände)
    const SLOT_SIZE = 800;
    const SLOT_X = (W - SLOT_SIZE) / 2;   // 140px Rand
    const SLOT_Y = 560;
    const BOT_Y  = SLOT_Y + SLOT_SIZE;    // 1360

    function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
      const words = text.split(" ");
      const lines: string[] = [];
      let cur = "";
      for (const word of words) {
        const test = cur ? `${cur} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && cur) { lines.push(cur); cur = word; }
        else cur = test;
      }
      if (cur) lines.push(cur);
      return lines;
    }

    function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
    }

    function drawReelFrame(scrollY: number, done: boolean, hl: number | null) {
      rctx.clearRect(0, 0, W, H);

      // ── HINTERGRUND: reines Weiß (passend zum Logo-Hintergrund) ──
      rctx.fillStyle = "#ffffff";
      rctx.fillRect(0, 0, W, H);

      // ── HELPER ──────────────────────────────────────────────────
      function hLine(y: number, alpha = 0.25) {
        const lg = rctx.createLinearGradient(0,0,W,0);
        lg.addColorStop(0,   "rgba(10,26,78,0)");
        lg.addColorStop(0.15,`rgba(10,26,78,${alpha})`);
        lg.addColorStop(0.85,`rgba(10,26,78,${alpha})`);
        lg.addColorStop(1,   "rgba(10,26,78,0)");
        rctx.strokeStyle = lg; rctx.lineWidth = 1.5;
        rctx.beginPath(); rctx.moveTo(0,y); rctx.lineTo(W,y); rctx.stroke();
      }

      // ── TOP: Headline ──────────────────────────────────────────
      rctx.textAlign = "center"; rctx.textBaseline = "middle";

      // "GEWINNSPIEL"  (y=190)
      rctx.font = "bold 70px sans-serif";
      rctx.fillStyle = "#f9a825";
      rctx.fillText("GEWINNSPIEL", W / 2, 190);

      hLine(268, 0.18);

      // "Wer gewinnt?" / "THE WINNER IS:"  (y=410, viel Platz)
      rctx.font = "bold 80px sans-serif";
      rctx.fillStyle = "#0a1a4e";
      rctx.fillText(done ? "THE WINNER IS:" : "Wer gewinnt?", W / 2, 410);

      hLine(538, 0.18);

      // ── SLOT-MACHINE als dunkle Karte ────────────────────────────
      // Dunkle gerundete Karte als Hintergrund für den Slot
      const cardR = 32;
      const cardPad = 10;
      const cX = SLOT_X - cardPad, cY = SLOT_Y - cardPad;
      const cW = SLOT_SIZE + cardPad * 2, cH = SLOT_SIZE + cardPad * 2;

      // Schatten: gestapelte Offset-Rects statt shadowBlur (viel schneller)
      rctx.save();
      for (let s = 3; s >= 1; s--) {
        rctx.globalAlpha = 0.06;
        rctx.beginPath();
        rctx.roundRect(cX + s * 4, cY + s * 6, cW, cH, cardR + s);
        rctx.fillStyle = "#0a1a4e";
        rctx.fill();
      }
      rctx.globalAlpha = 1;
      rctx.beginPath();
      rctx.roundRect(cX, cY, cW, cH, cardR);
      rctx.fillStyle = "#0d1b3e";
      rctx.fill();
      rctx.restore();

      // Slot darauf rendern (seamless=true: kein eigener Bg im Slot)
      drawSlotFrame(tctx, namen, scrollY, done, hl, true);
      const scale = SLOT_SIZE / SIZE;
      rctx.save();
      rctx.beginPath();
      rctx.roundRect(SLOT_X, SLOT_Y, SLOT_SIZE, SLOT_SIZE, cardR - cardPad);
      rctx.clip();
      rctx.translate(SLOT_X, SLOT_Y);
      rctx.scale(scale, scale);
      rctx.drawImage(tmp, 0, 0);
      rctx.restore();

      // Goldener Rand um die Karte
      rctx.save();
      rctx.beginPath();
      rctx.roundRect(cX, cY, cW, cH, cardR);
      rctx.strokeStyle = "rgba(249,168,37,0.55)";
      rctx.lineWidth = 3;
      rctx.stroke();
      rctx.restore();

      hLine(BOT_Y + cardPad + 22, 0.18);

      // ── BOTTOM: Buch + Autor ─────────────────────────────────────
      const BOT_MID = BOT_Y + cardPad + (H - BOT_Y - cardPad) / 2;

      rctx.textAlign = "center"; rctx.textBaseline = "middle";

      rctx.font = "bold 46px sans-serif";
      rctx.fillStyle = "#0a1a4e";
      const titleLines = wrapText(rctx, info?.buchTitel ?? "", W - 120);
      const lineH = 58;
      const totalTitleH = Math.min(titleLines.length, 3) * lineH;
      const titleStartY = BOT_MID - totalTitleH / 2 - 28;
      titleLines.slice(0, 3).forEach((line, i) => {
        rctx.fillText(line, W / 2, titleStartY + i * lineH);
      });

      rctx.font = "italic 34px sans-serif";
      rctx.fillStyle = "#f9a825";
      rctx.fillText(`von ${info?.autorName ?? ""}`, W / 2, titleStartY + totalTitleH + 24);

      // Footer
      rctx.font = "22px sans-serif";
      rctx.fillStyle = "rgba(10,26,78,0.35)";
      rctx.fillText("bucharena.org", W / 2, H - 40);
    }

    // ── Timing & Scroll ──────────────────────────────────────────
    const spinDelay = 1000;
    const spinDuration = 11000;
    const winnerHold = 3000;
    const TOTAL_MS = spinDelay + spinDuration + winnerHold;
    const FPS = 30;
    const TOTAL_FRAMES = Math.ceil(TOTAL_MS / 1000 * FPS); // 450

    const slotWinnerRelative = (winnerIdx - SLOT_CENTER + n) % n;
    const exportMinCycles = Math.max(Math.ceil(20 / n), 2);
    const exportCycles = exportMinCycles + 2 + Math.floor(Math.random() * 3);
    const targetScrollY = (exportCycles * n + slotWinnerRelative) * SLOT_H;

    // ── Audio: Track von API laden (WebDAV, nicht /public/mp3) ───────────────
    const tracksResp = await fetch("/api/musik");
    const tracksData = await tracksResp.json();
    const tracks: { fileUrl: string }[] = tracksData.tracks ?? [];
    if (tracks.length === 0) throw new Error("Keine Musik-Tracks verfügbar. Bitte zuerst Tracks hochladen.");
    const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
    const audioResp = await fetch(randomTrack.fileUrl);
    if (!audioResp.ok) throw new Error(`Audio konnte nicht geladen werden (${audioResp.status}): ${randomTrack.fileUrl}`);
    const decodeCtx = new AudioContext();
    const decodedAudio = await decodeCtx.decodeAudioData(await audioResp.arrayBuffer());
    await decodeCtx.close();

    const SAMPLE_RATE = 44100;
    const totalAudioSamples = Math.ceil(TOTAL_MS / 1000 * SAMPLE_RATE);
    const left  = new Float32Array(totalAudioSamples);
    const right = new Float32Array(totalAudioSamples);
    const srcL = decodedAudio.getChannelData(0);
    const srcR = decodedAudio.numberOfChannels > 1 ? decodedAudio.getChannelData(1) : srcL;
    for (let s = 0; s < totalAudioSamples; s++) {
      left[s]  = srcL[s % decodedAudio.length];
      right[s] = srcR[s % decodedAudio.length];
    }

    // ── WebCodecs + mp4-muxer: perfektes CFR-Video ohne Jitter ───────────────
    const { Muxer, ArrayBufferTarget } = await import("mp4-muxer");
    const target = new ArrayBufferTarget();
    const muxer = new Muxer({
      target,
      video: { codec: "avc", width: W, height: H },
      audio: { codec: "aac", sampleRate: SAMPLE_RATE, numberOfChannels: 2 },
      fastStart: "in-memory",
    });

    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta!),
      error: (e) => { throw e; },
    });
    videoEncoder.configure({
      codec: "avc1.640028",   // H.264 High Profile Level 4.0
      width: W, height: H,
      bitrate: 4_000_000,
      framerate: FPS,
      avc: { format: "avc" },
    });

    const audioEncoder = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta!),
      error: (e) => console.error("Audio-Encoder:", e),
    });
    audioEncoder.configure({
      codec: "mp4a.40.2",   // AAC-LC
      sampleRate: SAMPLE_RATE,
      numberOfChannels: 2,
      bitrate: 128_000,
    });

    // Audio in 10ms-Blöcken encodieren
    const AUDIO_CHUNK = Math.floor(SAMPLE_RATE / 100); // 441 samples = 10ms
    for (let i = 0; i < totalAudioSamples; i += AUDIO_CHUNK) {
      const frames = Math.min(AUDIO_CHUNK, totalAudioSamples - i);
      const plane = new Float32Array(frames * 2);
      plane.set(left.subarray(i, i + frames), 0);
      plane.set(right.subarray(i, i + frames), frames);
      const ad = new AudioData({
        format: "f32-planar", sampleRate: SAMPLE_RATE,
        numberOfFrames: frames, numberOfChannels: 2,
        timestamp: Math.floor(i * 1_000_000 / SAMPLE_RATE),
        data: plane,
      });
      audioEncoder.encode(ad);
      ad.close();
    }

    // Video-Frames schneller-als-Echtzeit rendern → exakte Timestamps, kein Ruckeln
    for (let frameIdx = 0; frameIdx < TOTAL_FRAMES; frameIdx++) {
      const elapsed = (frameIdx / FPS) * 1000;
      if (elapsed < spinDelay) {
        drawReelFrame(0, false, null);
      } else {
        const t = Math.min((elapsed - spinDelay) / spinDuration, 1);
        const scrollY = targetScrollY * reelEaseOut(t);
        const done = t >= 1;
        drawReelFrame(scrollY, done, done ? winnerIdx : null);
      }
      const ts = Math.round(frameIdx * 1_000_000 / FPS);
      const frame = new VideoFrame(reelCanvas, { timestamp: ts, duration: Math.round(1_000_000 / FPS) });
      videoEncoder.encode(frame, { keyFrame: frameIdx % (FPS * 2) === 0 });
      frame.close();
      // Alle 30 Frames kurz yielden damit die Seite nicht einfriert
      if (frameIdx % 30 === 0) await new Promise<void>(r => setTimeout(r, 0));
    }

    await videoEncoder.flush();
    await audioEncoder.flush();
    muxer.finalize();

    const blob = new Blob([target.buffer], { type: "video/mp4" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gewinnspiel-reel-${id}.mp4`;
    a.click();
    URL.revokeObjectURL(url);
    setExportingReel(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Reel-Export fehlgeschlagen:", err);
      setReelError(`Export fehlgeschlagen: ${msg}`);
      setExportingReel(false);
    }
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

      {teilnehmer.length === 0 && !isAdmin ? (
        <p className="text-sm opacity-60">Keine Teilnehmer vorhanden.</p>
      ) : (
        <>
          {/* Admin-Hinweis bei Dummy-Daten */}
          {isAdmin && teilnehmer.length === 0 && (
            <div className="mb-4 p-3 rounded-lg text-sm font-medium"
              style={{ background: "#eff6ff", border: "1px solid #93c5fd", color: "#1e40af" }}>
              🛠 Admin-Testmodus: Es sind noch keine echten Teilnehmer vorhanden. Es werden Dummy-Namen für die Vorschau verwendet.
            </div>
          )}
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
              {exporting ? "Video wird erstellt…" : "Video (1:1) herunterladen"}
            </button>

            <button
              onClick={exportReel}
              disabled={exportingReel || spinning}
              className="px-6 py-3 rounded-xl font-bold text-base transition-opacity disabled:opacity-50"
              style={{ background: "var(--color-arena-yellow)", color: "var(--color-arena-blue)" }}
            >
              {exportingReel ? "Reel wird erstellt…" : "🎬 Reel (9:16) erstellen"}
            </button>
          </div>

          {reelError && (
            <div className="mt-3 p-3 rounded-lg text-sm font-medium"
              style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b" }}>
              {reelError}
            </div>
          )}

          <p className="text-xs opacity-50 text-center mt-3">
            Das 1:1-Video (1080×1080) ist für Feeds optimiert, das 9:16-Reel (1080×1920) für Reels, Stories &amp; TikTok – mit Cover, Autor und BuchArena-Branding.
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
