"use client";

import { useEffect, useRef, useState } from "react";
import { getStoredAccount } from "@/lib/client-account";

interface GalleryItem {
  id: string;
  label: string;
  src: string;
  order: number;
  createdAt?: string;
}

export default function AdminSocialMediaGalleryPage() {
  const [isAdmin,  setIsAdmin]  = useState<boolean | null>(null);
  const [items,    setItems]    = useState<GalleryItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [labelInput, setLabelInput] = useState("");
  const [saving,   setSaving]   = useState(false);
  const [editId,   setEditId]   = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const acc = getStoredAccount();
    const ok  = acc?.role === "ADMIN" || acc?.role === "SUPERADMIN";
    setIsAdmin(ok);
    if (ok) loadItems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadItems() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/social-media/gallery");
      if (res.ok) setItems(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function addItem() {
    const file = fileRef.current?.files?.[0];
    if (!file || !labelInput.trim()) return;
    setSaving(true);
    try {
      const src = await fileToDataUrl(file);
      const res = await fetch("/api/admin/social-media/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: labelInput.trim(), src }),
      });
      if (res.ok) {
        const item = await res.json() as GalleryItem;
        setItems((p) => [...p, item]);
        setLabelInput("");
        if (fileRef.current) fileRef.current.value = "";
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveLabel(id: string) {
    if (!editLabel.trim()) return;
    await fetch("/api/admin/social-media/gallery", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, label: editLabel.trim() }),
    });
    setItems((p) => p.map((i) => i.id === id ? { ...i, label: editLabel.trim() } : i));
    setEditId(null);
  }

  async function moveItem(id: string, dir: "up" | "down") {
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const other = dir === "up" ? idx - 1 : idx + 1;
    if (other < 0 || other >= items.length) return;

    const next = [...items];
    [next[idx], next[other]] = [next[other], next[idx]];
    // update order numbers
    const updated = next.map((item, i) => ({ ...item, order: i }));
    setItems(updated);

    await Promise.all([
      fetch("/api/admin/social-media/gallery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: updated[idx].id, order: updated[idx].order }),
      }),
      fetch("/api/admin/social-media/gallery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: updated[other].id, order: updated[other].order }),
      }),
    ]);
  }

  async function deleteItem(id: string) {
    setItems((p) => p.filter((i) => i.id !== id));
    await fetch(`/api/admin/social-media/gallery?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setDeleteConfirm(null);
  }

  if (isAdmin === null) return <div className="p-8 text-gray-500">Lade&hellip;</div>;
  if (!isAdmin) return <div className="p-8 text-red-600 font-semibold">Kein Zugriff.</div>;

  return (
    <main className="top-centered-main">
      <section className="card">
        <h1 className="text-xl font-bold mb-1">Bildgalerie &ndash; Social-Media-Editor</h1>
        <p className="text-sm text-arena-muted mb-5">
          Diese Bilder stehen den Nutzern im Beitrags-Editor als Vorlagen zur Verf&uuml;gung.
        </p>

        {/* Neues Bild hinzufügen */}
        <div className="rounded-lg border border-arena-border p-4 grid gap-3 mb-6">
          <p className="font-semibold text-sm">Neues Bild hinzuf&uuml;gen</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="grid gap-1">
              <label className="text-xs font-medium text-arena-muted">Bezeichnung</label>
              <input
                type="text"
                className="input"
                placeholder="z. B. Herbst-B&uuml;cher"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-medium text-arena-muted">Bilddatei (PNG, JPG, WebP)</label>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="input py-1.5 text-sm"
              />
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary w-fit px-6"
            disabled={saving || !labelInput.trim()}
            onClick={addItem}
          >
            {saving ? "Wird hochgeladen&hellip;" : "+ Hinzuf\u00fcgen"}
          </button>
        </div>

        {/* Galerie-Liste */}
        {loading ? (
          <p className="text-sm text-arena-muted">Lade&hellip;</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-arena-muted">Noch keine Bilder in der Galerie.</p>
        ) : (
          <ul className="grid gap-3">
            {items.map((item, idx) => (
              <li key={item.id} className="flex items-center gap-3 rounded-lg border border-arena-border p-3">
                {/* Vorschau */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.src}
                  alt={item.label}
                  className="w-16 h-16 object-cover rounded-md flex-shrink-0 border border-arena-border"
                />

                {/* Label / Edit */}
                <div className="flex-1 min-w-0">
                  {editId === item.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="input flex-1"
                        autoFocus
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveLabel(item.id);
                          if (e.key === "Escape") setEditId(null);
                        }}
                      />
                      <button type="button" className="btn btn-primary px-3" onClick={() => saveLabel(item.id)}>&#10003;</button>
                      <button type="button" className="btn px-3" onClick={() => setEditId(null)}>&times;</button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="text-sm font-medium truncate text-left hover:underline"
                      onClick={() => { setEditId(item.id); setEditLabel(item.label); }}
                    >
                      {item.label}
                    </button>
                  )}
                  <p className="text-xs text-arena-muted mt-0.5">Position {idx + 1}</p>
                </div>

                {/* Aktionen */}
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    className="btn text-sm px-2"
                    disabled={idx === 0}
                    onClick={() => moveItem(item.id, "up")}
                    title="Nach oben"
                  >↑</button>
                  <button
                    type="button"
                    className="btn text-sm px-2"
                    disabled={idx === items.length - 1}
                    onClick={() => moveItem(item.id, "down")}
                    title="Nach unten"
                  >↓</button>
                  <button
                    type="button"
                    className="btn text-sm px-2 text-red-600"
                    onClick={() => setDeleteConfirm(item.id)}
                  >L&ouml;schen</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Lösch-Bestätigung */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 grid gap-4">
            <h2 className="text-lg font-bold">Bild l&ouml;schen?</h2>
            <p className="text-sm text-arena-muted">
              Das Bild wird aus der Galerie entfernt. Bestehende Entw&uuml;rfe sind nicht betroffen.
            </p>
            <div className="flex gap-3 justify-end">
              <button type="button" className="btn px-5 py-2" onClick={() => setDeleteConfirm(null)}>Abbrechen</button>
              <button
                type="button"
                className="btn px-5 py-2 bg-red-600 text-white hover:bg-red-700 font-semibold rounded-lg"
                onClick={() => deleteItem(deleteConfirm)}
              >L&ouml;schen</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
