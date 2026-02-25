import Link from "next/link";

export default function DatenschutzPage() {
  return (
    <main className="centered-main">
      <section className="w-full max-w-[1100px] rounded-[14px] bg-white px-12 py-10 box-border max-sm:px-5 max-sm:py-6">
        <h1 className="mb-8 border-b-2 border-gray-200 pb-4 text-3xl max-sm:text-2xl">Datenschutzerklärung</h1>

        <div className="mb-8">
          <h2 className="mb-3 text-xl text-arena-text">1. Allgemeines</h2>
          <p className="my-2 leading-relaxed text-[#444]">
            Diese Website verarbeitet personenbezogene Daten ausschließlich im
            erforderlichen Umfang zur Bereitstellung von Registrierung und
            Login. Der Schutz Ihrer persönlichen Daten ist uns ein wichtiges
            Anliegen.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="mb-3 text-xl text-arena-text">2. Verarbeitete Daten</h2>
          <p className="my-2 leading-relaxed text-[#444]">Im Rahmen der Nutzung werden folgende Daten verarbeitet:</p>
          <ul className="my-3 space-y-1.5 pl-6 leading-relaxed text-[#444]">
            <li>Benutzername</li>
            <li>E-Mail-Adresse</li>
            <li>Verschlüsseltes Passwort</li>
            <li>Technisch erforderliche Protokolldaten</li>
          </ul>
        </div>

        <div className="mb-8">
          <h2 className="mb-3 text-xl text-arena-text">3. Zweck der Verarbeitung</h2>
          <p className="my-2 leading-relaxed text-[#444]">
            Die Verarbeitung dient der Bereitstellung von Benutzerkonten,
            der Authentifizierung sowie der Sicherheit des Angebots.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="mb-3 text-xl text-arena-text">4. Cookies</h2>
          <p className="my-2 leading-relaxed text-[#444]">
            Es werden notwendige Cookies für grundlegende Funktionen verwendet.
            Optionale Cookies werden nur nach ausdrücklicher Einwilligung
            gesetzt. Sie können Ihre Cookie-Einstellungen jederzeit über den
            Cookie-Banner anpassen.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="mb-3 text-xl text-arena-text">5. Ihre Rechte</h2>
          <p className="my-2 leading-relaxed text-[#444]">
            Sie haben das Recht auf Auskunft, Berichtigung, Löschung und
            Einschränkung der Verarbeitung Ihrer personenbezogenen Daten.
            Darüber hinaus steht Ihnen ein Beschwerderecht bei der zuständigen
            Aufsichtsbehörde zu.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="mb-3 text-xl text-arena-text">6. Kontakt</h2>
          <p className="my-2 leading-relaxed text-[#444]">
            Bei Datenschutzanfragen wenden Sie sich bitte an:{" "}
            <a href="mailto:info@erklaerung-und-mehr.org" className="text-arena-link no-underline hover:underline">
              info@erklaerung-und-mehr.org
            </a>
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
