import {
  VideoCameraIcon,
  CalendarDaysIcon,
  BookmarkIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

type BdwExplanationProps = {
  loggedIn: boolean;
  userBookmarks: number;
};

export default function BdwExplanation({ loggedIn, userBookmarks }: BdwExplanationProps) {
  return (
    <div className="card-tip p-4">
      <h3 className="font-sans font-bold text-base text-arena-blue flex items-center gap-2 m-0">
        <SparklesIcon className="h-5 w-5 text-arena-blue" />
        So funktioniert die Bewerbung und automatische Auslosung
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-xs sm:text-sm">
        <div className="card-base p-3 shadow-none">
          <div className="flex items-start gap-2.5">
            <VideoCameraIcon className="h-5 w-5 text-arena-blue shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-arena-blue m-0">1. Nur mit YouTube-Video</p>
              <p className="text-arena-muted text-xs m-0 mt-0.5">
                Buchtrailer, Vorstellungsvideo oder vertikales YouTube Reel / Short. Das Video wird prominent eingebettet.
              </p>
            </div>
          </div>
        </div>

        <div className="card-base p-3 shadow-none">
          <div className="flex items-start gap-2.5">
            <CalendarDaysIcon className="h-5 w-5 text-arena-blue shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-arena-blue m-0">2. Immer Sonntag ab 18:00 Uhr</p>
              <p className="text-arena-muted text-xs m-0 mt-0.5">
                Das System waehlt jeden Sonntag ab 18 Uhr vollautomatisch das neue Buch der Woche aus allen gueltigen Bewerbungen aus.
              </p>
            </div>
          </div>
        </div>

        <div className="card-base p-3 shadow-none">
          <div className="flex items-start gap-2.5">
            <BookmarkIcon className="h-5 w-5 text-arena-blue shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-arena-blue m-0">3. Deine Lesezeichen zaehlen</p>
              <p className="text-arena-muted text-xs m-0 mt-0.5">
                Je mehr Lesezeichen du hast, desto hoeher ist deine Gewinnchance. Bereits ausgewaehlte Buecher erhalten eine verringerte Chance.
              </p>
            </div>
          </div>
        </div>
      </div>

      {loggedIn && (
        <div className="mt-3 pt-3 border-t border-arena-border-light flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-arena-blue font-semibold">
            <BookmarkIcon className="h-4 w-4 text-arena-blue" />
            <span>Dein aktueller Stand: <strong>{userBookmarks} Lesezeichen</strong> im Lostopf</span>
          </div>
          <span className="text-arena-muted">
            Tipp: Taeglich einloggen, Quiz spielen und im Treffpunkt mitmachen fuer zusaetzliche Lesezeichen.
          </span>
        </div>
      )}
    </div>
  );
}
