"use client";

import Link from "next/link";
import { useState } from "react";

interface FaqItem {
  question: string;
  answer: React.ReactNode;
}

function FaqSection({ title, items }: { title: string; items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="mb-10">
      <h2 className="mb-5 text-2xl font-bold text-arena-text max-sm:text-xl">{title}</h2>
      <div className="space-y-3">
        {items.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div
              key={i}
              className="rounded-xl border border-arena-border-light bg-white overflow-hidden transition-shadow hover:shadow-sm"
            >
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left font-semibold text-arena-text text-[0.97rem] cursor-pointer bg-transparent border-none"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                aria-expanded={isOpen}
              >
                <span>{item.question}</span>
                <span
                  className={`shrink-0 text-xl transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`}
                >
                  +
                </span>
              </button>
              {isOpen && (
                <div className="px-6 pb-5 pt-0 text-[0.93rem] leading-relaxed text-[#444]">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const bucharenaFaq: FaqItem[] = [
  {
    question: "Was ist die BuchArena?",
    answer: (
      <>
        <p className="mb-2">
          Die <strong>BuchArena</strong> ist eine kostenlose Online-Plattform für Autorinnen und Autoren,
          Leserinnen und Leser sowie Sprecherinnen und Sprecher. Sie bietet einen Ort, an dem Bücher
          präsentiert, entdeckt und diskutiert werden können – abseits der großen kommerziellen Plattformen.
        </p>
        <p>
          Die BuchArena richtet sich insbesondere an Self-Publishing-Autorinnen und -Autoren, die ihre Werke
          einer breiteren Leserschaft vorstellen möchten, sowie an Leserinnen und Leser, die neue Bücher und
          Talente entdecken wollen.
        </p>
      </>
    ),
  },
  {
    question: "Welche Funktionen bietet die BuchArena?",
    answer: (
      <ul className="space-y-2 pl-4 list-disc">
        <li><strong>Bücher präsentieren:</strong> Erstelle ansprechende Buchseiten mit Cover, Beschreibung und Leseproben.</li>
        <li><strong>Bücher entdecken:</strong> Stöbere durch eine wachsende Sammlung an Büchern aller Genres.</li>
        <li><strong>Autoren kennenlernen:</strong> Besuche Autorenprofile und erfahre mehr über ihre Werke und Inspirationen.</li>
        <li><strong>Sprecher finden:</strong> Finde talentierte Sprecherinnen und Sprecher für Hörbuch-Projekte – oder biete selbst deine Stimme an.</li>
        <li><strong>Rezensionen &amp; Schnipsel:</strong> Lies und verfasse Buchrezensionen oder teile kurze Textausschnitte (Schnipsel).</li>
        <li><strong>Diskussionen:</strong> Tausche dich mit anderen Mitgliedern über Bücher und das Schreiben aus.</li>
        <li><strong>Nachrichten:</strong> Kommuniziere direkt mit anderen Nutzerinnen und Nutzern auf der Plattform.</li>
        <li><strong>Quiz:</strong> Teste dein Buchwissen in unterhaltsamen Quiz-Runden.</li>
        <li><strong>Social-Media-Inhalte:</strong> Entdecke Videos, „Kurz gefragt"-Interviews und mehr.</li>
      </ul>
    ),
  },
  {
    question: "Ist die BuchArena kostenlos?",
    answer: (
      <p>
        Ja! Die Nutzung der BuchArena ist vollständig <strong>kostenlos</strong> – sowohl für Autorinnen und
        Autoren als auch für Leserinnen und Leser. Es gibt keine versteckten Gebühren oder
        Premium-Mitgliedschaften.
      </p>
    ),
  },
  {
    question: "Wie kann ich mitmachen?",
    answer: (
      <p>
        Registriere dich einfach mit einem Benutzernamen, einer E-Mail-Adresse und einem Passwort auf der{" "}
        <Link href="/auth" className="text-arena-link hover:underline">Registrierungsseite</Link>.
        Danach kannst du sofort Bücher einstellen, Profile anlegen, diskutieren und vieles mehr.
      </p>
    ),
  },
  {
    question: "Wer kann Bücher in der BuchArena einstellen?",
    answer: (
      <p>
        Jede registrierte Nutzerin und jeder registrierte Nutzer kann Bücher einstellen. Die Plattform
        richtet sich besonders an Self-Publishing-Autorinnen und -Autoren, steht aber allen offen, die ein
        Buch präsentieren möchten.
      </p>
    ),
  },
  {
    question: "Wie funktioniert die Sprecher-Funktion?",
    answer: (
      <p>
        Sprecherinnen und Sprecher können ein Profil anlegen, Hörproben hochladen und sich so für
        Hörbuch-Projekte sichtbar machen. Autorinnen und Autoren können die Sprecher-Übersicht durchstöbern
        und direkt Kontakt aufnehmen – alles über die integrierte Nachrichtenfunktion.
      </p>
    ),
  },
];

const lernarenaFaq: FaqItem[] = [
  {
    question: "Was ist lernarena.org?",
    answer: (
      <p>
        <a href="https://lernarena.org" target="_blank" rel="noopener noreferrer" className="text-arena-link hover:underline font-semibold">lernarena.org</a>{" "}
        ist eine Bildungsplattform, die kostenlose Lern- und Erklärvideos zu verschiedenen Themengebieten
        anbietet. Ein besonderer Schwerpunkt liegt auf <strong>Gamification</strong> – Lerninhalte werden
        spielerisch aufbereitet, um Motivation und Lernerfolg zu steigern. Die LernArena versteht sich als
        Anlaufstelle für Schülerinnen und Schüler, Studierende und alle, die sich weiterbilden möchten.
      </p>
    ),
  },
  {
    question: "Was hat die LernArena mit der BuchArena zu tun?",
    answer: (
      <p>
        Die BuchArena ist ein Projekt, das aus dem Umfeld der LernArena entstanden ist. Beide Plattformen
        teilen das Ziel, Wissen und Kultur kostenlos zugänglich zu machen – die LernArena im Bereich Bildung,
        die BuchArena im Bereich Literatur und Bücher.
      </p>
    ),
  },
  {
    question: "Welche Inhalte gibt es auf lernarena.org?",
    answer: (
      <p>
        Auf der LernArena findest du kostenlose Erklärvideos, Übungsmaterialien und Kurse zu Themen wie
        Mathematik, Sprachen, Naturwissenschaften und weiteren Fachgebieten. Dazu kommen interaktive
        Gamification-Elemente wie Quizze, Challenges und Lernspiele, die das Lernen abwechslungsreich
        gestalten. Die Inhalte sind frei zugänglich und für den schulischen sowie privaten Gebrauch gedacht.
      </p>
    ),
  },
];

const meridianFaq: FaqItem[] = [
  {
    question: "Was ist meridianbooks.at?",
    answer: (
      <p>
        <a href="https://meridianbooks.at" target="_blank" rel="noopener noreferrer" className="text-arena-link hover:underline font-semibold">meridianbooks.at</a>{" "}
        ist eine österreichische Plattform mit dem Schwerpunkt <strong>Service und Support für
        Self-Publishing-Autorinnen und -Autoren</strong>. Meridian Books unterstützt bei allen Schritten
        rund um die Veröffentlichung – von Lektorat und Buchgestaltung über die Vermarktung bis hin zur
        Sichtbarkeit im Buchhandel.
      </p>
    ),
  },
  {
    question: "Wie hängen Meridian Books und die BuchArena zusammen?",
    answer: (
      <p>
        Die BuchArena ist ein gemeinsames Projekt von lernarena.org und meridianbooks.at. Während Meridian Books
        sich auf den <strong>Self-Publisher-Service</strong> konzentriert – also die professionelle Unterstützung
        bei Veröffentlichung und Vermarktung –, bietet die BuchArena eine Community-Plattform, auf der
        Autorinnen und Autoren ihre Bücher sichtbar machen und mit Leserinnen und Lesern in Kontakt treten können.
      </p>
    ),
  },
  {
    question: "Muss ich über Meridian Books veröffentlicht haben, um die BuchArena zu nutzen?",
    answer: (
      <p>
        Nein, die BuchArena steht <strong>allen</strong> offen – unabhängig davon, wo oder wie ein Buch
        veröffentlicht wurde. Ob Self-Publishing, Kleinverlag oder großer Verlag: Jede Autorin und jeder Autor
        ist willkommen.
      </p>
    ),
  },
];

const allgemeinFaq: FaqItem[] = [
  {
    question: "Wie kann ich Kontakt aufnehmen?",
    answer: (
      <p>
        Bei Fragen, Feedback oder Anregungen schreibe einfach eine E-Mail an{" "}
        <a href="mailto:info@erklaerung-und-mehr.org" className="text-arena-link hover:underline">
          info@erklaerung-und-mehr.org
        </a>.
      </p>
    ),
  },
  {
    question: "Gibt es eine App für die BuchArena?",
    answer: (
      <p>
        Aktuell gibt es keine separate App. Die BuchArena ist jedoch als moderne Web-Anwendung konzipiert und
        funktioniert auf Smartphones und Tablets genauso gut wie am Desktop – einfach im Browser öffnen.
      </p>
    ),
  },
  {
    question: "Werden meine Daten sicher verarbeitet?",
    answer: (
      <p>
        Ja. Wir verarbeiten nur die für den Betrieb notwendigen Daten und halten uns an die geltenden
        Datenschutzbestimmungen. Weitere Informationen findest du in unserer{" "}
        <Link href="/datenschutz" className="text-arena-link hover:underline">Datenschutzerklärung</Link>.
      </p>
    ),
  },
];

export default function InfoPage() {
  return (
    <main className="centered-main">
      <section className="w-full max-w-[1100px] rounded-[14px] bg-white px-12 py-10 box-border max-sm:px-5 max-sm:py-6">
        <h1 className="mb-3 border-b-2 border-gray-200 pb-4 text-3xl font-extrabold max-sm:text-2xl">
          Über die BuchArena
        </h1>
        <p className="mb-10 text-[0.95rem] leading-relaxed text-[#555]">
          Hier findest du Antworten auf die häufigsten Fragen rund um die BuchArena, die LernArena und
          Meridian Books. Klicke auf eine Frage, um die Antwort aufzuklappen.
        </p>

        <FaqSection title="🏟️ Die BuchArena" items={bucharenaFaq} />
        <FaqSection title="🎓 LernArena (lernarena.org)" items={lernarenaFaq} />
        <FaqSection title="📚 Meridian Books (meridianbooks.at)" items={meridianFaq} />
        <FaqSection title="💬 Allgemeines" items={allgemeinFaq} />

        <div className="mt-10 border-t border-gray-200 pt-6">
          <Link href="/" className="font-medium text-arena-link no-underline hover:underline">
            ← Zurück zur Startseite
          </Link>
        </div>
      </section>
    </main>
  );
}
