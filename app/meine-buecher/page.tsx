"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MeineBuecherRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/profil?tab=buecher");
  }, [router]);

  return (
    <main className="centered-main">
      <section className="card">
        <p>Weiterleitung zum Profil ...</p>
      </section>
    </main>
  );
}

