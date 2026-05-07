"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type PromoContentItem = {
  id: string;
  title: string;
  mediaType: "image" | "video";
  files?: Array<{
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }>;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  captions: [string, string, string];
  createdAt: string;
};

type PromoContentBrowserProps = {
  mediaType: "image" | "video";
  title: string;
  description: string;
  itemId?: string;
};

function formatBytes(size: number) {
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getItemFiles(item: PromoContentItem) {
  if (Array.isArray(item.files) && item.files.length > 0) return item.files;
  return [{
    fileUrl: item.fileUrl,
    fileName: item.fileName,
    fileSize: item.fileSize,
    mimeType: item.mimeType,
  }];
}

export default function PromoContentBrowser({ mediaType, title, description, itemId }: PromoContentBrowserProps) {
  const [items, setItems] = useState<PromoContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCaption, setCopiedCaption] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/social-media/promo-content")
      .then((r) => r.json())
      .then((d: { items?: PromoContentItem[] }) => setItems(d.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredItems = useMemo(
    () => items.filter((item) => item.mediaType === mediaType),
    [items, mediaType],
  );
  const selectedItem = useMemo(
    () => filteredItems.find((item) => item.id === itemId) ?? null,
    [filteredItems, itemId],
  );
  const categoryPath = mediaType === "video" ? "/social-media/fertige-inhalte/reels" : "/social-media/fertige-inhalte/beitraege";
  const categoryLabel = mediaType === "video" ? "Reels" : "Beiträge";

  async function copyCaption(itemId: string, captionIndex: number, caption: string) {
    try {
      await navigator.clipboard.writeText(caption);
      const key = `${itemId}-${captionIndex}`;
      setCopiedCaption(key);
      window.setTimeout(() => {
        setCopiedCaption((current) => (current === key ? null : current));
      }, 2000);
    } catch {
      setCopiedCaption(null);
    }
  }

  return (
    <main className="top-centered-main">
      <section className="card grid gap-5">
        <div className="grid gap-2">
          <h1 className="text-xl font-bold m-0">{title}</h1>
          <p className="text-[0.95rem] text-arena-muted leading-relaxed m-0">{description}</p>
        </div>

        <div className="rounded-xl border-2 border-arena-blue/30 bg-arena-blue/5 p-6">
          <h2 className="text-lg font-bold m-0 mb-3">Download plus Caption</h2>
          <p className="m-0 text-[0.95rem] leading-relaxed">
            Lade die Datei herunter und kopiere darunter einen Caption-Vorschlag.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-arena-muted">Lade Inhalte…</p>
        ) : filteredItems.length === 0 ? (
          <p className="text-sm text-arena-muted">Aktuell sind in diesem Bereich noch keine Inhalte verfügbar.</p>
        ) : !itemId ? (
          <div className="grid gap-4">
            {filteredItems.map((item) => (
              <Link
                key={item.id}
                href={`${categoryPath}/${item.id}`}
                className="rounded-xl border border-arena-border-light bg-white p-5 no-underline text-inherit transition-transform hover:-translate-y-0.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="grid gap-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-arena-blue m-0">{categoryLabel}</p>
                    <h3 className="text-lg font-bold m-0">{item.title}</h3>
                    <p className="text-sm text-arena-muted m-0">
                      {item.mediaType === "video"
                        ? `Reel · ${formatBytes(item.fileSize)}`
                        : `${getItemFiles(item).length} Bild${getItemFiles(item).length === 1 ? "" : "er"}`}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-arena-blue">Titel öffnen →</span>
                </div>
              </Link>
            ))}
          </div>
        ) : !selectedItem ? (
          <p className="text-sm text-arena-muted">Dieser Inhalt wurde nicht gefunden oder ist nicht mehr verfügbar.</p>
        ) : (
          (() => {
            const mediaWrapperClass = selectedItem.mediaType === "video"
              ? "mx-auto w-full max-w-[26rem]"
              : "grid gap-3";
            const detailLayoutClass = selectedItem.mediaType === "video"
              ? "grid gap-5 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] xl:items-start"
              : "grid gap-5";
            const captionListClass = selectedItem.mediaType === "video"
              ? "grid gap-3"
              : "grid gap-3 xl:grid-cols-3";

            return (
              <article className="rounded-xl border border-arena-border-light bg-white p-5 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-arena-text text-base m-0">{selectedItem.title}</p>
                    <p className="text-sm text-arena-muted m-0 mt-1">
                      {selectedItem.mediaType === "video"
                        ? `Reel · ${formatBytes(selectedItem.fileSize)}`
                        : `${getItemFiles(selectedItem).length} Bild${getItemFiles(selectedItem).length === 1 ? "" : "er"}`}
                    </p>
                  </div>
                  <a
                    href={selectedItem.fileUrl}
                    download={selectedItem.fileName}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-arena-blue text-white text-sm font-medium hover:bg-arena-blue-light transition-colors no-underline"
                  >
                    ↓ Download
                  </a>
                </div>

                <div className={detailLayoutClass}>
                  <div className={mediaWrapperClass}>
                    {selectedItem.mediaType === "video" ? (
                      <video controls className="w-full rounded-xl border border-arena-border-light bg-black" src={selectedItem.fileUrl} />
                    ) : (
                      getItemFiles(selectedItem).map((file, index) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={`${selectedItem.id}-${index}`} src={file.fileUrl} alt={`${selectedItem.title} ${index + 1}`} className="w-full rounded-xl border border-arena-border-light object-cover" />
                      ))
                    )}
                  </div>

                  <div className="grid gap-3">
                    <h3 className="text-[1rem] font-bold m-0">Caption-Vorschläge</h3>
                    <div className={captionListClass}>
                      {selectedItem.captions.map((caption, index) => {
                        const copyKey = `${selectedItem.id}-${index}`;
                        return (
                          <div key={copyKey} className="rounded-xl border border-arena-border-light bg-arena-bg p-4">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <p className="text-sm font-semibold text-arena-text m-0">Vorschlag {index + 1}</p>
                              <button
                                type="button"
                                onClick={() => void copyCaption(selectedItem.id, index, caption)}
                                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-arena-border-light text-sm font-medium cursor-pointer hover:border-arena-blue hover:text-arena-blue transition-colors"
                              >
                                {copiedCaption === copyKey ? "Kopiert" : "Caption kopieren"}
                              </button>
                            </div>
                            <p className="m-0 text-[0.92rem] leading-relaxed text-arena-muted whitespace-pre-wrap">{caption}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </article>
            );
          })()
        )}

        <div className="flex flex-wrap items-center gap-4">
          <Link href={itemId ? categoryPath : "/social-media/fertige-inhalte"} className="text-arena-link text-sm no-underline hover:underline">
            ← {itemId ? `Zurück zu ${categoryLabel}` : "Zurück zur Übersicht fertiger Inhalte"}
          </Link>
          <Link href="/social-media" className="text-arena-link text-sm no-underline hover:underline">
            Zurück zu Reels und Beiträge für Social Media
          </Link>
        </div>
      </section>
    </main>
  );
}