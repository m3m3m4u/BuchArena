"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ROLLE_LABELS, ROLLE_PROFILE_PATH, type KooperationsRolle } from "@/lib/kooperationen";

const VALID_ROLES: { value: KooperationsRolle; label: string }[] = [
  { value: "autor", label: "Autor/in" },
  { value: "sprecher", label: "Sprecher/in" },
  { value: "blogger", label: "Blogger/in" },
  { value: "testleser", label: "Testleser/in" },
  { value: "lektor", label: "Lektor/in" },
  { value: "verlag", label: "Verlag" },
];

type KooperationItem = {
  id: string;
  partnerUsername: string;
  partnerDisplayName: string;
  partnerProfileImage: string;
  partnerRole: KooperationsRolle;
  partnerRoleLabel: string;
  myRole: KooperationsRolle;
  myRoleLabel: string;
  status: string;
  iAmRequester: boolean;
  createdAt: string;
};

type SearchUser = {
  username: string;
  displayName: string;
  profileImage: string;
};

export default function KooperationenTab({ username }: { username: string }) {
  const [kooperationen, setKooperationen] = useState<KooperationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Neue Kooperation hinzufügen
  const [myRole, setMyRole] = useState<KooperationsRolle>("autor");
  const [partnerRole, setPartnerRole] = useState<KooperationsRolle>("sprecher");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadKooperationen = useCallback(async () => {
    try {
      const res = await fetch("/api/kooperationen/list");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setKooperationen(data.kooperationen ?? []);
    } catch {
      setMessage("Kooperationen konnten nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (username) void loadKooperationen();
  }, [username, loadKooperationen]);

  // Debounced Suche
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (searchQuery.length < 1) {
      setSearchResults([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/kooperationen/search-users?q=${encodeURIComponent(searchQuery)}&role=${encodeURIComponent(partnerRole)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.users ?? []);
        }
      } catch { /* ignore */ }
      setIsSearching(false);
    }, 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [searchQuery, partnerRole]);

  async function handleRequest(partnerUsername: string) {
    setIsSending(true);
    setMessage("");
    try {
      const res = await fetch("/api/kooperationen/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerUsername, myRole, partnerRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Fehler");
      setMessage(data.message);
      setSearchQuery("");
      setSearchResults([]);
      void loadKooperationen();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Fehler beim Senden.");
    } finally {
      setIsSending(false);
    }
  }

  async function handleConfirm(id: string) {
    try {
      const res = await fetch("/api/kooperationen/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Fehler");
      setMessage(data.message);
      void loadKooperationen();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Fehler.");
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Kooperation wirklich entfernen?")) return;
    try {
      const res = await fetch(`/api/kooperationen/remove?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Fehler");
      setMessage(data.message);
      void loadKooperationen();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Fehler.");
    }
  }

  const pending = kooperationen.filter((k) => k.status === "pending");
  const confirmed = kooperationen.filter((k) => k.status === "confirmed");

  return (
    <div>
      <h2 className="text-lg mt-0">Kooperationspartner</h2>
      <p className="text-arena-muted text-[0.95rem]">
        Gib hier an, mit wem du erfolgreich zusammengearbeitet hast. Dein Partner bekommt eine Nachricht und muss die Kooperation bestätigen – erst dann wird sie auf beiden Profilen angezeigt.
      </p>

      {message && (
        <p className={`text-sm my-2 ${message.includes("Fehler") || message.includes("nicht") ? "text-red-700" : "text-green-700"}`}>
          {message}
        </p>
      )}

      {/* Neue Kooperation hinzufügen */}
      <div className="rounded-lg border border-arena-border p-4 my-4 bg-gray-50">
        <h3 className="text-base mt-0 mb-3">Neuen Partner hinzufügen</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold">Meine Rolle</span>
            <select
              className="input-base w-full mt-1"
              value={myRole}
              onChange={(e) => setMyRole(e.target.value as KooperationsRolle)}
            >
              {VALID_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Rolle des Partners</span>
            <select
              className="input-base w-full mt-1"
              value={partnerRole}
              onChange={(e) => setPartnerRole(e.target.value as KooperationsRolle)}
            >
              {VALID_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="block mt-3">
          <span className="text-sm font-semibold">Partner suchen (Benutzername)</span>
          <input
            className="input-base w-full mt-1"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Benutzernamen eingeben…"
            maxLength={50}
          />
        </label>
        {isSearching && <p className="text-xs text-arena-muted mt-1">Suche …</p>}
        {searchResults.length > 0 && (
          <div className="mt-2 rounded-lg border border-arena-border bg-white max-h-60 overflow-y-auto">
            {searchResults.map((u) => (
              <div key={u.username} className="flex items-center justify-between gap-2 px-3 py-2 border-b border-arena-border last:border-b-0">
                <div className="flex items-center gap-2 min-w-0">
                  {u.profileImage ? (
                    <div
                      className="h-8 w-8 rounded-full bg-arena-bg border border-arena-border flex-shrink-0"
                      style={{ backgroundImage: `url(${u.profileImage})`, backgroundSize: "cover", backgroundPosition: "center" }}
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-200 border border-arena-border flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.displayName}</p>
                    <p className="text-xs text-arena-muted truncate">@{u.username}</p>
                  </div>
                </div>
                <button
                  className="btn btn-sm btn-primary flex-shrink-0"
                  disabled={isSending}
                  onClick={() => handleRequest(u.username)}
                >
                  Anfragen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <p>Lade Kooperationen …</p>
      ) : (
        <>
          {/* Offene Anfragen an mich */}
          {pending.filter((k) => !k.iAmRequester).length > 0 && (
            <div className="my-4">
              <h3 className="text-base mb-2">Offene Anfragen an dich</h3>
              {pending.filter((k) => !k.iAmRequester).map((k) => (
                <div key={k.id} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-arena-border mb-2 bg-yellow-50">
                  <div className="min-w-0">
                    <p className="text-sm">
                      <strong>{k.partnerDisplayName}</strong> ({k.partnerRoleLabel}) möchte dich als <strong>{k.myRoleLabel}</strong> als Partner angeben.
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button className="btn btn-sm btn-primary" onClick={() => handleConfirm(k.id)}>Bestätigen</button>
                    <button className="btn btn-sm" onClick={() => handleRemove(k.id)}>Ablehnen</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Meine offenen Anfragen */}
          {pending.filter((k) => k.iAmRequester).length > 0 && (
            <div className="my-4">
              <h3 className="text-base mb-2">Deine offenen Anfragen</h3>
              {pending.filter((k) => k.iAmRequester).map((k) => (
                <div key={k.id} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-arena-border mb-2 bg-gray-50">
                  <div className="min-w-0">
                    <p className="text-sm">
                      An <strong>{k.partnerDisplayName}</strong> ({k.partnerRoleLabel}) – wartet auf Bestätigung
                    </p>
                  </div>
                  <button className="btn btn-sm" onClick={() => handleRemove(k.id)}>Zurückziehen</button>
                </div>
              ))}
            </div>
          )}

          {/* Bestätigte Kooperationen */}
          <div className="my-4">
            <h3 className="text-base mb-2">Bestätigte Kooperationen</h3>
            {confirmed.length === 0 ? (
              <p className="text-sm text-arena-muted">Noch keine bestätigten Kooperationen.</p>
            ) : (
              <div className="space-y-2">
                {confirmed.map((k) => (
                  <div key={k.id} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-arena-border">
                    <div className="flex items-center gap-2 min-w-0">
                      {k.partnerProfileImage ? (
                        <div
                          className="h-8 w-8 rounded-full bg-arena-bg border border-arena-border flex-shrink-0"
                          style={{ backgroundImage: `url(${k.partnerProfileImage})`, backgroundSize: "cover", backgroundPosition: "center" }}
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-200 border border-arena-border flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <Link
                          href={`${ROLLE_PROFILE_PATH[k.partnerRole]}/${encodeURIComponent(k.partnerUsername)}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {k.partnerDisplayName}
                        </Link>
                        <p className="text-xs text-arena-muted">{k.partnerRoleLabel}</p>
                      </div>
                    </div>
                    <button className="btn btn-sm" onClick={() => handleRemove(k.id)}>Entfernen</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
