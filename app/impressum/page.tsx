import Link from "next/link";

export default function ImpressumPage() {
  return (
    <main className="centered-main">
      <section className="w-full max-w-[1100px] rounded-[14px] bg-white px-12 py-10 box-border max-sm:px-5 max-sm:py-6">
        <h1 className="mb-8 border-b-2 border-gray-200 pb-4 text-3xl max-sm:text-2xl">Impressum &amp; Datenschutz</h1>

        {/* ── Impressum ── */}
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

        <div className="mb-8">
          <h2 className="mb-3 text-xl text-arena-text">Online-Streitbeilegung</h2>
          <p className="my-2 leading-relaxed text-[#444]">
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
            <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-arena-link no-underline hover:underline">
              https://ec.europa.eu/consumers/odr
            </a>.
            Wir sind weder bereit noch verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </div>

        {/* ── Datenschutzerklärung ── */}
        <h2 className="mb-6 mt-12 border-b-2 border-gray-200 pb-4 text-2xl max-sm:text-xl" id="datenschutz">Datenschutzerklärung</h2>

        <div className="mb-8">
          <h3 className="mb-3 text-xl text-arena-text">1. Verantwortlicher</h3>
          <p className="my-2 leading-relaxed text-[#444]">
            Verantwortlich für die Datenverarbeitung auf dieser Website ist:
          </p>
          <div className="my-2 space-y-0.5 text-[#444]">
            <p className="m-0">Matthias Gmeiner</p>
            <p className="m-0">Herrengutgasse 16b</p>
            <p className="m-0">6923 Lauterach, Österreich</p>
            <p className="m-0">
              E-Mail:{" "}
              <a href="mailto:info@erklaerung-und-mehr.org" className="text-arena-link no-underline hover:underline">info@erklaerung-und-mehr.org</a>
            </p>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="mb-3 text-xl text-arena-text">2. Überblick über die Datenverarbeitung</h3>
          <p className="my-2 leading-relaxed text-[#444]">
            Die BuchArena ist eine Community-Plattform für Autorinnen, Autoren, Sprecherinnen, Sprecher und Buchbegeisterte.
            Wir verarbeiten personenbezogene Daten ausschließlich im erforderlichen Umfang auf Grundlage der
            DSGVO (Datenschutz-Grundverordnung) sowie des österreichischen DSG (Datenschutzgesetz).
          </p>
        </div>

        <div className="mb-8">
          <h3 className="mb-3 text-xl text-arena-text">3. Verarbeitete Daten und Rechtsgrundlagen</h3>
          <p className="my-2 leading-relaxed text-[#444]">Im Rahmen der Nutzung werden folgende Daten verarbeitet:</p>

          <div className="my-4 overflow-x-auto">
            <table className="w-full text-sm max-sm:text-xs text-[#444] border border-arena-border rounded-lg">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-2.5 max-sm:p-1.5 border-b border-arena-border font-semibold">Datenart</th>
                  <th className="text-left p-2.5 max-sm:p-1.5 border-b border-arena-border font-semibold">Zweck</th>
                  <th className="text-left p-2.5 max-sm:p-1.5 border-b border-arena-border font-semibold">Rechtsgrundlage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-arena-border">
                <tr><td className="p-2.5 max-sm:p-1.5">Benutzername, E-Mail, Passwort (verschlüsselt)</td><td className="p-2.5 max-sm:p-1.5">Registrierung &amp; Login</td><td className="p-2.5 max-sm:p-1.5">Vertragserfüllung (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;b DSGVO)</td></tr>
                <tr><td className="p-2.5 max-sm:p-1.5">Profilbild, Autorenbild, Buchcover</td><td className="p-2.5 max-sm:p-1.5">Öffentliches Profil / Buchseite</td><td className="p-2.5 max-sm:p-1.5">Einwilligung (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;a DSGVO)</td></tr>
                <tr><td className="p-2.5 max-sm:p-1.5">Buchtexte, Beschreibungen, Leseproben</td><td className="p-2.5 max-sm:p-1.5">Buchpräsentation</td><td className="p-2.5 max-sm:p-1.5">Vertragserfüllung (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;b DSGVO)</td></tr>
                <tr><td className="p-2.5 max-sm:p-1.5">Sprechproben (Audio-Dateien)</td><td className="p-2.5 max-sm:p-1.5">Sprecher-Profil</td><td className="p-2.5 max-sm:p-1.5">Einwilligung (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;a DSGVO)</td></tr>
                <tr><td className="p-2.5 max-sm:p-1.5">Private Nachrichten</td><td className="p-2.5 max-sm:p-1.5">Kommunikation zwischen Nutzern</td><td className="p-2.5 max-sm:p-1.5">Vertragserfüllung (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;b DSGVO)</td></tr>
                <tr><td className="p-2.5 max-sm:p-1.5">Diskussionsbeiträge, Rezensionen, Schnipsel</td><td className="p-2.5 max-sm:p-1.5">Community-Funktionen</td><td className="p-2.5 max-sm:p-1.5">Vertragserfüllung (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;b DSGVO)</td></tr>
                <tr><td className="p-2.5 max-sm:p-1.5">Support-Tickets</td><td className="p-2.5 max-sm:p-1.5">Nutzersupport</td><td className="p-2.5 max-sm:p-1.5">Berechtigtes Interesse (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f DSGVO)</td></tr>
                <tr><td className="p-2.5 max-sm:p-1.5">Social-Media-Einreichungen (Bilder, Videos)</td><td className="p-2.5 max-sm:p-1.5">Buchvorstellungen auf Social Media</td><td className="p-2.5 max-sm:p-1.5">Einwilligung (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;a DSGVO)</td></tr>
                <tr><td className="p-2.5 max-sm:p-1.5">Technische Protokolldaten (IP, User-Agent)</td><td className="p-2.5 max-sm:p-1.5">Sicherheit &amp; Betrieb</td><td className="p-2.5 max-sm:p-1.5">Berechtigtes Interesse (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f DSGVO)</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="mb-3 text-xl text-arena-text">4. Speicherdauer</h3>
          <ul className="my-3 space-y-1.5 pl-6 leading-relaxed text-[#444] list-disc">
            <li><strong>Konto-Daten</strong> (Benutzername, E-Mail, Passwort): Bis zur Kontolöschung durch den Nutzer oder auf Anfrage.</li>
            <li><strong>Vom Nutzer erstellte Inhalte</strong> (Bücher, Nachrichten, Diskussionen, Rezensionen, Schnipsel, Sprechproben, Medien): Bis zur Löschung durch den Nutzer oder auf Anfrage.</li>
            <li><strong>Support-Tickets</strong>: Bis 12 Monate nach Abschluss des Anliegens.</li>
            <li><strong>Technische Protokolldaten</strong>: Maximal 30 Tage.</li>
            <li><strong>Cookie-Einwilligung</strong>: 6 Monate.</li>
          </ul>
        </div>

        <div className="mb-8">
          <h3 className="mb-3 text-xl text-arena-text">5. Cookies</h3>
          <p className="my-2 leading-relaxed text-[#444]">
            Wir verwenden folgende Cookies bzw. lokale Speichertechnologien:
          </p>
          <div className="my-4 overflow-x-auto">
            <table className="w-full text-sm max-sm:text-xs text-[#444] border border-arena-border rounded-lg">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-2.5 max-sm:p-1.5 border-b border-arena-border font-semibold">Name</th>
                  <th className="text-left p-2.5 max-sm:p-1.5 border-b border-arena-border font-semibold">Typ</th>
                  <th className="text-left p-2.5 max-sm:p-1.5 border-b border-arena-border font-semibold">Zweck</th>
                  <th className="text-left p-2.5 max-sm:p-1.5 border-b border-arena-border font-semibold">Dauer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-arena-border">
                <tr><td className="p-2.5 max-sm:p-1.5">cookie_consent</td><td className="p-2.5 max-sm:p-1.5">Notwendig</td><td className="p-2.5 max-sm:p-1.5">Speichert Cookie-Einwilligung</td><td className="p-2.5 max-sm:p-1.5">6 Monate</td></tr>
                <tr><td className="p-2.5 max-sm:p-1.5">bucharena_account (localStorage)</td><td className="p-2.5 max-sm:p-1.5">Notwendig</td><td className="p-2.5 max-sm:p-1.5">Login-Status</td><td className="p-2.5 max-sm:p-1.5">Session</td></tr>
                <tr><td className="p-2.5 max-sm:p-1.5">YouTube-Cookies (von Google LLC)</td><td className="p-2.5 max-sm:p-1.5">Optional</td><td className="p-2.5 max-sm:p-1.5">Video-Wiedergabe</td><td className="p-2.5 max-sm:p-1.5">Siehe Google-Datenschutz</td></tr>
              </tbody>
            </table>
          </div>
          <p className="my-2 leading-relaxed text-[#444]">
            Optionale Cookies werden erst nach ausdrücklicher Einwilligung über den Cookie-Banner gesetzt.
            Sie können Ihre Einstellungen jederzeit über den &quot;Cookies&quot;-Link im Footer ändern.
          </p>
        </div>

        <div className="mb-8">
          <h3 className="mb-3 text-xl text-arena-text">6. Auftragsverarbeiter &amp; Drittanbieter</h3>
          <p className="my-2 leading-relaxed text-[#444]">
            Zur Erbringung unserer Dienste setzen wir folgende Dienstleister ein:
          </p>
          <ul className="my-3 space-y-1.5 pl-6 leading-relaxed text-[#444] list-disc">
            <li><strong>MongoDB, Inc.</strong> (MongoDB Atlas) – Datenbankhosting. Serverstandort: EU (Frankfurt). <a href="https://www.mongodb.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-arena-link no-underline hover:underline">Datenschutzrichtlinie</a></li>
            <li><strong>WebDAV-Hosting</strong> – Speicherung von Profilbildern, Buchcovern, Audiodateien und Medien. Serverstandort: EU.</li>
            <li><strong>Google LLC</strong> (YouTube) – Einbettung von Videos, nur nach Einwilligung. Datenübertragung in die USA möglich. <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-arena-link no-underline hover:underline">Datenschutzrichtlinie</a></li>
            <li><strong>Amazon Europe Core S.à r.l.</strong> – Teilnahme am Amazon EU-Partnerprogramm (Affiliate). Über Affiliate-Links können Provisionen verdient werden. Beim Klick auf einen solchen Link werden Daten an Amazon übermittelt (u.&nbsp;a. Referrer-URL, IP-Adresse, Zeitpunkt des Klicks). Amazon setzt ggf. Cookies, um die Zuordnung zum Partnerprogramm zu ermöglichen. <a href="https://www.amazon.de/gp/help/customer/display.html?nodeId=201909010" target="_blank" rel="noopener noreferrer" className="text-arena-link no-underline hover:underline">Datenschutzrichtlinie</a></li>
          </ul>
        </div>

        <div className="mb-8">
          <h3 className="mb-3 text-xl text-arena-text">7. Amazon Partnerprogramm (Affiliate)</h3>
          <p className="my-2 leading-relaxed text-[#444]">
            BuchArena ist Teilnehmer des Partnerprogramms von Amazon EU, das zur Bereitstellung eines
            Mediums für Websites konzipiert wurde, mittels dessen durch die Platzierung von
            Werbeanzeigen und Links zu amazon.de Werbekostenerstattung verdient werden kann.
          </p>
          <p className="my-2 leading-relaxed text-[#444]">
            Amazon setzt Cookies ein, um die Herkunft der Bestellungen nachvollziehen zu können.
            Dadurch kann Amazon erkennen, dass Sie den Partnerlink auf unserer Website geklickt haben.
            Rechtsgrundlage ist Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f DSGVO (berechtigtes Interesse an der
            wirtschaftlichen Nutzung des Webangebots). Weitere Informationen zur Datennutzung durch
            Amazon finden Sie in der{" "}
            <a href="https://www.amazon.de/gp/help/customer/display.html?nodeId=201909010" target="_blank" rel="noopener noreferrer" className="text-arena-link no-underline hover:underline">
              Datenschutzerklärung von Amazon
            </a>.
          </p>
        </div>

        <div className="mb-8">
          <h3 className="mb-3 text-xl text-arena-text">8. Datenübermittlung in Drittländer</h3>
          <p className="my-2 leading-relaxed text-[#444]">
            Beim Abspielen von YouTube-Videos können Daten an Google LLC in den USA übermittelt werden.
            Die Übermittlung erfolgt auf Basis Ihrer Einwilligung (Art.&nbsp;49 Abs.&nbsp;1 lit.&nbsp;a DSGVO) und des
            EU-US Data Privacy Frameworks. Weitere Informationen:{" "}
            <a href="https://www.dataprivacyframework.gov" target="_blank" rel="noopener noreferrer" className="text-arena-link no-underline hover:underline">
              dataprivacyframework.gov
            </a>.
          </p>
        </div>

        <div className="mb-8">
          <h3 className="mb-3 text-xl text-arena-text">9. Ihre Rechte</h3>
          <p className="my-2 leading-relaxed text-[#444]">
            Nach der DSGVO stehen Ihnen folgende Rechte zu:
          </p>
          <ul className="my-3 space-y-1.5 pl-6 leading-relaxed text-[#444] list-disc">
            <li><strong>Auskunft</strong> (Art.&nbsp;15 DSGVO) – Informationen über Ihre gespeicherten Daten</li>
            <li><strong>Berichtigung</strong> (Art.&nbsp;16 DSGVO) – Korrektur unrichtiger Daten</li>
            <li><strong>Löschung</strong> (Art.&nbsp;17 DSGVO) – Löschung Ihrer Daten (&quot;Recht auf Vergessenwerden&quot;)</li>
            <li><strong>Einschränkung</strong> (Art.&nbsp;18 DSGVO) – Einschränkung der Verarbeitung</li>
            <li><strong>Datenübertragbarkeit</strong> (Art.&nbsp;20 DSGVO) – Erhalt Ihrer Daten in maschinenlesbarem Format</li>
            <li><strong>Widerspruch</strong> (Art.&nbsp;21 DSGVO) – Widerspruch gegen die Verarbeitung auf Basis berechtigter Interessen</li>
            <li><strong>Widerruf der Einwilligung</strong> – jederzeit möglich, ohne Auswirkung auf die Rechtmäßigkeit der vorherigen Verarbeitung</li>
          </ul>
        </div>

        <div className="mb-8">
          <h3 className="mb-3 text-xl text-arena-text">10. Beschwerderecht</h3>
          <p className="my-2 leading-relaxed text-[#444]">
            Sie haben das Recht, eine Beschwerde bei der zuständigen Aufsichtsbehörde einzureichen:
          </p>
          <div className="my-2 space-y-0.5 text-[#444]">
            <p className="m-0 font-semibold">Österreichische Datenschutzbehörde</p>
            <p className="m-0">Barichgasse 40–42, 1030 Wien</p>
            <p className="m-0">
              <a href="https://www.dsb.gv.at" target="_blank" rel="noopener noreferrer" className="text-arena-link no-underline hover:underline">www.dsb.gv.at</a>
            </p>
            <p className="m-0">
              E-Mail: <a href="mailto:dsb@dsb.gv.at" className="text-arena-link no-underline hover:underline">dsb@dsb.gv.at</a>
            </p>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="mb-3 text-xl text-arena-text">11. Kontakt für Datenschutzanfragen</h3>
          <p className="my-2 leading-relaxed text-[#444]">
            Bei Fragen zum Datenschutz oder zur Ausübung Ihrer Rechte wenden Sie sich bitte an:{" "}
            <a href="mailto:info@erklaerung-und-mehr.org" className="text-arena-link no-underline hover:underline">
              info@erklaerung-und-mehr.org
            </a>
          </p>
        </div>

        <div className="mb-8">
          <h3 className="mb-3 text-xl text-arena-text">12. Änderungen</h3>
          <p className="my-2 leading-relaxed text-[#444]">
            Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf anzupassen, um sie an geänderte
            Rechtslagen oder Änderungen des Dienstes anzupassen. Die aktuelle Version gilt ab dem Datum
            des letzten Updates.
          </p>
          <p className="my-2 text-sm text-arena-muted">Stand: März 2026</p>
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
