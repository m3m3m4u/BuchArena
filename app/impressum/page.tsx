import Link from "next/link";

export default function ImpressumPage() {
  return (
    <main className="centered-main">
      <section className="impressum">
        <h1>Impressum</h1>
        <p>Matthias Gmeiner</p>
        <p>Herrengutgasse 16b</p>
        <p>6923 Lauterach</p>
        <p>Österreich</p>
        <p>E-Mail: info@erklaerung-und-mehr.org</p>
        <p>
          <Link href="/">Zurück zur Startseite</Link>
        </p>
      </section>
    </main>
  );
}
