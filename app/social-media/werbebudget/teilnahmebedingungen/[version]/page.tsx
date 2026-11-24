import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AD_BUDGET_POLICIES } from "@/lib/werbebudget-terms";

export const metadata: Metadata = { title: "Teilnahmebedingungen – 100 € Werbebudget | BuchArena" };

export default async function AdBudgetTermsPage({ params }: { params: Promise<{ version: string }> }) {
  const { version } = await params;
  const policy = Object.hasOwn(AD_BUDGET_POLICIES, version) ? AD_BUDGET_POLICIES[version] : null;
  if (!policy) notFound();
  return <main className="top-centered-main"><article className="card font-sans grid gap-6">
    <Link href="/social-media/werbebudget" className="text-sm text-arena-link underline">← Zur Bewerbung</Link>
    <header>
      <h1 className="text-2xl font-extrabold text-arena-blue">Teilnahmebedingungen – 100 € Werbebudget</h1>
      <p className="text-sm text-arena-muted">Stand: {policy.published} · Version: {version}</p>
    </header>
    <nav className="flex flex-wrap gap-4 text-sm" aria-label="Rechtliche Hinweise">
      <a href="#bedingungen" className="text-arena-link underline">Teilnahmebedingungen</a>
      <a href="#datenschutz" className="text-arena-link underline">Datenschutzhinweise zur Aktion</a>
      <Link href="/impressum" className="text-arena-link underline">Impressum</Link>
    </nav>
    <div id="bedingungen" className="grid gap-5 scroll-mt-6">
      {policy.terms.map((section) => <section key={section.title} className="grid gap-2">
        <h2 className="text-lg font-bold text-arena-blue m-0">{section.title}</h2>
        {section.paragraphs.map((paragraph) => <p key={paragraph} className="text-sm leading-relaxed m-0">{paragraph}</p>)}
      </section>)}
    </div>
    <section id="datenschutz" className="grid gap-5 border-t pt-5 scroll-mt-6">
      <h2 className="text-xl font-bold text-arena-blue m-0">Datenschutzhinweise zur Monatsaktion</h2>
      {policy.privacy.map((section) => <section key={section.title} className="grid gap-2">
        <h3 className="text-base font-bold m-0">{section.title}</h3>
        {section.paragraphs.map((paragraph) => <p key={paragraph} className="text-sm leading-relaxed m-0">{paragraph}</p>)}
      </section>)}
      <Link href="/impressum#datenschutz" className="text-sm text-arena-link underline">Allgemeine Datenschutzerklärung der BuchArena</Link>
    </section>
  </article></main>;
}
