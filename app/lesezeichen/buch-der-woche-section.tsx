"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  TrophyIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import BdwExplanation from "./components/bdw-explanation";
import BdwSubmissionsList, { type BdwSubmissionItem } from "./components/bdw-submissions-list";
import BdwSubmissionForm, { type MyBookOption } from "./components/bdw-submission-form";

type CycleInfo = {
  currentCycleKey: string;
  formattedNextDraw: string;
  nextDrawDateStr: string;
};

type BuchDerWocheSectionProps = {
  loggedIn: boolean;
  userBookmarks: number;
};

export default function BuchDerWocheSection({ loggedIn, userBookmarks }: BuchDerWocheSectionProps) {
  const [cycleInfo, setCycleInfo] = useState<CycleInfo | null>(null);
  const [mySubmissions, setMySubmissions] = useState<BdwSubmissionItem[]>([]);
  const [myBooks, setMyBooks] = useState<MyBookOption[]>([]);
  const [authorName, setAuthorName] = useState("");
  const [showForm, setShowForm] = useState(false);

  const loadData = useCallback(() => {
    fetch("/api/buch-der-woche/bewerbung")
      .then((r) => r.json())
      .then((data) => {
        if (data.cycleInfo) setCycleInfo(data.cycleInfo);
        if (Array.isArray(data.mySubmissions)) {
          setMySubmissions(data.mySubmissions);
          if (data.mySubmissions.length === 0) {
            setShowForm(true);
          }
        }
        if (Array.isArray(data.myBooks)) setMyBooks(data.myBooks);
        if (data.accountDisplayName && !authorName) {
          setAuthorName(data.accountDisplayName);
        }
      })
      .catch(() => {});
  }, [authorName]);

  useEffect(() => {
    loadData();
  }, [loggedIn, loadData]);

  async function handleDelete(id: string) {
    if (!window.confirm("Möchtest du diese Bewerbung wirklich aus dem Lostopf zurückziehen?")) {
      return;
    }

    try {
      const res = await fetch("/api/buch-der-woche/bewerbung", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        loadData();
      }
    } catch {
      // ignore
    }
  }

  return (
    <section id="buch-der-woche" className="card flex-shrink-0 scroll-mt-6">
      {/* Kopfbereich */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <TrophyIcon className="h-6 w-6 text-arena-blue" />
            <h2 className="font-sans text-2xl font-extrabold text-arena-blue m-0">
              Buch der Woche
            </h2>
          </div>
          <p className="font-sans text-arena-muted text-sm m-0 mt-1">
            Präsentiere dein Buch mit YouTube-Video oder Reel eine ganze Woche lang auf der Startseite und im Dashboard.
          </p>
        </div>

        {cycleInfo && (
          <div className="badge flex items-center gap-1.5 py-1 px-3 text-xs">
            <CalendarDaysIcon className="h-4 w-4" />
            <span>Nächste Ziehung: {cycleInfo.formattedNextDraw}</span>
          </div>
        )}
      </div>

      {/* Erklärung */}
      <BdwExplanation loggedIn={loggedIn} userBookmarks={userBookmarks} />

      {/* Nicht eingeloggt: Hinweis */}
      {!loggedIn && (
        <div className="card-base p-4 text-center">
          <p className="font-sans font-semibold text-arena-blue m-0">
            Möchtest du dein Buch als „Buch der Woche“ ins Rennen schicken?
          </p>
          <p className="text-xs text-arena-muted m-0 mt-1">
            Melde dich jetzt an oder registriere dich kostenlos, um deine Bücher einzureichen und Lesezeichen als Gewinnlose zu sammeln.
          </p>
          <div className="mt-3">
            <Link href="/auth" className="btn btn-primary btn-sm inline-flex items-center">
              Jetzt anmelden / registrieren
            </Link>
          </div>
        </div>
      )}

      {/* Eingeloggt: Bewerbungen & Formular */}
      {loggedIn && (
        <div className="flex flex-col gap-4">
          <BdwSubmissionsList
            submissions={mySubmissions}
            showForm={showForm}
            onToggleForm={() => setShowForm(!showForm)}
            onDelete={handleDelete}
          />

          {showForm && (
            <BdwSubmissionForm
              myBooks={myBooks}
              hasSubmissions={mySubmissions.length > 0}
              defaultAuthor={authorName}
              onCloseForm={() => setShowForm(false)}
              onSuccess={loadData}
            />
          )}
        </div>
      )}
    </section>
  );
}
