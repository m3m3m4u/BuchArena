import Link from "next/link";

export default function DatenschutzPage() {
  return (
    <main className="centered-main">
      <section className="legal-page">
        <h1>Datenschutzerklärung</h1>

        <div className="legal-section">
          <h2>1. Allgemeines</h2>
          <p>
            Diese Website verarbeitet personenbezogene Daten ausschließlich im
            erforderlichen Umfang zur Bereitstellung von Registrierung und
            Login. Der Schutz Ihrer persönlichen Daten ist uns ein wichtiges
            Anliegen.
          </p>
        </div>

        <div className="legal-section">
          <h2>2. Verarbeitete Daten</h2>
          <p>Im Rahmen der Nutzung werden folgende Daten verarbeitet:</p>
          <ul>
            <li>Benutzername</li>
            <li>E-Mail-Adresse</li>
            <li>Verschlüsseltes Passwort</li>
            <li>Technisch erforderliche Protokolldaten</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>3. Zweck der Verarbeitung</h2>
          <p>
            Die Verarbeitung dient der Bereitstellung von Benutzerkonten,
            der Authentifizierung sowie der Sicherheit des Angebots.
          </p>
        </div>

        <div className="legal-section">
          <h2>4. Cookies</h2>
          <p>
            Es werden notwendige Cookies für grundlegende Funktionen verwendet.
            Optionale Cookies werden nur nach ausdrücklicher Einwilligung
            gesetzt. Sie können Ihre Cookie-Einstellungen jederzeit über den
            Cookie-Banner anpassen.
          </p>
        </div>

        <div className="legal-section">
          <h2>5. Ihre Rechte</h2>
          <p>
            Sie haben das Recht auf Auskunft, Berichtigung, Löschung und
            Einschränkung der Verarbeitung Ihrer personenbezogenen Daten.
            Darüber hinaus steht Ihnen ein Beschwerderecht bei der zuständigen
            Aufsichtsbehörde zu.
          </p>
        </div>

        <div className="legal-section">
          <h2>6. Kontakt</h2>
          <p>
            Bei Datenschutzanfragen wenden Sie sich bitte an:{" "}
            <a href="mailto:info@erklaerung-und-mehr.org">
              info@erklaerung-und-mehr.org
            </a>
          </p>
        </div>

        <div className="legal-back">
          <Link href="/">← Zurück zur Startseite</Link>
        </div>
      </section>
    </main>
  );
}
