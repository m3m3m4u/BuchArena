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
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [portalTarget] = useState<HTMLElement>(() =>
    document.getElementById("modal-root") ?? document.body
  );

  useEffect(() => {
    if (!viewerRef.current) return;

    let destroyed = false;

    async function init() {
      try {
        const ePub = (await import("epubjs")).default;

        // EPUB als ArrayBuffer vorab fetchen, damit epub.js keine Sub-Ressourcen
        // über die API-URL nachlädt (würde 404 für META-INF/container.xml liefern)
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
          if (!destroyed && totalPages > 0) {
            setCurrentPage(Math.round(location.start.percentage * totalPages));
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

  function prevPage() {
    if (!renditionRef.current || typeof renditionRef.current.prev !== "function") return;
    renditionRef.current.prev();
  }
  function nextPage() {
    if (!renditionRef.current || typeof renditionRef.current.next !== "function") return;
    renditionRef.current.next();
  }

  const modal = (
    <div
      className="fixed inset-0 z-[9999] bg-black/75 flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white w-full sm:max-w-3xl sm:rounded-xl flex flex-col shadow-2xl overflow-hidden"
        style={{ height: "calc(100dvh - env(safe-area-inset-top, 0px) - 2rem)", maxHeight: "95dvh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-arena-border bg-[#1a1a2e] shrink-0">
          <span className="text-white font-semibold text-sm">EPUB-Reader</span>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-xl leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-white/10"
            aria-label="Schließen"
          >✕</button>
        </div>

        {/* Viewer */}
        <div className="flex-1 relative overflow-hidden bg-white min-h-0">
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
            <div ref={viewerRef} className="w-full h-full relative overflow-hidden" />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-arena-border bg-gray-50 shrink-0 gap-4 relative z-10">
          <button
            onClick={prevPage}
            disabled={loading || !!error}
            className="btn btn-secondary btn-sm disabled:opacity-40 min-w-[90px]"
          >← Zurück</button>
          <span className="text-xs text-arena-muted tabular-nums">
            {totalPages > 0 ? `${currentPage} / ${totalPages}` : ""}
          </span>
          <button
            onClick={nextPage}
            disabled={loading || !!error}
            className="btn btn-secondary btn-sm disabled:opacity-40 min-w-[90px]"
          >Weiter →</button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, portalTarget);
}
