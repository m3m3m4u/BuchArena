import Link from "next/link";

export default function DatenschutzPage() {
  return (
    <main className="centered-main">
      <section className="impressum">
        <h1>Datenschutzerklärung</h1>
        <p>
          Diese Website verarbeitet personenbezogene Daten ausschließlich im
          erforderlichen Umfang zur Bereitstellung von Registrierung und Login.
        </p>
        <p>
          Verarbeitete Daten: Benutzername, E-Mail-Adresse, verschlüsseltes
          Passwort sowie technisch erforderliche Protokolldaten.
        </p>
        <p>
          Zweck der Verarbeitung: Bereitstellung von Benutzerkonten,
          Authentifizierung und Sicherheit des Angebots.
        </p>
        <p>
          Cookie-Hinweis: Es werden notwendige Cookies für grundlegende
          Funktionen verwendet. Optionale Cookies werden nur nach Einwilligung
          gesetzt.
        </p>
        <p>
          Kontakt bei Datenschutzanfragen: info@erklaerung-und-mehr.org
        </p>
        <p>
          <Link href="/">Zurück zur Startseite</Link>
        </p>
      </section>
    </main>
  );
}
