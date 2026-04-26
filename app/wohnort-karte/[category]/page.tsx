import Link from "next/link";
import MapClient from "./map-client";

type Category = "autoren" | "blogger" | "testleser" | "sprecher" | "lektoren" | "verlage";

const CATEGORY_CONFIG: Record<Category, { label: string; backHref: string }> = {
  autoren:   { label: "Autoren",     backHref: "/autoren" },
  blogger:   { label: "Buchblogger", backHref: "/blogger" },
  testleser: { label: "Testleser",   backHref: "/testleser" },
  sprecher:  { label: "Sprecher",    backHref: "/sprecher" },
  lektoren:  { label: "Lektoren",    backHref: "/lektoren" },
  verlage:   { label: "Verlage",     backHref: "/verlage" },
};

export default async function WohnortKartePage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const config = CATEGORY_CONFIG[category as Category];

  if (!config) {
    return (
      <main className="top-centered-main">
        <section className="card">
          <p>Unbekannte Kategorie.</p>
          <Link href="/" className="btn btn-sm">← Startseite</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="top-centered-main">
      <section className="card">
        <div className="mb-4">
          <Link href={config.backHref} className="btn btn-sm">← Zurück zu {config.label}</Link>
        </div>
        <MapClient category={category as Category} categoryLabel={config.label} />
      </section>
    </main>
  );
}
