"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type PublicPartner = {
  username: string;
  displayName: string;
  profileImage: string;
  rolle: string;
  rolleLabel: string;
  profilePath: string;
};

/**
 * Zeigt bestätigte Kooperationspartner auf einer öffentlichen Profilseite.
 * @param username – Benutzername des Profils
 * @param isAutor – true → „Partner", false → „Autoren"
 */
export default function KooperationenAnzeige({ username, isAutor }: { username: string; isAutor: boolean }) {
  const [partners, setPartners] = useState<PublicPartner[]>([]);

  useEffect(() => {
    if (!username) return;
    fetch(`/api/kooperationen/public?username=${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((data) => setPartners(data.partners ?? []))
      .catch(() => {});
  }, [username]);

  if (partners.length === 0) return null;

  return (
    <div className="mt-6">
      <h2 className="text-base mb-2">
        {isAutor
          ? "Ich habe mit folgenden Partnern erfolgreich zusammengearbeitet:"
          : "Ich habe mit folgenden Autoren erfolgreich zusammengearbeitet:"}
      </h2>
      <ul className="list-none p-0 m-0 space-y-1.5">
        {partners.map((p) => (
          <li key={p.username}>
            <Link
              href={p.profilePath}
              className="inline-flex items-center gap-2 text-sm hover:underline"
            >
              <span className="font-medium">{p.displayName}</span>
              <span className="text-arena-muted">({p.rolleLabel})</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
