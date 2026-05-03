"use client";

import { useEffect, useState } from "react";

type Empfehlung = {
  id: string;
  username: string;
  displayName: string;
  text: string;
  createdAt: string;
};

type Props = {
  profileType: "lektor" | "sprecher" | "testleser" | "blogger";
  profileUsername: string;
  loggedInUsername: string;
  isProfileOwner: boolean;
};

export default function ProfileEmpfehlungenBlock({
  profileType,
  profileUsername,
  loggedInUsername,
  isProfileOwner,
}: Props) {
  const [empfehlungen, setEmpfehlungen] = useState<Empfehlung[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [empText, setEmpText] = useState("");
  const [empBusy, setEmpBusy] = useState(false);
  const [empMsg, setEmpMsg] = useState("");
  const [alreadyRecommended, setAlreadyRecommended] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const isLoggedIn = !!loggedInUsername;

  useEffect(() => {
    if (!profileUsername) return;
    setIsLoading(true);
    fetch(
      `/api/profilempfehlungen?type=${profileType}&profileUsername=${encodeURIComponent(profileUsername)}`
    )
      .then((r) => r.json() as Promise<{ empfehlungen?: Empfehlung[] }>)
      .then((data) => {
        const list = data.empfehlungen ?? [];
        setEmpfehlungen(list);
        if (loggedInUsername) {
          setAlreadyRecommended(list.some((e) => e.username === loggedInUsername));
        }
      })
      .catch(() => {/* still render empty */})
      .finally(() => setIsLoading(false));
  }, [profileType, profileUsername, loggedInUsername]);

  async function submitEmpfehlung() {
    if (!empText.trim()) return;
    setEmpBusy(true);
    setEmpMsg("");
    try {
      const res = await fetch("/api/profilempfehlungen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: profileType, profileUsername, text: empText.trim() }),
      });
      const data = (await res.json()) as { message?: string; lesezeichen?: number };
      if (!res.ok) throw new Error(data.message ?? "Fehler");
      const lz = data.lesezeichen ?? 0;
      setEmpMsg(lz > 0 ? `Empfehlung gespeichert! +${lz} Lesezeichen` : "Empfehlung gespeichert!");
      setAlreadyRecommended(true);
      setEmpText("");
      // Neu laden
      const r2 = await fetch(
        `/api/profilempfehlungen?type=${profileType}&profileUsername=${encodeURIComponent(profileUsername)}`
      );
      const d2 = (await r2.json()) as { empfehlungen?: Empfehlung[] };
      setEmpfehlungen(d2.empfehlungen ?? []);
    } catch (err) {
      setEmpMsg(err instanceof Error ? err.message : "Fehler beim Speichern.");
    } finally {
      setEmpBusy(false);
    }
  }

  async function saveEdit(id: string) {
    if (!editText.trim()) return;
    setEmpBusy(true);
    try {
      const res = await fetch("/api/profilempfehlungen", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, text: editText.trim() }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { message?: string };
        throw new Error(d.message ?? "Fehler");
      }
      setEmpfehlungen((prev) =>
        prev.map((e) => (e.id === id ? { ...e, text: editText.trim() } : e))
      );
      setEditingId(null);
      setEditText("");
    } catch (err) {
      setEmpMsg(err instanceof Error ? err.message : "Fehler beim Bearbeiten.");
    } finally {
      setEmpBusy(false);
    }
  }

  async function deleteEmpfehlung(id: string) {
    if (!confirm("Empfehlung wirklich löschen?")) return;
    try {
      const res = await fetch(`/api/profilempfehlungen?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = (await res.json()) as { message?: string };
        throw new Error(d.message ?? "Fehler");
      }
      setEmpfehlungen((prev) => prev.filter((e) => e.id !== id));
      if (empfehlungen.find((e) => e.id === id)?.username === loggedInUsername) {
        setAlreadyRecommended(false);
      }
    } catch (err) {
      setEmpMsg(err instanceof Error ? err.message : "Fehler beim Löschen.");
    }
  }

  return (
    <div className="mt-8 border-t border-arena-border-light pt-6">
      <h2 className="mb-3 text-lg">Empfehlungen</h2>

      {isLoggedIn && !isProfileOwner && !alreadyRecommended && (
        <div className="mb-4 rounded-lg border border-arena-border-light bg-[#fafafa] p-4">
          <textarea
            className="input w-full"
            rows={3}
            maxLength={2000}
            placeholder="Schreibe eine Empfehlung für dieses Profil …"
            value={empText}
            onChange={(e) => setEmpText(e.target.value)}
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              className="btn"
              disabled={empBusy || !empText.trim()}
              onClick={submitEmpfehlung}
            >
              {empBusy ? "Wird gespeichert …" : "Empfehlung abschicken"}
            </button>
            {empMsg && <span className="text-sm text-arena-muted">{empMsg}</span>}
          </div>
          <p className="mt-1 text-xs text-arena-muted">
            +1 Lesezeichen für dich und den Profilinhaber (max. 3 pro Tag)
          </p>
        </div>
      )}

      {isLoggedIn && !isProfileOwner && alreadyRecommended && !empMsg && (
        <p className="mb-4 text-sm text-arena-muted">Du hast dieses Profil bereits empfohlen.</p>
      )}
      {empMsg && !empBusy && <p className="mb-4 text-sm text-arena-muted">{empMsg}</p>}

      {isLoading ? (
        <p className="text-sm text-arena-muted">Lade Empfehlungen …</p>
      ) : empfehlungen.length === 0 ? (
        <p className="text-sm text-arena-muted">
          Noch keine Empfehlungen.{" "}
          {!isLoggedIn && "Melde dich an, um die erste zu schreiben!"}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {empfehlungen.map((e) => {
            const isOwn = loggedInUsername === e.username;
            const canDelete = isOwn || isProfileOwner;
            const isEditing = editingId === e.id;

            return (
              <div
                key={e.id}
                className="rounded-lg border border-arena-border-light bg-[#fafafa] p-4"
              >
                <div className="mb-1 flex items-baseline gap-2 flex-wrap">
                  <span className="font-medium">{e.displayName}</span>
                  <span className="text-xs text-arena-muted">
                    {new Date(e.createdAt).toLocaleDateString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                  {isLoggedIn && (isOwn || canDelete) && !isEditing && (
                    <span className="ml-auto flex gap-2 text-xs">
                      {isOwn && (
                        <button
                          className="text-arena-muted hover:text-arena-text underline"
                          onClick={() => {
                            setEditingId(e.id);
                            setEditText(e.text);
                          }}
                        >
                          Bearbeiten
                        </button>
                      )}
                      {canDelete && (
                        <button
                          className="text-red-600 hover:text-red-800 underline"
                          onClick={() => deleteEmpfehlung(e.id)}
                        >
                          Löschen
                        </button>
                      )}
                    </span>
                  )}
                </div>
                {isEditing ? (
                  <div>
                    <textarea
                      className="input w-full"
                      rows={3}
                      maxLength={2000}
                      value={editText}
                      onChange={(ev) => setEditText(ev.target.value)}
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        className="btn"
                        disabled={empBusy || !editText.trim()}
                        onClick={() => saveEdit(e.id)}
                      >
                        {empBusy ? "Speichern …" : "Speichern"}
                      </button>
                      <button
                        className="btn"
                        onClick={() => {
                          setEditingId(null);
                          setEditText("");
                        }}
                      >
                        Abbrechen
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="m-0 whitespace-pre-line text-[0.95rem] [overflow-wrap:break-word]">
                    {e.text}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
