"use client";

import { useEffect, useRef, useState } from "react";

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

  useEffect(() => {
    if (!viewerRef.current) return;

    let destroyed = false;

    async function init() {
      try {
        const ePub = (await import("epubjs")).default;
        const book = ePub(url);
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

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex flex-col items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden" style={{ height: "90vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-arena-border bg-[#1a1a2e]">
          <span className="text-white font-semibold text-sm">EPUB-Reader</span>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none" aria-label="Schließen">✕</button>
        </div>

        {/* Viewer */}
        <div className="flex-1 relative overflow-hidden bg-white">
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
            <div ref={viewerRef} className="w-full h-full" />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-arena-border bg-gray-50">
          <button onClick={prevPage} disabled={loading || !!error} className="btn btn-secondary btn-sm disabled:opacity-40">← Zurück</button>
          {totalPages > 0 && (
            <span className="text-xs text-arena-muted">{currentPage} / {totalPages}</span>
          )}
          <button onClick={nextPage} disabled={loading || !!error} className="btn btn-secondary btn-sm disabled:opacity-40">Weiter →</button>
        </div>
      </div>
    </div>
  );
}
