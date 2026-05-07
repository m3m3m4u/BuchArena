"use client";

import { useCallback, useEffect, useState } from "react";
import { getStoredAccount } from "@/lib/client-account";

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

function formatBytes(size: number) {
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getItemFiles(item: PromoContentItem) {
  if (Array.isArray(item.files) && item.files.length > 0) return item.files;
  return [{ fileUrl: item.fileUrl, fileName: item.fileName, fileSize: item.fileSize, mimeType: item.mimeType }];
}

export default function AdminSocialMediaContentPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [items, setItems] = useState<PromoContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const [title, setTitle] = useState("");
  const [caption1, setCaption1] = useState("");
  const [caption2, setCaption2] = useState("");
  const [caption3, setCaption3] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [editTitle, setEditTitle] = useState("");
  const [editCaptions, setEditCaptions] = useState<[string, string, string]>(["", "", ""]);
  const [selectedMediaType, setSelectedMediaType] = useState<"image" | "video" | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/social-media/promo-content");
      const data = (await res.json()) as { items?: PromoContentItem[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Fehler beim Laden.");
      setItems(data.items ?? []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Fehler beim Laden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const account = getStoredAccount();
    const allowed = account?.role === "ADMIN" || account?.role === "SUPERADMIN";
    setIsAdmin(allowed);
    if (allowed) {
      void loadItems();
    }
  }, [loadItems]);

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !caption1.trim() || !caption2.trim() || !caption3.trim() || files.length === 0) {
      setMessage("Bitte Titel, drei Captions und mindestens eine Datei angeben.");
      return;
    }

    setUploading(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("caption1", caption1.trim());
      formData.append("caption2", caption2.trim());
      formData.append("caption3", caption3.trim());
      for (const file of files) {
        formData.append("file", file);
      }

      const res = await fetch("/api/admin/social-media/promo-content", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as { item?: PromoContentItem; message?: string };
      if (!res.ok || !data.item) throw new Error(data.message ?? "Upload fehlgeschlagen.");

      setItems((prev) => [data.item!, ...prev]);
      setTitle("");
      setCaption1("");
      setCaption2("");
      setCaption3("");
      setFiles([]);
      const fileInput = document.getElementById("promo-content-file") as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
      setMessage("✓ Inhalt hochgeladen.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Diesen Inhalt wirklich löschen?")) return;
    const res = await fetch(`/api/social-media/promo-content?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = (await res.json()) as { message?: string };
    if (!res.ok) {
      setMessage(data.message ?? "Löschen fehlgeschlagen.");
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
    setSelectedItemId((current) => (current === id ? null : current));
  }

  function startEdit(item: PromoContentItem) {
    setEditId(item.id);
    setEditTitle(item.title);
    setEditCaptions([...item.captions] as [string, string, string]);
    setMessage("");
  }

  function cancelEdit() {
    setEditId(null);
    setEditTitle("");
    setEditCaptions(["", "", ""]);
  }

  async function handleSave(itemId: string) {
    if (!editTitle.trim() || editCaptions.some((caption) => !caption.trim())) {
      setMessage("Bitte Titel und alle drei Captions ausfüllen.");
      return;
    }

    setSavingId(itemId);
    setMessage("");
    try {
      const res = await fetch("/api/admin/social-media/promo-content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: itemId,
          title: editTitle.trim(),
          captions: editCaptions.map((caption) => caption.trim()),
        }),
      });
      const data = (await res.json()) as { item?: PromoContentItem; message?: string };
      if (!res.ok || !data.item) throw new Error(data.message ?? "Speichern fehlgeschlagen.");

      setItems((prev) => prev.map((item) => (item.id === itemId ? data.item! : item)));
      setMessage("✓ Inhalt aktualisiert.");
      cancelEdit();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
    } finally {
      setSavingId(null);
    }
  }

  if (isAdmin === null) return <div className="p-8 text-gray-500">Lade…</div>;
  if (!isAdmin) return <div className="p-8 text-red-600 font-semibold">Kein Zugriff.</div>;

  const filteredItems = selectedMediaType ? items.filter((item) => item.mediaType === selectedMediaType) : [];
  const selectedItem = selectedItemId ? filteredItems.find((item) => item.id === selectedItemId) ?? null : null;
  const selectedLabel = selectedMediaType === "video" ? "Reels" : "Beiträge";

  return (
    <main className="top-centered-main">
      <section className="card grid gap-6">
        <div>
          <h1 className="text-xl font-bold mb-1">Fertige Inhalte für Social Media</h1>
          <p className="text-sm text-arena-muted">
            Hier lädst du Bilder und Videos hoch, die Mitglieder im Tipps-Bereich direkt herunterladen und mit Caption-Vorschlägen nutzen können.
          </p>
        </div>

        <form onSubmit={handleUpload} className="rounded-xl border border-arena-border p-4 grid gap-3 bg-white">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-sm font-medium">Titel</span>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-medium">Datei</span>
              <input
                id="promo-content-file"
                type="file"
                accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime,.mov"
                multiple
                className="input py-2"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              />
            </label>
          </div>

          {files.length > 0 && (
            <p className="text-xs text-arena-muted m-0">
              {files.length} Datei(en) ausgewählt. Für Beiträge sind mehrere Bilder erlaubt, für Reels nur eine Videodatei.
            </p>
          )}

          <label className="grid gap-1">
            <span className="text-sm font-medium">Caption-Vorschlag 1</span>
            <textarea className="input min-h-24 py-2" value={caption1} onChange={(e) => setCaption1(e.target.value)} maxLength={600} />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-medium">Caption-Vorschlag 2</span>
            <textarea className="input min-h-24 py-2" value={caption2} onChange={(e) => setCaption2(e.target.value)} maxLength={600} />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-medium">Caption-Vorschlag 3</span>
            <textarea className="input min-h-24 py-2" value={caption3} onChange={(e) => setCaption3(e.target.value)} maxLength={600} />
          </label>

          <div className="flex items-center gap-3">
            <button type="submit" className="btn btn-primary px-6" disabled={uploading}>
              {uploading ? "Wird hochgeladen…" : "Inhalt hochladen"}
            </button>
            {message && <p className={`text-sm ${message.startsWith("✓") ? "text-green-700" : "text-red-600"}`}>{message}</p>}
          </div>
        </form>

        <div className="grid gap-3">
          <h2 className="text-base font-semibold">Vorhandene Inhalte ({items.length})</h2>
          {loading ? (
            <p className="text-sm text-arena-muted">Lade…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-arena-muted">Noch keine Inhalte vorhanden.</p>
          ) : !selectedMediaType ? (
            <div className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedMediaType("image");
                  setSelectedItemId(null);
                }}
                className="rounded-xl border border-arena-border bg-white p-5 text-left cursor-pointer hover:border-arena-blue"
              >
                <div className="grid gap-2">
                  <p className="text-sm font-semibold uppercase tracking-[0.12em] text-arena-blue m-0">Beiträge</p>
                  <h3 className="text-lg font-bold m-0">Fertige Bilder</h3>
                  <p className="text-sm text-arena-muted m-0">Öffne zuerst die Beitragsliste und klicke danach auf den gewünschten Titel.</p>
                  <span className="text-sm font-medium text-arena-blue">Zu den Beiträgen →</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedMediaType("video");
                  setSelectedItemId(null);
                }}
                className="rounded-xl border border-arena-border bg-white p-5 text-left cursor-pointer hover:border-arena-blue"
              >
                <div className="grid gap-2">
                  <p className="text-sm font-semibold uppercase tracking-[0.12em] text-arena-blue m-0">Reels</p>
                  <h3 className="text-lg font-bold m-0">Fertige Videos</h3>
                  <p className="text-sm text-arena-muted m-0">Öffne zuerst die Reelliste und klicke danach auf den gewünschten Titel.</p>
                  <span className="text-sm font-medium text-arena-blue">Zu den Reels →</span>
                </div>
              </button>
            </div>
          ) : !selectedItem ? (
            <div className="grid gap-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold m-0">{selectedLabel}</h3>
                <button type="button" className="btn" onClick={() => setSelectedMediaType(null)}>Zurück zur Übersicht</button>
              </div>

              {filteredItems.length === 0 ? (
                <p className="text-sm text-arena-muted">Noch keine Inhalte in diesem Bereich vorhanden.</p>
              ) : filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedItemId(item.id)}
                  className="rounded-xl border border-arena-border bg-white p-4 text-left cursor-pointer hover:border-arena-blue"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="grid gap-1">
                      <h4 className="font-semibold m-0">{item.title}</h4>
                      <p className="text-xs text-arena-muted m-0">
                        {item.mediaType === "video"
                          ? `${item.fileName} · ${formatBytes(item.fileSize)}`
                          : `${getItemFiles(item).length} Bild${getItemFiles(item).length === 1 ? "" : "er"}`}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-arena-blue">Titel öffnen →</span>
                  </div>
                </button>
              ))
              }
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="btn" onClick={() => setSelectedItemId(null)}>Zurück zu {selectedLabel}</button>
                <button type="button" className="btn" onClick={() => {
                  setSelectedMediaType(null);
                  setSelectedItemId(null);
                }}>Zurück zur Übersicht</button>
              </div>

              <article className="rounded-xl border border-arena-border bg-white p-4 grid gap-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    {editId === selectedItem.id ? (
                      <input
                        className="input w-full max-w-xl"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        maxLength={160}
                      />
                    ) : (
                      <h3 className="font-semibold m-0">{selectedItem.title}</h3>
                    )}
                    <p className="text-xs text-arena-muted mt-1 mb-0">
                      {(selectedItem.files?.length ?? 0) > 1
                        ? `${selectedItem.files?.length ?? 0} Bilder`
                        : `${selectedItem.fileName} · ${formatBytes(selectedItem.fileSize)}`}
                      {` · ${selectedItem.mediaType === "video" ? "Video" : "Bild"}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {editId === selectedItem.id ? (
                      <>
                        <button type="button" className="btn btn-primary" disabled={savingId === selectedItem.id} onClick={() => void handleSave(selectedItem.id)}>
                          {savingId === selectedItem.id ? "Speichert…" : "Speichern"}
                        </button>
                        <button type="button" className="btn" disabled={savingId === selectedItem.id} onClick={cancelEdit}>Abbrechen</button>
                      </>
                    ) : (
                      <button type="button" className="btn" onClick={() => startEdit(selectedItem)}>Bearbeiten</button>
                    )}
                    <button type="button" className="btn text-red-600" onClick={() => void handleDelete(selectedItem.id)}>Löschen</button>
                  </div>
                </div>

                {selectedItem.mediaType === "video" ? (
                  <video controls className="w-full max-w-md rounded-lg border border-arena-border" src={selectedItem.fileUrl} />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {getItemFiles(selectedItem).map((file, index) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={`${selectedItem.id}-${index}`} src={file.fileUrl} alt={`${selectedItem.title} ${index + 1}`} className="w-full rounded-lg border border-arena-border object-cover" />
                    ))}
                  </div>
                )}

                <div className="grid gap-2">
                  {(editId === selectedItem.id ? editCaptions : selectedItem.captions).map((caption, index) => (
                    <div key={`${selectedItem.id}-${index}`} className="grid gap-1">
                      <span className="text-xs font-medium text-arena-muted">Caption {index + 1}</span>
                      {editId === selectedItem.id ? (
                        <textarea
                          className="input min-h-24 py-2 text-sm"
                          value={editCaptions[index]}
                          maxLength={600}
                          onChange={(e) => setEditCaptions((prev) => prev.map((value, captionIndex) => (captionIndex === index ? e.target.value : value)) as [string, string, string])}
                        />
                      ) : (
                        <div className="rounded-lg bg-arena-bg px-3 py-2 text-sm text-arena-text whitespace-pre-wrap">
                          {caption}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </article>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}