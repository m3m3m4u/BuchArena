import Link from "next/link";

export default function ImpressumPage() {
  return (
    <main className="centered-main">
      <section className="legal-page">
        <h1>Impressum</h1>

        <div className="legal-section">
          <h2>Angaben gemäß § 5 ECG</h2>
          <div className="legal-address">
            <p>Matthias Gmeiner</p>
            <p>Herrengutgasse 16b</p>
            <p>6923 Lauterach</p>
            <p>Österreich</p>
          </div>
        </div>

        <div className="legal-section">
          <h2>Kontakt</h2>
          <p>
            E-Mail:{" "}
            <a href="mailto:info@erklaerung-und-mehr.org">
              info@erklaerung-und-mehr.org
            </a>
          </p>
        </div>

        <div className="legal-section">
          <h2>Haftungsausschluss</h2>
          <p>
            Die Inhalte dieser Website wurden mit größtmöglicher Sorgfalt
            erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der
            Inhalte übernehmen wir jedoch keine Gewähr.
          </p>
        </div>

        <div className="legal-back">
          <Link href="/">← Zurück zur Startseite</Link>
        </div>
      </section>
    </main>
  );
}
