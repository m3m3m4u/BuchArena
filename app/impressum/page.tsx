import Link from "next/link";

export default function ImpressumPage() {
  return (
    <main className="centered-main">
      <section className="w-full max-w-[1100px] rounded-[14px] bg-white px-12 py-10 box-border max-sm:px-5 max-sm:py-6">
        <h1 className="mb-8 border-b-2 border-gray-200 pb-4 text-3xl max-sm:text-2xl">Impressum</h1>

        <div className="mb-8">
          <h2 className="mb-3 text-xl text-arena-text">Angaben gemäß § 5 ECG</h2>
          <div className="space-y-0.5">
            <p className="m-0">Matthias Gmeiner</p>
            <p className="m-0">Herrengutgasse 16b</p>
            <p className="m-0">6923 Lauterach</p>
            <p className="m-0">Österreich</p>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="mb-3 text-xl text-arena-text">Kontakt</h2>
          <p className="my-2 leading-relaxed text-[#444]">
            E-Mail:{" "}
            <a href="mailto:info@erklaerung-und-mehr.org" className="text-arena-link no-underline hover:underline">
              info@erklaerung-und-mehr.org
            </a>
          </p>
        </div>

        <div className="mb-8">
          <h2 className="mb-3 text-xl text-arena-text">Haftungsausschluss</h2>
          <p className="my-2 leading-relaxed text-[#444]">
            Die Inhalte dieser Website wurden mit größtmöglicher Sorgfalt
            erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der
            Inhalte übernehmen wir jedoch keine Gewähr.
          </p>
        </div>

        <div className="mt-10 border-t border-gray-200 pt-6">
          <Link href="/" className="font-medium text-arena-link no-underline hover:underline">
            ← Zurück zur Startseite
          </Link>
        </div>
      </section>
    </main>
  );
}
