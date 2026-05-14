"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getStoredAccount } from "@/lib/client-account";

type Teilnehmer = {
  username: string;
  displayName: string;
  angemeldetAt: string;
  adresse?: string;
};

type GewinnspielInfo = {
  buchTitel: string;
  autorName: string;
  status: string;
  gewinnerName?: string;
  teilnehmerAnzahl: number;
};

export default function TeilnehmerPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [liste, setListe] = useState<Teilnehmer[]>([]);
  const [info, setInfo] = useState<GewinnspielInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const acc = getStoredAccount();
    if (!acc || (acc.role !== "ADMIN" && acc.role !== "SUPERADMIN")) {
      // Autoren dürfen auch – API prüft das serverseitig
    }

    Promise.all([
      fetch(`/api/gewinnspiele/${id}`).then((r) => r.json()),
      fetch(`/api/gewinnspiele/${id}/teilnehmer`).then((r) => r.json()),
    ]).then(([gInfo, tList]) => {
      setInfo(gInfo as GewinnspielInfo);
      if (Array.isArray(tList)) setListe(tList as Teilnehmer[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  function fmtDt(iso: string) {
    return new Date(iso).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  if (loading) return <main className="site-shell py-10 text-center text-sm opacity-60">Lade…</main>;

  return (
    <main className="site-shell py-8">
      <Link href="/admin/gewinnspiele" className="text-sm opacity-60 hover:opacity-100 mb-4 inline-block">← Admin-Übersicht</Link>

      <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--color-arena-blue)" }}>Teilnehmer</h1>
      {info && (
        <p className="text-sm opacity-70 mb-4">{info.buchTitel} · {liste.length} Teilnehmer</p>
      )}

      {info?.gewinnerName && (
        <div className="mb-4 p-3 rounded font-bold text-center"
          style={{ background: "var(--color-arena-yellow)", color: "var(--color-arena-blue)" }}>
          Gewinner: {info.gewinnerName}
        </div>
      )}

      {liste.length === 0 ? (
        <p className="text-sm opacity-60">Noch keine Teilnehmer.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden" style={{ borderColor: "var(--color-arena-border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--color-arena-blue)", color: "white" }}>
                <th className="text-left px-3 py-2 font-medium">#</th>
                <th className="text-left px-3 py-2 font-medium">Name</th>
                <th className="text-left px-3 py-2 font-medium">Username</th>
                <th className="text-left px-3 py-2 font-medium">Angemeldet</th>
                <th className="text-left px-3 py-2 font-medium">Adresse</th>
              </tr>
            </thead>
            <tbody>
              {liste.map((t, i) => (
                <tr key={t.username} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} ${info?.gewinnerName === t.displayName ? "!bg-yellow-50 font-bold" : ""}`}>
                  <td className="px-3 py-2 opacity-50">{i + 1}</td>
                  <td className="px-3 py-2">{t.displayName}</td>
                  <td className="px-3 py-2 opacity-60">@{t.username}</td>
                  <td className="px-3 py-2 opacity-60">{fmtDt(t.angemeldetAt)}</td>
                  <td className="px-3 py-2 opacity-70 text-xs">{t.adresse ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
