"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface EpubReaderProps {
  url: string;
  onClose: () => void;
}

export default function EpubReader({ url, onClose }: EpubReaderProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renditionRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const [portalTarget] = useState<HTMLElement>(() =>
    document.getElementById("modal-root") ?? document.body
  );

  useEffect(() => {
    if (!viewerRef.current) return;
    let destroyed = false;
    let roDisconnected = false;

    const container = viewerRef.current;

    async function init(w: number, h: number) {
      try {
        const ePub = (await import("epubjs")).default;

        const response = await fetch(url);
        if (!response.ok) throw new Error("Fetch fehlgeschlagen");
        const arrayBuffer = await response.arrayBuffer();

        if (destroyed) return;

        const book = ePub(arrayBuffer);
        const rendition = book.renderTo(container, {
          width: w,
          height: h,
          flow: "paginated",
          spread: "none",
        });
        renditionRef.current = rendition;

        await rendition.display();
        if (!destroyed) setLoading(false);

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
        });
      } catch (err) {
        console.error("EpubReader:", err);
        if (!destroyed) setError("Das EPUB konnte nicht geladen werden.");
      }
    }

    // Warten bis Container echte Pixelmaße hat
    const ro = new ResizeObserver((entries) => {
      if (roDisconnected) return;
      const entry = entries[0];
      const w = entry.contentRect.width;
      const h = entry.contentRect.height;
      if (w > 0 && h > 0) {
        roDisconnected = true;
        ro.disconnect();
        init(Math.floor(w), Math.floor(h));
      }
    });
    ro.observe(container);

    return () => {
      destroyed = true;
      roDisconnected = true;
      ro.disconnect();
      try { renditionRef.current?.destroy(); } catch { /* ignore */ }
      renditionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // Tastatur-Navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowRight" || e.key === "ArrowDown") renditionRef.current?.next?.();
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   renditionRef.current?.prev?.();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const modal = (
    <div className="fixed inset-0 z-[9999] bg-black/75 flex items-end sm:items-center justify-center">
      <div
        className="bg-white w-full sm:max-w-3xl sm:rounded-xl flex flex-col shadow-2xl"
        style={{ height: "calc(100dvh - 2rem)", maxHeight: "95dvh" }}
      >
        {/* Header mit Navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-arena-border bg-[#1a1a2e] shrink-0 rounded-t-xl">
          <button
            onClick={() => renditionRef.current?.prev?.()}
            disabled={loading || !!error}
            className="text-white/70 hover:text-white disabled:opacity-30 text-sm font-semibold px-3 py-1 rounded hover:bg-white/10 min-w-[70px]"
          >← Zurück</button>
          <span className="text-white font-semibold text-sm">EPUB-Reader</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => renditionRef.current?.next?.()}
              disabled={loading || !!error}
              className="text-white/70 hover:text-white disabled:opacity-30 text-sm font-semibold px-3 py-1 rounded hover:bg-white/10 min-w-[70px]"
            >Weiter →</button>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white text-xl leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-white/10"
              aria-label="Schließen"
            >✕</button>
          </div>
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
    </div>
  );

  return createPortal(modal, portalTarget);
}
