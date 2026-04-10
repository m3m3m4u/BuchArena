"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getStoredAccount } from "@/lib/client-account";

/* ---- FFmpeg UMD loader (bypasses Turbopack bundling) ---- */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
async function getFFmpeg(): Promise<{ FFmpeg: any }> {
  await loadScript("/ffmpeg/ffmpeg.js");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).FFmpegWASM;
}
async function blobURL(url: string, mime: string): Promise<string> {
  const buf = await (await fetch(url)).arrayBuffer();
  return URL.createObjectURL(new Blob([buf], { type: mime }));
}
async function fileToUint8(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

/* ---- Types ---- */
type FormatPreset = "4:5" | "1:1" | "9:16";
type AnimPreset = "none" | "fade" | "slide-left" | "slide-right" | "slide-up" | "slide-down" | "zoom";
type FrameStyle = "none" | "simple" | "double" | "corners" | "elegant" | "vintage"
  | "perlen" | "passepartout" | "gestrichelt" | "eckakzent";
type HId = "tl" | "tr" | "bl" | "br";
type Align = "left" | "center" | "right";

interface TextEl {
  id: string; type: "text";
  x: number; y: number; w: number; h: number;
  content: string;
  font: string; fontSize: number; color: string;
  bold: boolean; italic: boolean; align: Align;
  anim?: AnimPreset;
  animDelay?: number;    // Sekunden bis Start
  animDuration?: number; // Sekunden Dauer
}
interface ImgEl {
  id: string; type: "image";
  x: number; y: number; w: number; h: number;
  src: string; ratio: number;
  anim?: AnimPreset;
  animDelay?: number;
  animDuration?: number;
  imgBorder?: boolean;
  imgBorderColor?: string;
  imgBorderWidth?: number;
  imgShadow?: boolean;
  imgShadowColor?: string;
  imgShadowBlur?: number;
  imgRounded?: number;
}
type CE = TextEl | ImgEl;

const FRAME_PRESETS: { value: FrameStyle; label: string }[] = [
  { value: "none",          label: "Kein Rahmen" },
  { value: "simple",        label: "Einfach" },
  { value: "double",        label: "Doppelt" },
  { value: "corners",       label: "Ecken" },
  { value: "elegant",       label: "Elegant" },
  { value: "vintage",       label: "Vintage" },
  { value: "perlen",        label: "Perlen" },
  { value: "passepartout",  label: "Passepartout" },
  { value: "gestrichelt",   label: "Gestrichelt" },
  { value: "eckakzent",     label: "Eckakzent" },
];

const FONTS = [
  { label: "Georgia",           value: "Georgia" },
  { label: "Arial",             value: "Arial" },
  { label: "Arial Narrow",      value: '"Arial Narrow"' },
  { label: "Arial Black",       value: '"Arial Black"' },
  { label: "Verdana",           value: "Verdana" },
  { label: "Tahoma",            value: "Tahoma" },
  { label: "Trebuchet MS",      value: '"Trebuchet MS"' },
  { label: "Impact",            value: "Impact" },
  { label: "Times New Roman",   value: '"Times New Roman"' },
  { label: "Palatino Linotype", value: '"Palatino Linotype"' },
  { label: "Book Antiqua",      value: '"Book Antiqua"' },
  { label: "Garamond",          value: "Garamond" },
  { label: "Didot",             value: "Didot, 'Bodoni MT', serif" },
  { label: "Courier New",       value: '"Courier New"' },
  { label: "Lucida Console",    value: '"Lucida Console"' },
  { label: "Comic Sans MS",     value: '"Comic Sans MS"' },
  { label: "Brush Script MT",   value: '"Brush Script MT", cursive' },
];

const HIT = 24;

/* ---- Utils ---- */
function uid() { return Math.random().toString(36).slice(2, 10); }
function getSize(f: FormatPreset) {
  if (f === "4:5") return { w: 1080, h: 1350 };
  if (f === "9:16") return { w: 1080, h: 1920 };
  return { w: 1080, h: 1080 };
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string, x: number, y: number,
  maxW: number, lh: number, maxLines = 30,
) {
  if (!text.trim()) return;
  const words = text.split(/\s+/).filter(Boolean);
  let line = "", row = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y + row * lh);
      row++;
      line = word;
      if (row >= maxLines) return;
    } else { line = test; }
  }
  if (row < maxLines && line) ctx.fillText(line, x, y + row * lh);
}

function handlePts(el: CE): { id: HId; x: number; y: number }[] {
  return [
    { id: "tl", x: el.x,        y: el.y        },
    { id: "tr", x: el.x + el.w, y: el.y        },
    { id: "bl", x: el.x,        y: el.y + el.h },
    { id: "br", x: el.x + el.w, y: el.y + el.h },
  ];
}

function hitHandle(mx: number, my: number, el: CE): HId | null {
  for (const h of handlePts(el)) {
    if (Math.abs(mx - h.x) <= HIT && Math.abs(my - h.y) <= HIT) return h.id;
  }
  return null;
}

function hitEl(mx: number, my: number, el: CE) {
  return mx >= el.x && mx <= el.x + el.w && my >= el.y && my <= el.y + el.h;
}

function drawEl(ctx: CanvasRenderingContext2D, el: CE, cache: Map<string, HTMLImageElement>) {
  if (el.type === "image") {
    const img = cache.get(el.src);
    const hasShadow = el.imgShadow;
    const hasBorder = el.imgBorder && (el.imgBorderWidth ?? 2) > 0;
    const radius    = el.imgRounded ?? 0;

    ctx.save();

    // Schatten
    if (hasShadow) {
      ctx.shadowColor   = el.imgShadowColor ?? "rgba(0,0,0,0.45)";
      ctx.shadowBlur    = el.imgShadowBlur ?? 18;
      ctx.shadowOffsetX = Math.round((el.imgShadowBlur ?? 18) * 0.2);
      ctx.shadowOffsetY = Math.round((el.imgShadowBlur ?? 18) * 0.25);
      // Zeichne nur einen gefüllten Rect für Schatten, dann Shadow aus
      if (radius > 0) {
        roundRectPath(ctx, el.x, el.y, el.w, el.h, radius);
        ctx.fill();
      } else {
        ctx.fillRect(el.x, el.y, el.w, el.h);
      }
      ctx.shadowColor = "transparent";
    }

    // Clip für abgerundete Ecken
    if (radius > 0) {
      ctx.beginPath();
      roundRectPath(ctx, el.x, el.y, el.w, el.h, radius);
      ctx.clip();
    }

    if (img) {
      ctx.drawImage(img, el.x, el.y, el.w, el.h);
    } else {
      ctx.fillStyle = "#dde3ea";
      ctx.fillRect(el.x, el.y, el.w, el.h);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "36px Arial";
      ctx.textAlign = "center";
      ctx.fillText("Bild laedt...", el.x + el.w / 2, el.y + el.h / 2);
    }

    ctx.restore();

    // Rahmen
    if (hasBorder) {
      const bw = el.imgBorderWidth ?? 2;
      ctx.save();
      ctx.strokeStyle = el.imgBorderColor ?? "#1a1a1a";
      ctx.lineWidth   = bw;
      if (radius > 0) {
        roundRectPath(ctx, el.x, el.y, el.w, el.h, radius);
        ctx.stroke();
      } else {
        ctx.strokeRect(el.x, el.y, el.w, el.h);
      }
      ctx.restore();
    }
  } else {
    ctx.save();
    ctx.font = `${el.italic ? "italic " : ""}${el.bold ? "bold " : ""}${el.fontSize}px ${el.font}`;
    ctx.fillStyle = el.color;
    ctx.textAlign = el.align;
    const tx =
      el.align === "center" ? el.x + el.w / 2
      : el.align === "right"  ? el.x + el.w
      : el.x;
    wrapText(ctx, el.content, tx, el.y + el.fontSize, el.w, el.fontSize * 1.35);
    ctx.restore();
  }
}

/** drawEl mit Animation: t = aktueller Zeitpunkt (Sekunden), dur = Videolänge */
function drawElAnimated(
  ctx: CanvasRenderingContext2D,
  el: CE,
  cache: Map<string, HTMLImageElement>,
  t: number,
) {
  const delay    = el.animDelay ?? 0;
  const anim     = el.anim ?? "none";
  const ANIM_DUR = el.animDuration ?? 0.5;
  const tRel     = Math.max(0, t - delay);
  const progress = anim === "none" ? 1 : Math.min(1, tRel / ANIM_DUR);

  if (progress <= 0) return; // noch nicht sichtbar

  ctx.save();
  ctx.globalAlpha = anim === "fade" ? progress : 1;

  if (anim === "slide-left" || anim === "slide-right" || anim === "slide-up" || anim === "slide-down") {
    const ease = 1 - Math.pow(1 - progress, 3);
    const dist = 200 * (1 - ease);
    if (anim === "slide-left")  ctx.translate(-dist, 0);
    if (anim === "slide-right") ctx.translate(dist, 0);
    if (anim === "slide-up")    ctx.translate(0, -dist);
    if (anim === "slide-down")  ctx.translate(0, dist);
  }
  if (anim === "zoom") {
    const ease  = 1 - Math.pow(1 - progress, 3);
    const scale = 0.5 + 0.5 * ease;
    const cx = el.x + el.w / 2;
    const cy = el.y + el.h / 2;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
  }

  drawEl(ctx, el, cache);
  ctx.restore();
}

function drawSel(ctx: CanvasRenderingContext2D, el: CE) {
  ctx.save();
  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 4;
  ctx.setLineDash([14, 7]);
  ctx.strokeRect(el.x - 4, el.y - 4, el.w + 8, el.h + 8);
  ctx.setLineDash([]);
  for (const h of handlePts(el)) {
    ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(h.x - 13, h.y - 13, 26, 26);
    ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

/* ---- Frame drawing ---- */
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  style: FrameStyle,
  cw: number, ch: number,
  color: string,
  thick: number, // 1–10 Benutzerwert
  inset: number = 0, // 0–20 Abstand vom Rand
) {
  if (style === "none") return;
  // thick 1..10 → Pixelstärke relativ zur Canvas-Breite
  const t = Math.round((thick / 10) * cw * 0.042 + 1);
  // inset 0..20 → Pixel-Abstand vom Bildrand
  const insetPx = Math.round((inset / 20) * Math.min(cw, ch) * 0.08);
  ctx.save();
  if (insetPx > 0) {
    ctx.translate(insetPx, insetPx);
    cw = cw - insetPx * 2;
    ch = ch - insetPx * 2;
  }
  ctx.strokeStyle = color;
  ctx.fillStyle   = color;

  if (style === "simple") {
    ctx.lineWidth = t;
    ctx.strokeRect(t / 2, t / 2, cw - t, ch - t);
  } else if (style === "double") {
    const lw  = Math.max(2, Math.round(t * 0.35));
    const gap = Math.round(t * 0.55);
    ctx.lineWidth = lw;
    ctx.strokeRect(lw / 2, lw / 2, cw - lw, ch - lw);
    const i = lw + gap;
    ctx.strokeRect(i, i, cw - i * 2, ch - i * 2);
  } else if (style === "corners") {
    const arm = Math.round(Math.min(cw, ch) * 0.10);
    const lw  = Math.max(2, Math.round(t * 0.8));
    const pad = Math.round(t * 0.9);
    ctx.lineWidth = lw;
    ctx.lineCap   = "square";
    const corners: [number, number, number, number, number, number][] = [
      [pad,      pad,      pad + arm, pad,      pad,      pad + arm],
      [cw - pad, pad,      cw - pad - arm, pad, cw - pad, pad + arm],
      [pad,      ch - pad, pad + arm, ch - pad, pad,      ch - pad - arm],
      [cw - pad, ch - pad, cw - pad - arm, ch - pad, cw - pad, ch - pad - arm],
    ];
    for (const [ax, ay, bx, by, cx2, cy2] of corners) {
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(ax, ay);
      ctx.lineTo(cx2, cy2);
      ctx.stroke();
    }
  } else if (style === "elegant") {
    // 3 Linien: außen dünn, mittig dick, innen dünn
    // Ecken: kleines gefülltes Kreischen auf der mittleren Linie
    const p1 = Math.round(t * 0.3);
    const p2 = Math.round(t * 0.78);
    const p3 = Math.round(t * 1.28);
    const lw1 = Math.max(1, Math.round(t * 0.12));
    const lw2 = Math.max(2, Math.round(t * 0.38));
    const lw3 = Math.max(1, Math.round(t * 0.12));

    ctx.lineWidth = lw1;
    ctx.strokeRect(p1, p1, cw - p1 * 2, ch - p1 * 2);
    ctx.lineWidth = lw2;
    ctx.strokeRect(p2, p2, cw - p2 * 2, ch - p2 * 2);
    ctx.lineWidth = lw3;
    ctx.strokeRect(p3, p3, cw - p3 * 2, ch - p3 * 2);

    // Kleine gefüllte Kreise genau auf der mittleren Linie an den 4 Ecken
    const cr = Math.max(3, Math.round(t * 0.32));
    const ePts: [number, number][] = [
      [p2, p2], [cw - p2, p2], [p2, ch - p2], [cw - p2, ch - p2],
    ];
    // Weißer Hintergrundkreis, damit die mittlere Linie "unterbrochen" wirkt
    for (const [px, py] of ePts) {
      ctx.save();
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(px, py, cr + lw2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (const [px, py] of ePts) {
      ctx.beginPath();
      ctx.arc(px, py, cr, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (style === "vintage") {
    // Abgeschrägte Ecken (Chamfer) – klassischer antiker Druckrahmen.
    // Zwei parallele Linien, beide mit 45°-Schnitt an den Ecken (Oktagonform).
    // Dazwischen: 4 diagonale Verbindungsstriche in den Ecken.
    const p1    = Math.round(t * 0.28);  // äußere Linie (Abstand zum Rand)
    const p2    = Math.round(t * 1.05);  // innere Linie
    const lw1   = Math.max(2, Math.round(t * 0.32)); // äußere Linie dick
    const lw2   = Math.max(1, Math.round(t * 0.13)); // innere Linie dünn
    const cut   = Math.round(t * 0.75); // Größe des 45°-Schnitts

    // Hilfsfunktion: Rechteck mit abgeschrägten Ecken als Pfad zeichnen
    function chamferRect(pad: number, cutSize: number) {
      const x = pad, y = pad, w = cw - pad * 2, h = ch - pad * 2;
      ctx.beginPath();
      ctx.moveTo(x + cutSize, y);
      ctx.lineTo(x + w - cutSize, y);
      ctx.lineTo(x + w, y + cutSize);
      ctx.lineTo(x + w, y + h - cutSize);
      ctx.lineTo(x + w - cutSize, y + h);
      ctx.lineTo(x + cutSize, y + h);
      ctx.lineTo(x, y + h - cutSize);
      ctx.lineTo(x, y + cutSize);
      ctx.closePath();
    }

    ctx.lineWidth = lw1;
    chamferRect(p1, cut);
    ctx.stroke();

    ctx.lineWidth = lw2;
    chamferRect(p2, Math.max(2, Math.round(cut * 0.3)));
    ctx.stroke();

    // Diagonale Verbindungslinien in den 4 Ecken zwischen beiden Rahmenlinien
    ctx.lineWidth = lw2;
    type DiagLine = [number, number, number, number];
    const diagLines: DiagLine[] = [
      [p1,      p1 + cut,  p2,      p2 + Math.max(2, Math.round(cut * 0.3))],      // links-oben (vertikal)
      [p1 + cut, p1,       p2 + Math.max(2, Math.round(cut * 0.3)), p2],            // oben-links (horizontal)
      [cw - p1,      p1 + cut,  cw - p2,      p2 + Math.max(2, Math.round(cut * 0.3))],
      [cw - p1 - cut, p1,       cw - p2 - Math.max(2, Math.round(cut * 0.3)), p2],
      [p1,      ch - p1 - cut,  p2,      ch - p2 - Math.max(2, Math.round(cut * 0.3))],
      [p1 + cut, ch - p1,       p2 + Math.max(2, Math.round(cut * 0.3)), ch - p2],
      [cw - p1,      ch - p1 - cut,  cw - p2,      ch - p2 - Math.max(2, Math.round(cut * 0.3))],
      [cw - p1 - cut, ch - p1,       cw - p2 - Math.max(2, Math.round(cut * 0.3)), ch - p2],
    ];
    for (const [x1, y1, x2, y2] of diagLines) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  } else if (style === "perlen") {
    // Perlen: gleichmäßige gefüllte Kreise ganz am Rand entlang
    const r     = Math.max(3, Math.round(t * 0.28));
    const pad   = r; // Kreismittelpunkt = r vom Rand → Außenkante berührt Rand
    const step  = r * 3.0;
    const perim = 2 * (cw - pad * 2) + 2 * (ch - pad * 2);
    const count = Math.max(8, Math.round(perim / step));
    const stepP = perim / count;
    for (let i = 0; i < count; i++) {
      const d = i * stepP;
      const w2 = cw - pad * 2, h2 = ch - pad * 2;
      let px = 0, py = 0;
      if      (d < w2)          { px = pad + d;          py = pad; }
      else if (d < w2 + h2)     { px = pad + w2;         py = pad + (d - w2); }
      else if (d < 2 * w2 + h2) { px = pad + w2 - (d - w2 - h2); py = pad + h2; }
      else                      { px = pad;               py = pad + h2 - (d - 2 * w2 - h2); }
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

  } else if (style === "passepartout") {
    // Passepartout: breiter gefüllter Rand + feine Innenlinie
    const bw  = Math.round(t * 1.5);
    const gap = Math.round(t * 0.28);
    const lw  = Math.max(1, Math.round(t * 0.12));
    ctx.fillRect(0, 0, cw, bw);
    ctx.fillRect(0, ch - bw, cw, bw);
    ctx.fillRect(0, bw, bw, ch - bw * 2);
    ctx.fillRect(cw - bw, bw, bw, ch - bw * 2);
    ctx.lineWidth = lw;
    const ip = bw + gap;
    ctx.strokeRect(ip, ip, cw - ip * 2, ch - ip * 2);

  } else if (style === "gestrichelt") {
    // Gestrichelt abgerundet – Linienaußenkante beginnt am Rand
    const lw      = Math.max(2, Math.round(t * 0.32));
    const pad     = lw / 2; // Außenkante der Linie = Bildrand
    const r       = Math.round(t * 1.2);
    const dashLen = Math.max(4, Math.round(t * 0.55));
    const dashGap = Math.max(3, Math.round(t * 0.38));
    ctx.lineWidth = lw;
    ctx.setLineDash([dashLen, dashGap]);
    ctx.lineCap = "round";
    roundRectPath(ctx, pad, pad, cw - pad * 2, ch - pad * 2, r);
    ctx.stroke();
    ctx.setLineDash([]);

  } else if (style === "eckakzent") {
    // Eckakzent: Linie + gefüllte Dreiecke in den 4 Ecken, direkt am Rand
    const lw   = Math.max(1, Math.round(t * 0.14));
    const p1   = lw / 2; // Linienaußenkante = Bildrand
    const size = Math.round(t * 1.4);
    ctx.lineWidth = lw;
    ctx.strokeRect(p1, p1, cw - p1 * 2, ch - p1 * 2);
    const triCorners: Array<[number, number, number, number, number, number]> = [
      [0,  0,  size, 0,  0,  size],
      [cw, 0,  cw - size, 0,  cw, size],
      [0,  ch, size, ch, 0,  ch - size],
      [cw, ch, cw - size, ch, cw, ch - size],
    ];
    for (const [ax, ay, bx, by, cx3, cy3] of triCorners) {
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.lineTo(cx3, cy3);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.restore();
}

const CURSOR_MAP: Record<HId, string> = {
  tl: "nw-resize", tr: "ne-resize", bl: "sw-resize", br: "se-resize",
};

/* ---- Component ---- */
export default function BeitragToolPage() {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const wrapRef     = useRef<HTMLDivElement>(null);
  const editAreaRef = useRef<HTMLTextAreaElement>(null);
  const imgCache    = useRef(new Map<string, HTMLImageElement>());
  const dragRef     = useRef<{
    mode: "move" | "resize"; id: string; handle?: HId;
    mx0: number; my0: number; x0: number; y0: number; w0: number; h0: number;
  } | null>(null);

  const [format,    setFormat]    = useState<FormatPreset>("4:5");
  const [bgColor,   setBgColor]   = useState("#ffffff");
  const [elements,  setElements]  = useState<CE[]>([]);
  const [selId,     setSelId]     = useState<string | null>(null);
  const [cursor,    setCursor]    = useState("default");
  const [tick,      setTick]      = useState(0);
  const [editingId,     setEditingId]     = useState<string | null>(null);
  const [editText,      setEditText]      = useState("");
  const [showTemplates, setShowTemplates]  = useState(false);
  const [tplPage,       setTplPage]        = useState(0);
  const [templates,     setTemplates]      = useState<{ id: string; label: string; src: string }[]>([]);
  const [loadingTpl,    setLoadingTpl]     = useState(false);
  const [showSaveAs,    setShowSaveAs]     = useState(false);
  const [showOpen,      setShowOpen]       = useState(false);
  const [showInfo,      setShowInfo]       = useState(false);
  const [fullscreen,    setFullscreen]     = useState(false);
  const [showAnimPanel, setShowAnimPanel]  = useState(false);
  const [confirmDelete, setConfirmDelete]  = useState<string | null>(null);
  const [savedDesigns,  setSavedDesigns]   = useState<{ id: string; name: string; data: string; updatedAt?: string; username?: string }[]>([]);
  const [loadingDesigns, setLoadingDesigns] = useState(false);
  const [saveNameInput, setSaveNameInput]  = useState("");
  const [savingState,   setSavingState]    = useState<"idle" | "saving" | "saved">("idle");
  const [currentDesignName, setCurrentDesignName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAllDesigns, setShowAllDesigns] = useState(false);

  /* Frame */
  const [frameStyle,     setFrameStyle]     = useState<FrameStyle>("none");
  const [frameColor,     setFrameColor]     = useState("#1a1a1a");
  const [frameThickness, setFrameThickness] = useState(5);
  const [frameInset,     setFrameInset]     = useState(0);

  /* Video mode */
  const [editorMode,    setEditorMode]    = useState<"bild" | "video">("bild");
  const [videoDuration, setVideoDuration] = useState(10); // Sekunden
  const [musikTracks,   setMusikTracks]   = useState<{ id: string; title: string; style: string; fileUrl: string }[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [loadingMusik,  setLoadingMusik]  = useState(false);
  const [musikFadeIn,    setMusikFadeIn]    = useState(true);
  const [musikFadeInDur, setMusikFadeInDur]  = useState(2); // Sekunden
  const [musikFadeOut,   setMusikFadeOut]   = useState(true);
  const [musikFadeOutDur, setMusikFadeOutDur] = useState(2); // Sekunden
  const [showGridCrop,  setShowGridCrop]  = useState(false);
  const [exporting,     setExporting]     = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportPhase,    setExportPhase]    = useState<"record" | "convert">("record");
  const rafRef = useRef<number | null>(null);
  const lastTapRef = useRef(0);
  const [previewing,    setPreviewing]    = useState(false);
  const previewTRef    = useRef(0);
  const previewRafRef  = useRef<number | null>(null);

  const sz      = useMemo(() => getSize(format), [format]);
  const selEl   = useMemo(() => elements.find((e) => e.id === selId) ?? null, [elements, selId]);
  const textEl  = selEl?.type === "text" ? (selEl as TextEl) : null;

  // Close anim panel when selection changes
  useEffect(() => { if (!selId) setShowAnimPanel(false); }, [selId]);

  // Block body scroll in fullscreen
  useEffect(() => {
    if (fullscreen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [fullscreen]);

  // Detect admin role
  useEffect(() => {
    const acc = getStoredAccount();
    if (acc && (acc.role === "ADMIN" || acc.role === "SUPERADMIN")) setIsAdmin(true);
  }, []);

  /* preload images */
  useEffect(() => {
    const srcs = elements.filter((e) => e.type === "image").map((e) => (e as ImgEl).src);
    let changed = false;
    Promise.all(srcs.map(async (src) => {
      if (!imgCache.current.has(src)) {
        const img = await loadImg(src).catch(() => null);
        if (img) { imgCache.current.set(src, img); changed = true; }
      }
    })).then(() => { if (changed) setTick((t) => t + 1); });
  }, [elements]);

  /* render canvas */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (canvas.width !== sz.w || canvas.height !== sz.h) {
      canvas.width = sz.w; canvas.height = sz.h;
    }
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, sz.w, sz.h);
    for (const el of elements) {
      if (el.id === editingId && el.type === "text") continue;
      if (previewing) drawElAnimated(ctx, el, imgCache.current, previewTRef.current);
      else drawEl(ctx, el, imgCache.current);
    }
    drawFrame(ctx, frameStyle, sz.w, sz.h, frameColor, frameThickness, frameInset);
    if (selEl && selEl.id !== editingId) drawSel(ctx, selEl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, selId, sz, bgColor, tick, selEl, editingId, previewing, frameStyle, frameColor, frameThickness, frameInset]);

  /* focus textarea when edit starts */
  useEffect(() => {
    if (editingId) editAreaRef.current?.focus();
  }, [editingId]);

  // Musik-Vorschau: AudioContext und BufferSource als Ref
  const previewAudioCtx = useRef<AudioContext | null>(null);
  const previewAudioSrc = useRef<AudioBufferSourceNode | null>(null);
  const previewGain = useRef<GainNode | null>(null);

  /* Preview RAF loop + Musik */
  useEffect(() => {
    let stopAudio = () => {};
    if (!previewing) {
      // Stoppe ggf. laufende Musik
      if (previewAudioSrc.current) { try { previewAudioSrc.current.stop(); } catch {} previewAudioSrc.current = null; }
      if (previewAudioCtx.current) { if (previewAudioCtx.current.state !== "closed") previewAudioCtx.current.close().catch(() => {}); previewAudioCtx.current = null; }
      previewGain.current = null;
      return;
    }

    // Musik abspielen, falls Track gewählt
    const fadeIn = musikFadeIn;
    const fadeInDur = musikFadeInDur;
    const fadeOut = musikFadeOut;
    const fadeOutDur = musikFadeOutDur;
    let cancelled = false;
    if (selectedTrackId && musikTracks.length > 0) {
      const track = musikTracks.find((t) => t.id === selectedTrackId);
      if (track) {
        (async () => {
          try {
            const ctx = new AudioContext();
            await ctx.resume();
            const resp = await fetch(track.fileUrl);
            const buf = await resp.arrayBuffer();
            // Vorschau wurde bereits beendet, bevor Audio fertig geladen war
            if (cancelled) { ctx.close().catch(() => {}); return; }
            const audio = await ctx.decodeAudioData(buf);
            if (cancelled) { ctx.close().catch(() => {}); return; }
            const src = ctx.createBufferSource();
            src.buffer = audio;
            const gain = ctx.createGain();
            previewGain.current = gain;
            src.connect(gain).connect(ctx.destination);
            previewAudioCtx.current = ctx;
            previewAudioSrc.current = src;
            // Fade-In
            if (fadeIn) {
              gain.gain.setValueAtTime(0, ctx.currentTime);
              gain.gain.linearRampToValueAtTime(1, ctx.currentTime + fadeInDur);
            } else {
              gain.gain.setValueAtTime(1, ctx.currentTime);
            }
            src.start(ctx.currentTime);
            // Stoppe Audio nach Vorschau
            let stopped = false;
            stopAudio = () => {
              if (stopped) return;
              stopped = true;
              previewAudioSrc.current = null;
              previewAudioCtx.current = null;
              previewGain.current = null;
              const closeCtx = () => { if (ctx.state !== "closed") ctx.close().catch(() => {}); };
              if (fadeOut) {
                gain.gain.cancelScheduledValues(ctx.currentTime);
                gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeOutDur);
                setTimeout(() => { try { src.stop(); } catch {} closeCtx(); }, fadeOutDur * 1000);
              } else {
                try { src.stop(); } catch {}
                closeCtx();
              }
            };
          } catch {
            // Fehler ignorieren
          }
        })();
      }
    }

    const start = performance.now();
    function loop(now: number) {
      previewTRef.current = (now - start) / 1000;
      setTick((t) => t + 1);
      // Fade-Out rechtzeitig starten
      if (previewAudioCtx.current && previewGain.current && fadeOut && videoDuration - previewTRef.current <= fadeOutDur && previewGain.current.gain.value > 0.01) {
        previewGain.current.gain.cancelScheduledValues(previewAudioCtx.current.currentTime);
        previewGain.current.gain.setValueAtTime(previewGain.current.gain.value, previewAudioCtx.current.currentTime);
        previewGain.current.gain.linearRampToValueAtTime(0, previewAudioCtx.current.currentTime + (videoDuration - previewTRef.current));
      }
      if (previewTRef.current < videoDuration) {
        previewRafRef.current = requestAnimationFrame(loop);
      } else {
        previewTRef.current = 0;
        setPreviewing(false);
        stopAudio();
      }
    }
    previewRafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      if (previewRafRef.current) cancelAnimationFrame(previewRafRef.current);
      stopAudio();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewing, videoDuration, selectedTrackId, musikTracks, musikFadeIn, musikFadeInDur, musikFadeOut, musikFadeOutDur]);

  /* Show info on first visit */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("beitrag-tool-info-seen")) {
      setShowInfo(true);
      localStorage.setItem("beitrag-tool-info-seen", "1");
    }
  }, []);

  /* Load gallery templates when overlay opens */
  useEffect(() => {
    if (!showTemplates || templates.length > 0) return;
    setLoadingTpl(true);
    fetch("/api/social-media/gallery")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setTemplates(data); })
      .catch(() => {})
      .finally(() => setLoadingTpl(false));
  }, [showTemplates, templates.length]);

  /* Load musik tracks when switching to video mode */
  useEffect(() => {
    if (editorMode !== "video" || musikTracks.length > 0) return;
    setLoadingMusik(true);
    fetch("/api/musik")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.tracks)) setMusikTracks(d.tracks); })
      .catch(() => {})
      .finally(() => setLoadingMusik(false));
  }, [editorMode, musikTracks.length]);

  /* Fetch designs when open overlay opens */
  useEffect(() => {
    if (!showOpen) return;
    setLoadingDesigns(true);
    const url = showAllDesigns && isAdmin ? "/api/social-media/designs?all=1" : "/api/social-media/designs";
    fetch(url)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setSavedDesigns(data); })
      .catch(() => {})
      .finally(() => setLoadingDesigns(false));
  }, [showOpen, showAllDesigns, isAdmin]);

  /* Delete/Backspace key removes selected element */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (editingId) return;
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (!selId) return;
      e.preventDefault();
      setElements((p) => p.filter((el) => el.id !== selId));
      setSelId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selId, editingId]);

  /* coordinate helper */
  function toCanvasXY(clientX: number, clientY: number) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    const s = sz.w / c.offsetWidth;
    return { mx: (clientX - r.left) * s, my: (clientY - r.top) * s };
  }
  function toCanvas(e: React.MouseEvent<HTMLCanvasElement>) {
    return toCanvasXY(e.clientX, e.clientY);
  }

  /* commit inline text edit */
  function commitEdit() {
    if (!editingId) return;
    setElements((p) => p.map((e) =>
      e.id === editingId && e.type === "text" ? { ...e, content: editText } as CE : e
    ));
    setEditingId(null);
  }

  /* mouse: down */
  function onDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (editingId) return;
    const { mx, my } = toCanvas(e);

    if (selEl) {
      const h = hitHandle(mx, my, selEl);
      if (h) {
        dragRef.current = {
          mode: "resize", id: selEl.id, handle: h,
          mx0: mx, my0: my,
          x0: selEl.x, y0: selEl.y, w0: selEl.w, h0: selEl.h,
        };
        return;
      }
    }

    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (hitEl(mx, my, el)) {
        setSelId(el.id);
        dragRef.current = {
          mode: "move", id: el.id,
          mx0: mx, my0: my,
          x0: el.x, y0: el.y, w0: el.w, h0: el.h,
        };
        return;
      }
    }
    setSelId(null);
  }

  /* double-click -> enter text edit */
  function onDblClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const { mx, my } = toCanvas(e);
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.type === "text" && hitEl(mx, my, el)) {
        setSelId(el.id);
        setEditingId(el.id);
        setEditText(el.content);
        return;
      }
    }
  }

  /* mouse: move */
  function onMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (editingId) return;
    const { mx, my } = toCanvas(e);
    const d = dragRef.current;

    if (d) {
      const dx = mx - d.mx0, dy = my - d.my0;
      const MIN = 30;
      setElements((prev) => prev.map((el) => {
        if (el.id !== d.id) return el;
        if (d.mode === "move") return { ...el, x: d.x0 + dx, y: d.y0 + dy };

        let { x, y, w, h } = el;

        if (el.type === "image") {
          /* proportional resize for images */
          const ratio = (el as ImgEl).ratio || 1;
          switch (d.handle) {
            case "br": w = Math.max(MIN, d.w0 + dx);  h = w / ratio; x = d.x0; y = d.y0; break;
            case "bl": w = Math.max(MIN, d.w0 - dx);  h = w / ratio; x = d.x0 + d.w0 - w; y = d.y0; break;
            case "tr": w = Math.max(MIN, d.w0 + dx);  h = w / ratio; x = d.x0; y = d.y0 + d.h0 - h; break;
            case "tl": w = Math.max(MIN, d.w0 - dx);  h = w / ratio; x = d.x0 + d.w0 - w; y = d.y0 + d.h0 - h; break;
          }
        } else {
          /* free resize for text boxes */
          switch (d.handle) {
            case "tl":
              x = Math.min(d.x0 + dx, d.x0 + d.w0 - MIN);
              y = Math.min(d.y0 + dy, d.y0 + d.h0 - MIN);
              w = d.w0 - (x - d.x0); h = d.h0 - (y - d.y0); break;
            case "tr":
              y = Math.min(d.y0 + dy, d.y0 + d.h0 - MIN);
              w = Math.max(MIN, d.w0 + dx); h = d.h0 - (y - d.y0); x = d.x0; break;
            case "bl":
              x = Math.min(d.x0 + dx, d.x0 + d.w0 - MIN);
              w = d.w0 - (x - d.x0); h = Math.max(MIN, d.h0 + dy); y = d.y0; break;
            case "br":
              w = Math.max(MIN, d.w0 + dx); h = Math.max(MIN, d.h0 + dy); x = d.x0; y = d.y0; break;
          }
        }
        return { ...el, x, y, w, h };
      }));
      return;
    }

    /* cursor hint */
    if (selEl) {
      const h = hitHandle(mx, my, selEl);
      if (h) { setCursor(CURSOR_MAP[h]); return; }
      if (hitEl(mx, my, selEl)) { setCursor("move"); return; }
    }
    for (let i = elements.length - 1; i >= 0; i--) {
      if (hitEl(mx, my, elements[i])) { setCursor("move"); return; }
    }
    setCursor("default");
  }

  function onUp() { dragRef.current = null; }

  /* touch handlers for mobile */
  function onTouchDown(e: React.TouchEvent<HTMLCanvasElement>) {
    if (editingId || e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    const { mx, my } = toCanvasXY(touch.clientX, touch.clientY);

    // double-tap → text edit
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        if (el.type === "text" && hitEl(mx, my, el)) {
          setSelId(el.id);
          setEditingId(el.id);
          setEditText(el.content);
          lastTapRef.current = 0;
          return;
        }
      }
    }
    lastTapRef.current = now;

    if (selEl) {
      const h = hitHandle(mx, my, selEl);
      if (h) {
        dragRef.current = {
          mode: "resize", id: selEl.id, handle: h,
          mx0: mx, my0: my,
          x0: selEl.x, y0: selEl.y, w0: selEl.w, h0: selEl.h,
        };
        return;
      }
    }
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (hitEl(mx, my, el)) {
        setSelId(el.id);
        dragRef.current = {
          mode: "move", id: el.id,
          mx0: mx, my0: my,
          x0: el.x, y0: el.y, w0: el.w, h0: el.h,
        };
        return;
      }
    }
    setSelId(null);
  }

  function onTouchMoveCanvas(e: React.TouchEvent<HTMLCanvasElement>) {
    if (editingId || e.touches.length !== 1) return;
    const d = dragRef.current;
    if (!d) return;
    e.preventDefault();
    const touch = e.touches[0];
    const { mx, my } = toCanvasXY(touch.clientX, touch.clientY);
    const dx = mx - d.mx0, dy = my - d.my0;
    const MIN = 30;
    setElements((prev) => prev.map((el) => {
      if (el.id !== d.id) return el;
      if (d.mode === "move") return { ...el, x: d.x0 + dx, y: d.y0 + dy };
      let { x, y, w, h } = el;
      if (el.type === "image") {
        const ratio = (el as ImgEl).ratio || 1;
        switch (d.handle) {
          case "br": w = Math.max(MIN, d.w0 + dx); h = w / ratio; x = d.x0; y = d.y0; break;
          case "bl": w = Math.max(MIN, d.w0 - dx); h = w / ratio; x = d.x0 + d.w0 - w; y = d.y0; break;
          case "tr": w = Math.max(MIN, d.w0 + dx); h = w / ratio; x = d.x0; y = d.y0 + d.h0 - h; break;
          case "tl": w = Math.max(MIN, d.w0 - dx); h = w / ratio; x = d.x0 + d.w0 - w; y = d.y0 + d.h0 - h; break;
        }
      } else {
        switch (d.handle) {
          case "tl": x = Math.min(d.x0 + dx, d.x0 + d.w0 - MIN); y = Math.min(d.y0 + dy, d.y0 + d.h0 - MIN); w = d.w0 - (x - d.x0); h = d.h0 - (y - d.y0); break;
          case "tr": y = Math.min(d.y0 + dy, d.y0 + d.h0 - MIN); w = Math.max(MIN, d.w0 + dx); h = d.h0 - (y - d.y0); x = d.x0; break;
          case "bl": x = Math.min(d.x0 + dx, d.x0 + d.w0 - MIN); w = d.w0 - (x - d.x0); h = Math.max(MIN, d.h0 + dy); y = d.y0; break;
          case "br": w = Math.max(MIN, d.w0 + dx); h = Math.max(MIN, d.h0 + dy); x = d.x0; y = d.y0; break;
        }
      }
      return { ...el, x, y, w, h };
    }));
  }

  function onTouchUp() { dragRef.current = null; }

  /* add elements */
  function addText() {
    const el: TextEl = {
      id: uid(), type: "text",
      x: 80, y: 80, w: 920, h: 200,
      content: "Dein Text hier",
      font: "Georgia", fontSize: 72, color: "#1a1a1a",
      bold: false, italic: false, align: "center",
    };
    setElements((p) => [...p, el]);
    setSelId(el.id);
  }

  async function addTplImage(src: string) {
    let imgW = Math.round(sz.w * 0.7), imgH = Math.round(sz.h * 0.45), ratio = imgW / imgH;
    try {
      const img = await loadImg(src);
      imgCache.current.set(src, img);
      ratio = img.naturalWidth / img.naturalHeight;
      imgW  = Math.round(sz.w * 0.7);
      imgH  = Math.round(imgW / ratio);
      setTick((t) => t + 1);
    } catch { /* keep fallback */ }
    const el: ImgEl = {
      id: uid(), type: "image",
      x: Math.round((sz.w - imgW) / 2), y: 60,
      w: imgW, h: imgH, src, ratio,
    };
    setElements((p) => [...p, el]);
    setSelId(el.id);
  }

  async function addUserImage(file: File) {
    try {
      const dataUrl = await fileToDataUrl(file);
      const img     = await loadImg(dataUrl);
      imgCache.current.set(dataUrl, img);
      const ratio = img.naturalWidth / img.naturalHeight;
      const imgW  = Math.round(sz.w * 0.55);
      const imgH  = Math.round(imgW / ratio);
      const el: ImgEl = {
        id: uid(), type: "image",
        x: Math.round((sz.w - imgW) / 2), y: 60,
        w: imgW, h: imgH, src: dataUrl, ratio,
      };
      setElements((p) => [...p, el]);
      setSelId(el.id);
      setTick((t) => t + 1);
    } catch { /* ignore */ }
  }

  function del() {
    if (!selId) return;
    if (editingId === selId) setEditingId(null);
    setElements((p) => p.filter((e) => e.id !== selId));
    setSelId(null);
  }

  /* load saved designs from API */
  useEffect(() => {
    fetch("/api/social-media/designs")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setSavedDesigns(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  async function saveDesign(name: string) {
    const snapshot = JSON.stringify({
      format, bgColor, elements,
      editorMode, videoDuration,
      selectedTrackId,
      musikFadeIn, musikFadeInDur,
      musikFadeOut, musikFadeOutDur,
      frameStyle, frameColor, frameThickness, frameInset,
    });
    setSavingState("saving");
    try {
      const res = await fetch("/api/social-media/designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, data: snapshot }),
      });
      if (res.ok) {
        const saved = await res.json();
        setSavedDesigns((prev) => {
          const filtered = prev.filter((d) => d.name !== name);
          return [{ id: saved.id, name, data: snapshot }, ...filtered];
        });
        setSavingState("saved");
        setTimeout(() => setSavingState("idle"), 2000);
      }
    } catch { setSavingState("idle"); }
  }

  function loadDesign(data: string, name?: string) {
    try {
      const s = JSON.parse(data) as {
        format: FormatPreset; bgColor: string; elements: CE[];
        editorMode?: "bild" | "video"; videoDuration?: number;
        selectedTrackId?: string | null;
        musikFadeIn?: boolean; musikFadeInDur?: number;
        musikFadeOut?: boolean; musikFadeOutDur?: number;
        frameStyle?: FrameStyle; frameColor?: string; frameThickness?: number;
        frameInset?: number;
      };
      setFormat(s.format ?? "4:5");
      setBgColor(s.bgColor ?? "#ffffff");
      setElements(s.elements ?? []);
      if (s.editorMode) setEditorMode(s.editorMode);
      if (s.videoDuration != null) setVideoDuration(s.videoDuration);
      if (s.selectedTrackId !== undefined) setSelectedTrackId(s.selectedTrackId ?? null);
      if (s.musikFadeIn != null) setMusikFadeIn(s.musikFadeIn);
      if (s.musikFadeInDur != null) setMusikFadeInDur(s.musikFadeInDur);
      if (s.musikFadeOut != null) setMusikFadeOut(s.musikFadeOut);
      if (s.musikFadeOutDur != null) setMusikFadeOutDur(s.musikFadeOutDur);
      if (s.frameStyle) setFrameStyle(s.frameStyle);
      if (s.frameColor) setFrameColor(s.frameColor);
      if (s.frameThickness != null) setFrameThickness(s.frameThickness);
      if (s.frameInset != null) setFrameInset(s.frameInset);
      setSelId(null);
      setEditingId(null);
      setCurrentDesignName(name ?? null);
      setSaveNameInput(name ?? "");
      setTick((t) => t + 1);
    } catch { /* ignore */ }
  }

  async function deleteDesign(name: string) {
    setSavedDesigns((prev) => prev.filter((d) => d.name !== name));
    await fetch(`/api/social-media/designs?name=${encodeURIComponent(name)}`, { method: "DELETE" });
  }

  function exportDesign() {
    if (editingId) commitEdit();
    const snapshot = JSON.stringify({
      format, bgColor, elements,
      editorMode, videoDuration,
      selectedTrackId,
      musikFadeIn, musikFadeInDur,
      musikFadeOut, musikFadeOutDur,
      frameStyle, frameColor, frameThickness, frameInset,
    }, null, 2);
    const blob = new Blob([snapshot], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "beitrag.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importDesign(file: File) {
    try {
      const text = await file.text();
      loadDesign(text);
    } catch { /* ignore */ }
  }

  function layer(dir: "up" | "down") {
    setElements((p) => {
      const i = p.findIndex((e) => e.id === selId);
      if (i === -1) return p;
      const j = dir === "up" ? i + 1 : i - 1;
      if (j < 0 || j >= p.length) return p;
      const n = [...p]; [n[i], n[j]] = [n[j], n[i]]; return n;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function upd(patch: Record<string, any>) {
    setElements((p) => p.map((e) => e.id === selId ? { ...e, ...patch } as CE : e));
  }

  function download() {
    if (editingId) commitEdit();
    requestAnimationFrame(() => {
      const off = document.createElement("canvas");
      off.width = sz.w; off.height = sz.h;
      const ctx = off.getContext("2d")!;
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, sz.w, sz.h);
      for (const el of elements) drawEl(ctx, el, imgCache.current);
      drawFrame(ctx, frameStyle, sz.w, sz.h, frameColor, frameThickness, frameInset);
      const a = document.createElement("a");
      a.href     = off.toDataURL("image/png");
      a.download = `beitrag-${format.replace(":", "x")}.png`;
      a.click();
    });
  }

  async function exportVideo() {
    if (exporting) return;
    if (editingId) commitEdit();
    setExporting(true);
    setExportProgress(0);
    setExportPhase("record");

    const off = document.createElement("canvas");
    off.width  = sz.w;
    off.height = sz.h;
    const ctx  = off.getContext("2d")!;

    const FPS    = 30;
    const frames = Math.ceil(videoDuration * FPS);

    try {
      // FFmpeg vorab laden
      const { FFmpeg: FFmpegClass } = await getFFmpeg();
      const ffmpeg = new FFmpegClass();
      await ffmpeg.load({
        coreURL:  "/ffmpeg/ffmpeg-core.js",
        wasmURL:  "/ffmpeg/ffmpeg-core.wasm",
      });

      // Phase 1: Alle Frames rendern und als JPEG in FFmpeg-FS schreiben
      for (let i = 0; i < frames; i++) {
        const t = i / FPS;
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, sz.w, sz.h);
        for (const el of elements) drawElAnimated(ctx, el, imgCache.current, t);
        drawFrame(ctx, frameStyle, sz.w, sz.h, frameColor, frameThickness, frameInset);

        const blob: Blob = await new Promise((res) => off.toBlob((b) => res(b!), "image/jpeg", 0.92));
        await ffmpeg.writeFile(`f${String(i).padStart(5, "0")}.jpg`, await fileToUint8(blob));

        if (i % 5 === 0) {
          setExportProgress(Math.round(((i + 1) / frames) * 100));
          await new Promise((r) => setTimeout(r, 0)); // UI-Thread freigeben
        }
      }
      setExportProgress(100);

      // Phase 2: FFmpeg-Encoding (Frames + optional Audio → MP4)
      setExportPhase("convert");
      setExportProgress(0);

      ffmpeg.on("progress", ({ progress }: { progress: number }) => {
        setExportProgress(Math.min(99, Math.round(progress * 100)));
      });

      const cmd: string[] = ["-framerate", String(FPS), "-i", "f%05d.jpg"];

      // Audio hinzufügen (falls ausgewählt)
      let hasAudio = false;
      if (selectedTrackId) {
        const track = musikTracks.find((t) => t.id === selectedTrackId);
        if (track) {
          try {
            const resp = await fetch(track.fileUrl);
            const audioBuf = new Uint8Array(await resp.arrayBuffer());
            const ext = (track.fileUrl.split(".").pop()?.split("?")[0] || "mp3").toLowerCase();
            await ffmpeg.writeFile(`audio.${ext}`, audioBuf);
            cmd.push("-i", `audio.${ext}`);
            hasAudio = true;
          } catch { /* Audio überspringen bei Fehler */ }
        }
      }

      cmd.push("-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-pix_fmt", "yuv420p");

      if (hasAudio) {
        const af: string[] = [];
        if (musikFadeIn)  af.push(`afade=t=in:st=0:d=${musikFadeInDur}`);
        if (musikFadeOut) af.push(`afade=t=out:st=${Math.max(0, videoDuration - musikFadeOutDur)}:d=${musikFadeOutDur}`);
        if (af.length) cmd.push("-af", af.join(","));
        cmd.push("-c:a", "aac", "-shortest");
      }

      cmd.push("-t", String(videoDuration), "-movflags", "+faststart", "output.mp4");
      await ffmpeg.exec(cmd);

      const data = await ffmpeg.readFile("output.mp4") as Uint8Array;
      const rawData = data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer);
      const mp4Buffer = rawData.buffer.slice(rawData.byteOffset, rawData.byteOffset + rawData.byteLength) as ArrayBuffer;
      const mp4Blob = new Blob([mp4Buffer], { type: "video/mp4" });
      const url = URL.createObjectURL(mp4Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `beitrag-${format.replace(":", "x")}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Video-Export fehlgeschlagen:", err);
    } finally {
      setExporting(false);
      setExportProgress(0);
      setExportPhase("record");
    }
  }

  /* inline edit overlay position */
  function editOverlayStyle(): React.CSSProperties | null {
    const el     = elements.find((e) => e.id === editingId) as TextEl | undefined;
    const canvas = canvasRef.current;
    if (!el || !canvas) return null;
    const scale = canvas.offsetWidth / sz.w;
    const ox    = canvas.offsetLeft;
    const oy    = canvas.offsetTop;
    return {
      position: "absolute",
      left:   ox + el.x * scale - 2,
      top:    oy + el.y * scale - 2,
      width:  el.w * scale + 4,
      minHeight: Math.max(el.h * scale, 48),
      fontSize:  `${(el.fontSize * scale).toFixed(1)}px`,
      fontFamily: el.font,
      fontWeight: el.bold   ? "bold"   : "normal",
      fontStyle:  el.italic ? "italic" : "normal",
      textAlign:  el.align,
      color:      el.color,
      background: "rgba(255,255,255,0.93)",
      border:     "2px solid #2563eb",
      borderRadius: 6,
      resize:  "none",
      outline: "none",
      padding: 0,
      lineHeight: 1.35,
      zIndex: 20,
    };
  }

  return (
    <main className={fullscreen ? "fixed inset-0 z-[100] bg-white overflow-hidden p-3 flex flex-col" : "top-centered-main"}>
      <section className={fullscreen ? "w-full flex-1 min-h-0 flex flex-col overflow-hidden" : "card"}>

        <div className={`flex flex-col md:flex-row gap-3 ${fullscreen ? "flex-1 min-h-0 md:items-stretch" : "items-start"}`}>

          {/* Sidebar */}
          <aside className={`flex-shrink-0 overflow-y-auto grid content-start gap-2 min-h-0 order-2 md:order-none w-full ${fullscreen ? "md:w-[540px] md:min-w-0 md:max-w-[540px]" : "md:w-[230px] md:min-w-0 md:max-w-[230px]"}`}>

            {/* Titel + Aktionen */}
            <div className="rounded-lg border border-arena-border p-2 grid gap-1.5 min-w-0 overflow-hidden">
              <p className="text-sm font-bold">Beitrag f&uuml;r Social Media</p>
              {currentDesignName && <p className="text-xs text-arena-muted truncate">Entwurf: <strong>{currentDesignName}</strong></p>}
              <div className={fullscreen ? "grid grid-cols-3 gap-1.5" : "grid grid-cols-2 md:grid-cols-1 gap-1.5"}>
                <button type="button" className="btn btn-primary text-xs w-full"
                  disabled={savingState === "saving"}
                  onClick={() => {
                    if (currentDesignName) saveDesign(currentDesignName);
                    else { setSaveNameInput(""); setShowSaveAs(true); }
                  }}>
                  {savingState === "saving" ? "Speichere…" : savingState === "saved" ? "✓ Gespeichert" : "Speichern"}
                </button>
                <button type="button" className="btn text-xs w-full"
                  onClick={() => { setSaveNameInput(currentDesignName ?? ""); setShowSaveAs(true); }}>
                  Speichern als
                </button>
                <button type="button" className="btn text-xs w-full" onClick={() => setShowOpen(true)}>
                  Öffnen
                </button>
                <button type="button" className="btn text-xs w-full" onClick={() => setShowInfo(true)}>
                  Info
                </button>
                {editorMode === "bild" ? (
                  <button type="button" className="btn btn-primary text-xs w-full" onClick={download}>
                    ↓ Herunterladen
                  </button>
                ) : (
                  <button type="button" className="btn btn-primary text-xs w-full"
                    disabled={exporting}
                    onClick={exportVideo}>
                    {exporting
                      ? exportPhase === "convert"
                        ? `MP4… ${exportProgress}%`
                        : `Render… ${exportProgress}%`
                      : "↓ Herunterladen"}
                  </button>
                )}
                <button type="button" className={`btn text-xs w-full ${fullscreen ? "btn-primary" : ""}`}
                  onClick={() => setFullscreen((f) => !f)}>
                  {fullscreen ? "Vollbild aus" : "Vollbild"}
                </button>
              </div>
            </div>

            {/* Modus + Hintergrund */}
            <div className={`rounded-lg border border-arena-border p-2 grid gap-1.5 min-w-0 overflow-hidden ${fullscreen ? "grid-cols-[1fr_1fr_auto] items-center" : ""}`}>
              {!fullscreen && <p className="text-sm font-semibold">Modus</p>}
              <button type="button"
                className={`btn w-full text-sm ${editorMode === "bild" ? "btn-primary" : ""}`}
                onClick={() => { setEditorMode("bild"); setFormat("4:5"); }}>
                Bild (4:5)
              </button>
              <button type="button"
                className={`btn w-full text-sm ${editorMode === "video" ? "btn-primary" : ""}`}
                onClick={() => { setEditorMode("video"); setFormat("9:16"); }}>
                Video (9:16)
              </button>
              {fullscreen && (
                <label className="flex items-center gap-1" title="Hintergrund">
                  <input type="color" value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-10 h-8 border border-arena-border rounded cursor-pointer p-0.5" />
                </label>
              )}
            </div>

            {!fullscreen && (
              <div className="rounded-lg border border-arena-border p-2 grid gap-1.5 min-w-0 overflow-hidden">
                <label className="flex items-center gap-2 text-sm">
                  <span>Hintergrund</span>
                  <input type="color" value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="ml-auto w-12 h-8 border border-arena-border rounded cursor-pointer p-0.5" />
                </label>
              </div>
            )}

            {/* Rahmen */}
            <div className="rounded-lg border border-arena-border p-2 grid gap-1.5 min-w-0 overflow-hidden">
              <p className="text-sm font-semibold">Rahmen</p>
              <div className={`grid gap-1 ${fullscreen ? "grid-cols-5" : "grid-cols-3 md:grid-cols-2"}`}>
                {FRAME_PRESETS.map((fp) => (
                  <button
                    key={fp.value}
                    type="button"
                    className={`btn text-xs py-1 ${frameStyle === fp.value ? "btn-primary" : ""}`}
                    onClick={() => setFrameStyle(fp.value)}
                  >
                    {fp.label}
                  </button>
                ))}
              </div>
              {frameStyle !== "none" && (
                <>
                  <label className="flex items-center gap-2 text-xs">
                    <span>Farbe</span>
                    <input type="color" value={frameColor}
                      onChange={(e) => setFrameColor(e.target.value)}
                      className="ml-auto w-10 h-7 border border-arena-border rounded cursor-pointer p-0.5" />
                  </label>
                  <label className="text-xs flex flex-col gap-0.5">
                    <span>St&auml;rke: <strong>{frameThickness}</strong></span>
                    <input type="range" min={1} max={10} step={1}
                      value={frameThickness}
                      onChange={(e) => setFrameThickness(Number(e.target.value))}
                      className="w-full" />
                  </label>
                  <label className="text-xs flex flex-col gap-0.5">
                    <span>Abstand: <strong>{frameInset}</strong></span>
                    <input type="range" min={0} max={20} step={1}
                      value={frameInset}
                      onChange={(e) => setFrameInset(Number(e.target.value))}
                      className="w-full" />
                  </label>
                </>
              )}
            </div>

            {/* Video-Optionen */}
            {editorMode === "video" && (
              <div className="rounded-lg border border-arena-border p-2 grid gap-1.5 min-w-0 overflow-hidden">
                <p className="text-xs font-semibold truncate">Video-Einstellungen</p>
                <label className="text-xs text-arena-muted">L&auml;nge: <strong>{videoDuration}s</strong></label>
                <input type="range" min={3} max={60} step={1}
                  value={videoDuration}
                  onChange={(e) => setVideoDuration(Number(e.target.value))}
                  className="w-full" />
                {!exporting && (
                  <button type="button"
                    className={`btn text-xs w-full ${previewing ? "btn-primary" : ""}`}
                    onClick={() => {
                      if (previewing) {
                        if (previewRafRef.current) cancelAnimationFrame(previewRafRef.current);
                        previewTRef.current = 0;
                        // Musik sofort stoppen
                        if (previewAudioSrc.current) { try { previewAudioSrc.current.stop(); } catch {} previewAudioSrc.current = null; }
                        if (previewAudioCtx.current) { if (previewAudioCtx.current.state !== "closed") previewAudioCtx.current.close().catch(() => {}); previewAudioCtx.current = null; }
                        previewGain.current = null;
                        setPreviewing(false);
                        setTick((t) => t + 1);
                      } else {
                        setSelId(null);
                        setPreviewing(true);
                      }
                    }}>
                    {previewing ? "\u258e\u258e Stopp" : "\u25ba Vorschau"}
                  </button>
                )}
                <p className="text-xs font-medium mt-1">Musik</p>
                {loadingMusik ? (
                  <p className="text-xs text-arena-muted">Lade…</p>
                ) : musikTracks.length === 0 ? (
                  <p className="text-xs text-arena-muted">Keine Tracks verf&uuml;gbar.</p>
                ) : (
                  <>
                    <select className="input text-xs py-1 w-full min-w-0"
                      value={selectedTrackId ?? ""}
                      onChange={(e) => setSelectedTrackId(e.target.value || null)}>
                      <option value="">Kein Musik</option>
                      {musikTracks.map((t) => (
                        <option key={t.id} value={t.id}>{t.title} &ndash; {t.style}</option>
                      ))}
                    </select>
                    <div className="grid gap-1 mt-2">
                      <label className="flex items-center gap-2 text-xs select-none">
                        <input type="checkbox" checked={musikFadeIn} onChange={e => setMusikFadeIn(e.target.checked)} />
                        Einblenden
                        {musikFadeIn && (
                          <span className="flex items-center gap-1 ml-auto">
                            <input type="number" min={0.5} max={30} step={0.5}
                              value={musikFadeInDur}
                              onChange={e => setMusikFadeInDur(Math.max(0.5, Number(e.target.value)))}
                              className="input text-xs py-0 w-14 text-right" />
                            <span>s</span>
                          </span>
                        )}
                      </label>
                      <label className="flex items-center gap-2 text-xs select-none">
                        <input type="checkbox" checked={musikFadeOut} onChange={e => setMusikFadeOut(e.target.checked)} />
                        Ausblenden
                        {musikFadeOut && (
                          <span className="flex items-center gap-1 ml-auto">
                            <input type="number" min={0.5} max={30} step={0.5}
                              value={musikFadeOutDur}
                              onChange={e => setMusikFadeOutDur(Math.max(0.5, Number(e.target.value)))}
                              className="input text-xs py-0 w-14 text-right" />
                            <span>s</span>
                          </span>
                        )}
                      </label>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="rounded-lg border border-arena-border p-2 grid gap-1.5 min-w-0 overflow-hidden">
              <p className="text-sm font-semibold">Hinzuf&uuml;gen</p>
              <div className={fullscreen ? "flex gap-1.5" : "grid grid-cols-3 md:grid-cols-1 gap-1.5"}>
                <button type="button" className="btn text-xs" onClick={addText}>+ Text</button>
                <button type="button" className="btn text-xs" onClick={() => setShowTemplates(true)}>
                  + Bildvorlage
                </button>
                <label className="btn cursor-pointer text-xs text-center block">
                  + Eigenes Bild
                  <input type="file" accept="image/*" className="sr-only"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) addUserImage(f); e.target.value = ""; }} />
                </label>
              </div>
            </div>

            {/* Entwurf speichern */}
            {elements.length > 0 && (
              <button type="button" className="btn text-sm text-red-600"
                onClick={() => { setEditingId(null); setElements([]); setSelId(null); setCurrentDesignName(null); }}>
                Alles löschen
              </button>
            )}
          </aside>

          {/* Canvas area */}
          <div className={`min-w-0 gap-2 order-1 md:order-none ${fullscreen ? "flex-1 flex flex-col overflow-hidden" : "grid content-start w-full md:w-3/4"}`}>

            {/* Toolbar – immer sichtbar, feste Höhe */}
            <div className="flex items-center gap-1.5 rounded-lg border border-arena-border bg-arena-bg/80 px-2 py-1.5 min-h-11 overflow-x-auto flex-shrink-0">
              {textEl ? (
                <>
                  <select className="input text-xs py-0 h-8 w-28"
                    value={textEl.font}
                    onChange={(e) => upd({ font: e.target.value })}>
                    {FONTS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                  <button type="button" className="btn h-8 w-7 p-0 text-base" onClick={() => upd({ fontSize: Math.max(10, textEl.fontSize - 2) })}>−</button>
                  <span className="text-xs w-9 text-center select-none tabular-nums">{textEl.fontSize}</span>
                  <button type="button" className="btn h-8 w-7 p-0 text-base" onClick={() => upd({ fontSize: Math.min(500, textEl.fontSize + 2) })}>+</button>
                  <button type="button"
                    className={`btn h-8 w-8 p-0 text-sm font-bold ${textEl.bold ? "btn-primary" : ""}`}
                    onClick={() => upd({ bold: !textEl.bold })}>B</button>
                  <button type="button"
                    className={`btn h-8 w-8 p-0 text-sm italic ${textEl.italic ? "btn-primary" : ""}`}
                    onClick={() => upd({ italic: !textEl.italic })}>I</button>
                  {(["left", "center", "right"] as Align[]).map((a) => (
                    <button key={a} type="button"
                      className={`btn h-8 px-2 text-xs ${textEl.align === a ? "btn-primary" : ""}`}
                      onClick={() => upd({ align: a })}>
                      {a === "left"
                        ? <svg viewBox="0 0 14 10" width="14" height="10" fill="currentColor"><rect x="0" y="0" width="14" height="2"/><rect x="0" y="4" width="9" height="2"/><rect x="0" y="8" width="11" height="2"/></svg>
                        : a === "center"
                        ? <svg viewBox="0 0 14 10" width="14" height="10" fill="currentColor"><rect x="0" y="0" width="14" height="2"/><rect x="2.5" y="4" width="9" height="2"/><rect x="1.5" y="8" width="11" height="2"/></svg>
                        : <svg viewBox="0 0 14 10" width="14" height="10" fill="currentColor"><rect x="0" y="0" width="14" height="2"/><rect x="5" y="4" width="9" height="2"/><rect x="3" y="8" width="11" height="2"/></svg>
                      }
                    </button>
                  ))}
                  <input type="color" value={textEl.color}
                    onChange={(e) => upd({ color: e.target.value })}
                    className="h-8 w-8 border border-arena-border rounded cursor-pointer p-0.5"
                    title="Textfarbe" />
                  <span className="text-arena-border">|</span>
                  <button type="button" className="btn h-8 px-2 text-xs" onClick={() => layer("up")} title="Ebene nach vorne">&#8679;</button>
                  <button type="button" className="btn h-8 px-2 text-xs" onClick={() => layer("down")} title="Ebene nach hinten">&#8681;</button>
                  {editorMode === "video" && (
                    <button type="button"
                      className={`btn h-8 px-2 text-xs ${textEl.anim && textEl.anim !== "none" ? "btn-primary" : ""}`}
                      onClick={() => setShowAnimPanel((v) => !v)}>
                      Anim.
                    </button>
                  )}
                  <button type="button" className="btn h-8 px-3 text-xs text-red-600 font-bold ml-auto" onClick={del}>L&ouml;schen</button>
                </>
              ) : selEl?.type === "image" ? (
                <>
                  {/* Zeile 1: Rahmen & Schatten toggles + Ebene + Löschen */}
                  <button type="button"
                    className={`btn h-8 px-2 text-xs ${(selEl as ImgEl).imgBorder ? "btn-primary" : ""}`}
                    title="Rahmen"
                    onClick={() => upd({ imgBorder: !(selEl as ImgEl).imgBorder })}>
                    Rahmen
                  </button>
                  <button type="button"
                    className={`btn h-8 px-2 text-xs ${(selEl as ImgEl).imgShadow ? "btn-primary" : ""}`}
                    title="Schatten"
                    onClick={() => upd({ imgShadow: !(selEl as ImgEl).imgShadow })}>
                    Schatten
                  </button>

                  {/* Rahmen: Farbe + Stärke */}
                  {(selEl as ImgEl).imgBorder && (
                    <>
                      <input type="color" value={(selEl as ImgEl).imgBorderColor ?? "#1a1a1a"}
                        onChange={(e) => upd({ imgBorderColor: e.target.value })}
                        className="h-8 w-8 border border-arena-border rounded cursor-pointer p-0.5"
                        title="Rahmenfarbe" />
                      <input type="range" min={1} max={20} value={(selEl as ImgEl).imgBorderWidth ?? 2}
                        onChange={(e) => upd({ imgBorderWidth: +e.target.value })}
                        className="w-16 h-8 accent-arena-accent" title="Rahmenstärke" />
                    </>
                  )}

                  {/* Schatten: Farbe + Blur */}
                  {(selEl as ImgEl).imgShadow && (
                    <>
                      <input type="color" value={(selEl as ImgEl).imgShadowColor ?? "#000000"}
                        onChange={(e) => upd({ imgShadowColor: e.target.value })}
                        className="h-8 w-8 border border-arena-border rounded cursor-pointer p-0.5"
                        title="Schattenfarbe" />
                      <input type="range" min={2} max={60} value={(selEl as ImgEl).imgShadowBlur ?? 18}
                        onChange={(e) => upd({ imgShadowBlur: +e.target.value })}
                        className="w-16 h-8 accent-arena-accent" title="Schattenweichheit" />
                    </>
                  )}

                  {/* Abgerundete Ecken */}
                  <span className="text-xs text-arena-muted ml-1" title="Abgerundete Ecken">&#9711;</span>
                  <input type="range" min={0} max={80} value={(selEl as ImgEl).imgRounded ?? 0}
                    onChange={(e) => upd({ imgRounded: +e.target.value })}
                    className="w-14 h-8 accent-arena-accent" title="Eckenradius" />

                  <span className="text-arena-border">|</span>
                  <button type="button" className="btn h-8 px-2 text-xs" onClick={() => layer("up")} title="Ebene nach vorne">&#8679;</button>
                  <button type="button" className="btn h-8 px-2 text-xs" onClick={() => layer("down")} title="Ebene nach hinten">&#8681;</button>
                  {editorMode === "video" && (
                    <button type="button"
                      className={`btn h-8 px-2 text-xs ${selEl?.anim && selEl.anim !== "none" ? "btn-primary" : ""}`}
                      onClick={() => setShowAnimPanel((v) => !v)}>
                      Anim.
                    </button>
                  )}
                  <button type="button" className="btn h-8 px-3 text-xs text-red-600 font-bold ml-auto" onClick={del}>L&ouml;schen</button>
                </>
              ) : (
                <span className="text-xs text-arena-muted select-none">Element ausw&auml;hlen &middot; Doppelklick = Text bearbeiten</span>
              )}
            </div>

            {/* Animations-Overlay */}
            {showAnimPanel && selEl && editorMode === "video" && (
              <div className="rounded-lg border border-arena-border bg-white p-3 shadow-lg grid gap-3 text-sm flex-shrink-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Animation</p>
                  <button type="button" className="text-lg leading-none text-arena-muted hover:text-black"
                    onClick={() => setShowAnimPanel(false)}>&times;</button>
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 items-center">
                  <span className="text-xs text-arena-muted">Typ</span>
                  <select className="input text-xs py-1"
                    value={selEl.anim ?? "none"}
                    onChange={(e) => upd({ anim: e.target.value as AnimPreset })}>
                    <option value="none">Keine Animation</option>
                    <option value="fade">Einblenden</option>
                    <option value="slide-left">Von links</option>
                    <option value="slide-right">Von rechts</option>
                    <option value="slide-up">Von oben</option>
                    <option value="slide-down">Von unten</option>
                    <option value="zoom">Zoom</option>
                  </select>
                  {selEl.anim && selEl.anim !== "none" && (
                    <>
                      <span className="text-xs text-arena-muted">Start</span>
                      <div className="flex items-center gap-1">
                        <input type="number" className="input text-xs py-1 w-20" min={0} max={videoDuration} step={0.1}
                          value={selEl.animDelay ?? 0}
                          onChange={(e) => upd({ animDelay: +e.target.value })} />
                        <span className="text-xs">s</span>
                      </div>
                      <span className="text-xs text-arena-muted">Dauer</span>
                      <div className="flex items-center gap-1">
                        <input type="number" className="input text-xs py-1 w-20" min={0.1} max={10} step={0.1}
                          value={selEl.animDuration ?? 0.5}
                          onChange={(e) => upd({ animDuration: +e.target.value })} />
                        <span className="text-xs">s</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Canvas + inline overlay */}
            <div ref={wrapRef} className={`relative rounded-xl border border-arena-border bg-arena-bg p-2 overflow-hidden ${fullscreen ? "flex-1 min-h-0 flex items-center justify-center" : ""}`}>
              <canvas
                ref={canvasRef}
                style={{
                  width: fullscreen ? undefined : "100%",
                  maxWidth: "100%",
                  maxHeight: fullscreen ? "100%" : undefined,
                  aspectRatio: `${sz.w}/${sz.h}`,
                  display: "block",
                  borderRadius: 10,
                  cursor,
                  touchAction: "none",
                  margin: fullscreen ? "0 auto" : undefined,
                }}
                onMouseDown={onDown}
                onMouseMove={onMove}
                onMouseUp={onUp}
                onMouseLeave={onUp}
                onDoubleClick={onDblClick}
                onTouchStart={onTouchDown}
                onTouchMove={onTouchMoveCanvas}
                onTouchEnd={onTouchUp}
              />
              {/* Instagram-Grid 4:5 Ausschnitt (nur bei 9:16) */}
              {showGridCrop && format === "9:16" && (
                <>
                  {/* oberer dunkler Bereich */}
                  <div style={{
                    position: "absolute", left: 8, right: 8, top: 8,
                    height: `calc((100% - 16px) * ${(1 - 1350 / 1920) / 2})`,
                    background: "rgba(0,0,0,0.45)", borderRadius: "10px 10px 0 0",
                    pointerEvents: "none", zIndex: 5,
                  }} />
                  {/* unterer dunkler Bereich */}
                  <div style={{
                    position: "absolute", left: 8, right: 8, bottom: 8,
                    height: `calc((100% - 16px) * ${(1 - 1350 / 1920) / 2})`,
                    background: "rgba(0,0,0,0.45)", borderRadius: "0 0 10px 10px",
                    pointerEvents: "none", zIndex: 5,
                  }} />
                  {/* obere Linie */}
                  <div style={{
                    position: "absolute", left: 8, right: 8,
                    top: `calc(8px + (100% - 16px) * ${(1 - 1350 / 1920) / 2})`,
                    height: 2, background: "#e53e3e",
                    pointerEvents: "none", zIndex: 6,
                  }} />
                  {/* untere Linie */}
                  <div style={{
                    position: "absolute", left: 8, right: 8,
                    bottom: `calc(8px + (100% - 16px) * ${(1 - 1350 / 1920) / 2})`,
                    height: 2, background: "#e53e3e",
                    pointerEvents: "none", zIndex: 6,
                  }} />
                  {/* Label */}
                  <div style={{
                    position: "absolute", left: 12, zIndex: 7,
                    top: `calc(8px + (100% - 16px) * ${(1 - 1350 / 1920) / 2} + 6px)`,
                    background: "rgba(229,62,62,0.85)", color: "#fff",
                    fontSize: 11, padding: "2px 7px", borderRadius: 4,
                    pointerEvents: "none", fontWeight: 600, letterSpacing: 0.3,
                  }}>Instagram Grid 4:5</div>
                </>
              )}
              {/* Inline text edit overlay */}
              {editingId && (() => {
                const style = editOverlayStyle();
                if (!style) return null;
                return (
                  <textarea
                    ref={editAreaRef}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") { setEditingId(null); }
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitEdit(); }
                    }}
                    onBlur={commitEdit}
                    style={style}
                  />
                );
              })()}
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <p className="text-xs text-arena-muted">
                {sz.w}&times;{sz.h}px
                {editingId ? " \u2014 Enter best\u00e4tigen, Esc abbrechen" : ""}
              </p>
              {format === "9:16" && (
                <label className="flex items-center gap-1 text-xs text-arena-muted cursor-pointer select-none ml-auto">
                  <input type="checkbox" checked={showGridCrop} onChange={(e) => setShowGridCrop(e.target.checked)}
                    className="accent-arena-accent" />
                  Grid-Vorschau
                </label>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Bildvorlagen-Overlay */}
      {showTemplates && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
        >
          <div
            className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Bildvorlagen</h2>
              <button type="button" className="text-2xl leading-none text-arena-muted hover:text-black"
                onClick={() => { setShowTemplates(false); setTplPage(0); }}>&times;</button>
            </div>
            {loadingTpl ? (
              <p className="text-sm text-arena-muted py-2">Lade Bilder&hellip;</p>
            ) : templates.length === 0 ? (
              <p className="text-sm text-arena-muted py-2">Noch keine Bildvorlagen vorhanden.</p>
            ) : (() => {
              const perPage = 8;
              const totalPages = Math.ceil(templates.length / perPage);
              const page = Math.min(tplPage, totalPages - 1);
              const slice = templates.slice(page * perPage, page * perPage + perPage);
              return (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {slice.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        className="rounded-lg border-2 border-arena-border hover:border-blue-400 overflow-hidden transition-colors text-left"
                        onClick={() => { addTplImage(tpl.src); setShowTemplates(false); setTplPage(0); }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={tpl.src} alt={tpl.label} className="w-full object-cover aspect-square" />
                        <p className="text-xs text-center py-1.5 font-medium truncate px-1">{tpl.label}</p>
                      </button>
                    ))}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-4">
                      <button type="button" className="btn text-xs px-3 h-8"
                        disabled={page === 0}
                        onClick={() => setTplPage((p) => Math.max(0, p - 1))}>
                        &larr; Zur&uuml;ck
                      </button>
                      <span className="text-xs text-arena-muted tabular-nums">
                        {page + 1} / {totalPages}
                      </span>
                      <button type="button" className="btn text-xs px-3 h-8"
                        disabled={page >= totalPages - 1}
                        onClick={() => setTplPage((p) => Math.min(totalPages - 1, p + 1))}>
                        Weiter &rarr;
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Speichern unter Overlay */}
      {showSaveAs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 flex flex-col">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-arena-border">
              <h2 className="text-lg font-bold">Speichern unter</h2>
              <button type="button" className="text-2xl leading-none text-arena-muted hover:text-black"
                onClick={() => setShowSaveAs(false)}>&times;</button>
            </div>
            <div className="px-5 py-4 grid gap-3">
              <label className="text-sm font-medium">Name des Entwurfs</label>
              <input type="text" className="input" placeholder="z.&#x202F;B. Sommer-Post&#x2026;"
                autoFocus
                value={saveNameInput}
                onChange={(e) => setSaveNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && saveNameInput.trim()) {
                    saveDesign(saveNameInput.trim());
                    setCurrentDesignName(saveNameInput.trim());
                    setTimeout(() => setShowSaveAs(false), 800);
                  }
                }} />
              <button type="button" className="btn btn-primary"
                disabled={!saveNameInput.trim() || savingState === "saving"}
                onClick={() => {
                  saveDesign(saveNameInput.trim());
                  setCurrentDesignName(saveNameInput.trim());
                  setTimeout(() => setShowSaveAs(false), 800);
                }}>
                {savingState === "saving" ? "Speichere\u2026" : savingState === "saved" ? "\u2713 Gespeichert" : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Öffnen Overlay */}
      {showOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-arena-border">
              <h2 className="text-lg font-bold">&Ouml;ffnen</h2>
              <button type="button" className="text-2xl leading-none text-arena-muted hover:text-black"
                onClick={() => setShowOpen(false)}>&times;</button>
            </div>
            {isAdmin && (
              <div className="px-5 pt-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={showAllDesigns}
                    onChange={(e) => setShowAllDesigns(e.target.checked)}
                    className="rounded" />
                  Alle Benutzer-Entwürfe anzeigen
                </label>
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {loadingDesigns ? (
                <p className="text-sm text-arena-muted py-2">Lade Entw&uuml;rfe&hellip;</p>
              ) : savedDesigns.length === 0 ? (
                <p className="text-sm text-arena-muted py-2">Noch keine gespeicherten Entw&uuml;rfe.</p>
              ) : (
                <ul className="grid gap-2">
                  {savedDesigns.map((d) => (
                    <li key={d.id} className="flex items-center gap-2 rounded-lg border border-arena-border px-3 py-2.5 hover:bg-arena-bg/50 transition-colors cursor-pointer"
                      onClick={() => { loadDesign(d.data, d.name); setShowOpen(false); }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{d.name}</p>
                        <div className="flex items-center gap-2">
                          {d.username && showAllDesigns && (
                            <span className="text-xs text-blue-600 font-medium">{d.username}</span>
                          )}
                          {d.updatedAt && <p className="text-xs text-arena-muted">{new Date(d.updatedAt).toLocaleDateString("de-DE")}</p>}
                        </div>
                      </div>
                      {!showAllDesigns && (
                        <button type="button" className="btn text-sm px-2 text-red-600 flex-shrink-0"
                          onClick={(e) => { e.stopPropagation(); setConfirmDelete(d.name); }}>
                          L&ouml;schen
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Löschen bestätigen */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 grid gap-4">
            <h2 className="text-lg font-bold">Entwurf l&ouml;schen?</h2>
            <p className="text-sm text-arena-muted">
              &bdquo;<strong>{confirmDelete}</strong>&ldquo; wird unwiderruflich gel&ouml;scht.
            </p>
            <div className="flex gap-3 justify-end">
              <button type="button" className="btn px-5 py-2"
                onClick={() => setConfirmDelete(null)}>Abbrechen</button>
              <button type="button" className="btn px-5 py-2 bg-red-600 text-white hover:bg-red-700 font-semibold rounded-lg"
                onClick={() => { deleteDesign(confirmDelete); setConfirmDelete(null); }}>
                L&ouml;schen
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Info Overlay */}
      {showInfo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-arena-border">
              <h2 className="text-xl font-bold">So funktioniert der Beitrag-Editor</h2>
              <button type="button" className="text-2xl leading-none text-arena-muted hover:text-black"
                onClick={() => setShowInfo(false)}>&times;</button>
            </div>
            <div className="px-6 py-5 grid gap-5 text-sm leading-relaxed">

              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
                <p className="font-semibold mb-1.5 text-emerald-800">Nutzungsrechte</p>
                <p className="text-emerald-900">Alle von uns bereitgestellten <strong>Bildvorlagen</strong> und <strong>Musik-Tracks</strong> wurden von der BuchArena erstellt und d&uuml;rfen <strong>ohne Einschr&auml;nkung</strong> f&uuml;r eure Social-Media-Beitr&auml;ge verwendet werden &ndash; auch kommerziell.</p>
                <p className="text-emerald-800 mt-2 text-xs">Wir freuen uns, wenn ihr erw&auml;hnt, dass euer Beitrag mit Tools von <strong>bucharena.org</strong> erstellt wurde &ndash; das ist aber keine Pflicht. 💚</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <p className="font-semibold mb-1">Formate</p>
                  <ul className="grid gap-1 text-arena-muted">
                    <li><strong>4:5</strong> &ndash; Hochformat (1080&thinsp;&times;&thinsp;1350&thinsp;px). Ideal f&uuml;r Instagram-Feed und Facebook.</li>
                    <li><strong>1:1</strong> &ndash; Quadratisch (1080&thinsp;&times;&thinsp;1080&thinsp;px). Gut f&uuml;r LinkedIn und Pinterest.</li>
                    <li><strong>9:16</strong> &ndash; Vertikal (1080&thinsp;&times;&thinsp;1920&thinsp;px). F&uuml;r Reels, TikTok und Shorts.</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold mb-1">Elemente bearbeiten</p>
                  <ul className="grid gap-1 text-arena-muted">
                    <li><strong>Verschieben:</strong> Element anklicken und ziehen.</li>
                    <li><strong>Gr&ouml;&szlig;e &auml;ndern:</strong> Ecken-Anfasser ziehen. Bilder skalieren proportional.</li>
                    <li><strong>Text bearbeiten:</strong> Doppelklick auf ein Textelement.</li>
                    <li><strong>L&ouml;schen:</strong> Element ausw&auml;hlen &rarr; &bdquo;L&ouml;schen&ldquo; oder <kbd className="font-mono bg-gray-100 px-1 rounded">Entf</kbd>.</li>
                    <li><strong>Ebenenreihenfolge:</strong> Pfeile ↑ ↓ in der Toolbar.</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold mb-1">Bilder</p>
                  <ul className="grid gap-1 text-arena-muted">
                    <li><strong>Bildvorlagen:</strong> Aus einer Galerie von BuchArena-Bildern ausw&auml;hlen.</li>
                    <li><strong>Eigenes Bild:</strong> Eigene Datei hochladen (JPG, PNG etc.).</li>
                    <li><strong>Rahmen &amp; Schatten:</strong> Bild ausw&auml;hlen &rarr; Rahmen/Schatten/Eckenradius in der Toolbar einstellen.</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold mb-1">Rahmen</p>
                  <ul className="grid gap-1 text-arena-muted">
                    <li><strong>Rahmentypen:</strong> 10 verschiedene Rahmen (Einfach, Doppelt, Elegant, Vintage, Perlen u.&thinsp;a.).</li>
                    <li><strong>Farbe &amp; St&auml;rke:</strong> Individuell anpassbar.</li>
                    <li><strong>Grid-Vorschau:</strong> Bei 9:16 zeigt ein Overlay den sichtbaren 4:5-Ausschnitt im Instagram-Grid.</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold mb-1">Speichern &amp; Laden</p>
                  <ul className="grid gap-1 text-arena-muted">
                    <li><strong>Speichern:</strong> Aktuellen Stand unter vorhandenem Namen sichern.</li>
                    <li><strong>Speichern unter:</strong> Neuen Namen vergeben &ndash; erstellt eine Kopie.</li>
                    <li><strong>&Ouml;ffnen:</strong> Gespeicherte Entw&uuml;rfe laden.</li>
                    <li><strong>Export/Import:</strong> Entwurf als JSON-Datei exportieren oder importieren.</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold mb-1">Video-Modus</p>
                  <ul className="grid gap-1 text-arena-muted">
                    <li><strong>L&auml;nge:</strong> Per Slider einstellbar (3&thinsp;&ndash;&thinsp;60&thinsp;s).</li>
                    <li><strong>Animationen:</strong> Eingangs-Animationen pro Element (Einblenden, Slide, Zoom) mit Start &amp; Dauer.</li>
                    <li><strong>Vorschau:</strong> Echtzeit-Abspielen auf der Canvas inkl. Musik.</li>
                    <li><strong>Musik:</strong> Optionaler Track mit Fade-In/Fade-Out.</li>
                    <li><strong>Export:</strong> Rendert MP4 direkt im Browser &ndash; kein Server-Upload n&ouml;tig.</li>
                  </ul>
                </div>
              </div>

              <div>
                <p className="font-semibold mb-1">Herunterladen</p>
                <ul className="grid gap-1 text-arena-muted">
                  <li><strong>Bild-Modus:</strong> PNG in voller Aufl&ouml;sung (1080&thinsp;px Breite).</li>
                  <li><strong>Video-Modus:</strong> MP4-Video mit Fortschrittsanzeige.</li>
                </ul>
              </div>

              <button type="button" className="btn btn-primary py-2.5 text-base font-semibold"
                onClick={() => setShowInfo(false)}>Los geht&rsquo;s!</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
