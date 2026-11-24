"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface EpubReaderProps {
  url: string;
  onClose: () => void;
  initialCfi?: string;
  onCfiChange?: (cfi: string) => void;
}

export default function EpubReader({ url, onClose, initialCfi, onCfiChange }: EpubReaderProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renditionRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [fontSize, setFontSize] = useState(100); // Prozent

  const [portalTarget] = useState<HTMLElement>(() =>
    document.getElementById("modal-root") ?? document.body
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (!viewerRef.current) return;
    let destroyed = false;
    let initialized = false;
    let latestWidth = 0;
    let latestHeight = 0;
    let destroyBook: (() => void) | undefined;
    const abortController = new AbortController();

    const container = viewerRef.current;

    async function init(w: number, h: number) {
      try {
        const ePub = (await import("epubjs")).default;

        const response = await fetch(url, { signal: abortController.signal });
        if (!response.ok) throw new Error("Fetch fehlgeschlagen");
        const arrayBuffer = await response.arrayBuffer();

        if (destroyed) return;

        const book = ePub(arrayBuffer);
        destroyBook = () => book.destroy();
        const rendition = book.renderTo(container, {
          width: w,
          height: h,
          flow: "paginated",
          spread: "none",
        });
        renditionRef.current = rendition;

        await rendition.display(initialCfi ?? undefined);
        if (destroyed) return;
        if (latestWidth !== w || latestHeight !== h) rendition.resize(latestWidth, latestHeight);
        setLoading(false);

        // Schriftgröße initial setzen (falls vom State schon geändert)
        rendition.themes.fontSize(`${fontSize}%`);

        // Touch-Swipe innerhalb des epub.js-Iframes (Events propagieren nicht nach außen)
        let swipeStartX = 0;
        let swipeStartY = 0;
        rendition.on("touchstart", (e: TouchEvent) => {
          swipeStartX = e.changedTouches[0].clientX;
          swipeStartY = e.changedTouches[0].clientY;
        });
        rendition.on("touchend", (e: TouchEvent) => {
          const dx = e.changedTouches[0].clientX - swipeStartX;
          const dy = e.changedTouches[0].clientY - swipeStartY;
          if (Math.abs(dx) < 40 || Math.abs(dy) > Math.abs(dx)) return;
          if (dx < 0) rendition.next();
          else rendition.prev();
        });

        rendition.on("keydown", (e: KeyboardEvent) => {
          if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
          if (["ArrowRight", "ArrowDown"].includes(e.key)) { e.preventDefault(); rendition.next(); }
          if (["ArrowLeft", "ArrowUp"].includes(e.key)) { e.preventDefault(); rendition.prev(); }
        });

        book.locations.generate(1024).then(() => {
          if (destroyed) return;
          const total = book.locations.length();
          setTotalPages(total);
          // Aktuelle Position nachlesen – currentLocation() gibt located()-Objekt zurück
          // mit start.location (0-basierter Index) und start.percentage
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const loc = rendition.currentLocation() as any;
          const pct = loc?.start?.percentage;
          if (typeof pct === "number") {
            setCurrentPage(Math.max(1, Math.min(total, Math.round(pct * total) + 1)));
          }
        }).catch((err: unknown) => {
          if (!destroyed) console.warn("EPUB-Lesepositionen konnten nicht berechnet werden:", err);
        });

        // locationChanged-Event: { start: cfiString, end: cfiString, percentage: number }
        // location.start ist ein STRING, nicht ein Objekt!
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rendition.on("locationChanged", (location: any) => {
          if (destroyed) return;
          const total = book.locations.length();
          const pct = location?.percentage;
          if (total > 0 && typeof pct === "number") {
            setCurrentPage(Math.max(1, Math.min(total, Math.round(pct * total) + 1)));
            setTotalPages(total);
          }
          const cfi = location?.start;
          if (typeof cfi === "string" && cfi) onCfiChange?.(cfi);
        });
      } catch (err) {
        if (!destroyed) {
          console.error("EpubReader:", err);
          setError("Das EPUB konnte nicht geladen werden.");
          setLoading(false);
        }
      }
    }

    // Auch nach Bildschirmdrehung, Schriftänderungen und Layoutwechseln anpassen.
    const ro = new ResizeObserver((entries) => {
      if (destroyed) return;
      const entry = entries[0];
      const w = Math.floor(entry.contentRect.width);
      const h = Math.floor(entry.contentRect.height);
      if (w > 0 && h > 0) {
        if (latestWidth === w && latestHeight === h) return;
        latestWidth = w;
        latestHeight = h;
        if (!initialized) {
          initialized = true;
          void init(w, h);
        } else {
          renditionRef.current?.resize(w, h);
        }
      }
    });
    ro.observe(container);

    return () => {
      destroyed = true;
      ro.disconnect();
      abortController.abort();
      try { destroyBook?.(); } catch { /* ignore */ }
      renditionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // Schriftgröße dynamisch anpassen
  useEffect(() => {
    renditionRef.current?.themes?.fontSize?.(`${fontSize}%`);
  }, [fontSize]);

  // Tastatur-Navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); renditionRef.current?.next?.(); }
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   { e.preventDefault(); renditionRef.current?.prev?.(); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Touch/Swipe-Navigation
  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;
    let startX = 0;
    let startY = 0;
    function onTouchStart(e: TouchEvent) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }
    function onTouchEnd(e: TouchEvent) {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      // Nur horizontale Swipes auswerten (min. 40px, weniger vertikal als horizontal)
      if (Math.abs(dx) < 40 || Math.abs(dy) > Math.abs(dx)) return;
      if (dx < 0) renditionRef.current?.next?.();
      else        renditionRef.current?.prev?.();
    }
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend",   onTouchEnd,   { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend",   onTouchEnd);
    };
  }, []);

  const modal = (
    <dialog ref={dialogRef} aria-label="EPUB-Lesefenster" onCancel={(e) => { e.preventDefault(); onClose(); }} className="fixed inset-0 z-[9999] m-0 h-dvh w-full max-h-none max-w-none border-0 bg-black/75 p-0 open:flex items-end sm:items-center justify-center backdrop:bg-transparent">
      <div
        className="bg-white w-full sm:max-w-3xl sm:rounded-xl flex flex-col shadow-2xl"
        style={{ height: "100dvh", maxHeight: "100dvh" }}
      >
        {/* Header mit Navigation */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2 sm:px-4 py-2 sm:py-3 border-b border-arena-border bg-[#1a1a2e] shrink-0 sm:rounded-t-xl sm:flex sm:justify-between">
          <button
            onClick={() => renditionRef.current?.prev?.()}
            disabled={loading || !!error}
            className="col-start-1 row-start-2 min-h-11 text-white/70 hover:text-white disabled:opacity-30 text-sm font-semibold px-4 py-2 rounded hover:bg-white/10 min-w-[72px] touch-manipulation"
          >&#8592; Zur&#252;ck</button>

          {/* Mitte: Titel + Schriftgröße */}
          <div className="col-start-1 row-start-1 flex items-center gap-2">
            <button
              onClick={() => setFontSize(s => Math.max(70, s - 10))}
              disabled={loading || !!error || fontSize <= 70}
              className="text-white/70 hover:text-white disabled:opacity-30 text-base font-bold size-11 shrink-0 flex items-center justify-center rounded hover:bg-white/10 touch-manipulation"
              aria-label="Schrift kleiner"
              title="Schrift kleiner"
            >A&#8722;</button>
            <span className="text-white font-semibold text-xs sm:text-sm hidden sm:inline">EPUB</span>
            <button
              onClick={() => setFontSize(s => Math.min(180, s + 10))}
              disabled={loading || !!error || fontSize >= 180}
              className="text-white/70 hover:text-white disabled:opacity-30 text-base font-bold size-11 shrink-0 flex items-center justify-center rounded hover:bg-white/10 touch-manipulation"
              aria-label="Schrift gr&#246;&#223;er"
              title="Schrift gr&#246;&#223;er"
            >A+</button>
          </div>

            <button
              onClick={() => renditionRef.current?.next?.()}
              disabled={loading || !!error}
              className="col-start-2 row-start-2 min-h-11 text-white/70 hover:text-white disabled:opacity-30 text-sm font-semibold px-4 py-2 rounded hover:bg-white/10 min-w-[72px] touch-manipulation"
            >Weiter &#8594;</button>
            <button
              onClick={onClose}
              className="col-start-2 row-start-1 justify-self-end text-white/70 hover:text-white text-xl leading-none size-11 shrink-0 flex items-center justify-center rounded hover:bg-white/10 touch-manipulation"
              aria-label="Schlie&#223;en"
            >&#x2715;</button>
        </div>

        {/* Viewer */}
        <div className="flex-1 relative bg-white min-h-0">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-arena-muted text-sm z-10 pointer-events-none">
              Lade EPUB…
            </div>
          )}
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center text-red-600 text-sm px-4 text-center">
              {error}
            </div>
          ) : (
            <div ref={viewerRef} className="w-full h-full" />
          )}
        </div>

        {/* Footer: Fortschritt */}
        <div className="flex items-center gap-3 px-4 py-2 border-t border-arena-border bg-gray-50 shrink-0">
          <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#1a1a2e] h-1.5 rounded-full transition-all duration-300"
              style={{ width: totalPages > 0 ? `${Math.round((currentPage / totalPages) * 100)}%` : "0%" }}
            />
          </div>
          {totalPages > 0 && (
            <span className="text-xs text-arena-muted tabular-nums shrink-0">
              Abschnitt {currentPage} / {totalPages}
            </span>
          )}
        </div>
      </div>
    </dialog>
  );

  return createPortal(modal, portalTarget);
}
