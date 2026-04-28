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
  const [jumpInput, setJumpInput] = useState("");

  const [portalTarget] = useState<HTMLElement>(() =>
    document.getElementById("modal-root") ?? document.body
  );

  useEffect(() => {
    if (!viewerRef.current) return;

    let destroyed = false;

    async function init() {
      try {
        const ePub = (await import("epubjs")).default;

        const response = await fetch(url);
        if (!response.ok) throw new Error("Fetch fehlgeschlagen");
        const arrayBuffer = await response.arrayBuffer();

        const book = ePub(arrayBuffer);
        const rendition = book.renderTo(viewerRef.current!, {
          width: "100%",
          height: "100%",
          flow: "paginated",
          spread: "none",
        });
        renditionRef.current = rendition;

        await rendition.display();

        if (!destroyed) setLoading(false);

        book.locations.generate(1024).then(() => {
          if (!destroyed) setTotalPages(book.locations.length());
        });

        rendition.on("locationChanged", (location: { start: { percentage: number } }) => {
          if (!destroyed) {
            const total = book.locations.length();
            if (total > 0) {
              setCurrentPage(Math.max(1, Math.round(location.start.percentage * total)));
              setTotalPages(total);
            }
          }
        });
      } catch {
        if (!destroyed) setError("Das EPUB konnte nicht geladen werden.");
      }
    }

    init();

    return () => {
      destroyed = true;
      renditionRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // Tastatur: Pfeiltasten + Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        if (renditionRef.current && typeof renditionRef.current.next === "function") renditionRef.current.next();
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        if (renditionRef.current && typeof renditionRef.current.prev === "function") renditionRef.current.prev();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function prevPageFn() {
    if (!renditionRef.current || typeof renditionRef.current.prev !== "function") return;
    renditionRef.current.prev();
  }
  function nextPageFn() {
    if (!renditionRef.current || typeof renditionRef.current.next !== "function") return;
    renditionRef.current.next();
  }

  function handleJump(e: React.FormEvent) {
    e.preventDefault();
    const page = parseInt(jumpInput, 10);
    if (!renditionRef.current || isNaN(page) || page < 1) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const book = (renditionRef.current as any).book;
    if (!book?.locations) return;
    const total = book.locations.length();
    if (total === 0) return;
    const cfi = book.locations.cfiFromPercentage((page - 1) / total);
    renditionRef.current.display(cfi);
    setJumpInput("");
  }

  const modal = (
    <div
      className="fixed inset-0 z-[9999] bg-black/75 flex items-end sm:items-center justify-center"
    >
      <div
        className="bg-white w-full sm:max-w-3xl sm:rounded-xl flex flex-col shadow-2xl overflow-hidden"
        style={{ height: "calc(100dvh - env(safe-area-inset-top, 0px) - 2rem)", maxHeight: "95dvh" }}
      >
        {/* Header mit Navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-arena-border bg-[#1a1a2e] shrink-0">
          <button
            onClick={prevPageFn}
            disabled={loading || !!error}
            className="text-white/70 hover:text-white disabled:opacity-30 text-sm font-semibold px-3 py-1 rounded hover:bg-white/10 min-w-[70px]"
          >← Zurück</button>
          <span className="text-white font-semibold text-sm">EPUB-Reader</span>
          <div className="flex items-center gap-2">
            <button
              onClick={nextPageFn}
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
        <div className="flex-1 relative bg-white min-h-0" style={{ overflow: "clip" }}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-arena-muted text-sm">
              Lade EPUB…
            </div>
          )}
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center text-red-600 text-sm px-4 text-center">
              {error}
            </div>
          ) : (
            <div ref={viewerRef} className="w-full h-full relative" style={{ overflow: "clip" }} />
          )}
        </div>

        {/* Seiteninfo + Sprung */}
        <div className="flex items-center justify-center gap-3 px-4 py-2 border-t border-arena-border bg-gray-50 shrink-0">
          {totalPages > 0 && (
            <>
              <span className="text-xs text-arena-muted tabular-nums">{currentPage} / {totalPages}</span>
              <form onSubmit={handleJump} className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={jumpInput}
                  onChange={(e) => setJumpInput(e.target.value)}
                  placeholder="Seite…"
                  className="w-20 text-xs border border-arena-border rounded px-2 py-0.5 text-center"
                />
                <button type="submit" className="text-xs text-arena-blue font-semibold px-2 py-0.5 rounded hover:bg-gray-200">↵</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, portalTarget);
}

