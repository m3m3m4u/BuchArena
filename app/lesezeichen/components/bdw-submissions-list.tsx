import {
  TrashIcon,
  ArrowTopRightOnSquareIcon,
  VideoCameraIcon,
  CheckCircleIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { isYouTubeShort } from "@/lib/bucharena-types";

export type BdwSubmissionItem = {
  id: string;
  title: string;
  author: string;
  speaker?: string;
  youtubeUrl: string;
  buyUrl?: string;
  bookId?: string;
  status: string;
  timesSelected: number;
  authorTimesWon?: number;
  lastSelectedAt?: string;
  createdAt: string;
  weight: number;
};

type BdwSubmissionsListProps = {
  submissions: BdwSubmissionItem[];
  showForm: boolean;
  onToggleForm: () => void;
  onDelete: (id: string) => void;
};

export default function BdwSubmissionsList({
  submissions,
  showForm,
  onToggleForm,
  onDelete,
}: BdwSubmissionsListProps) {
  if (submissions.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <h4 className="font-sans font-bold text-base text-arena-blue m-0 flex items-center gap-1.5">
          <CheckCircleIcon className="h-5 w-5 text-arena-blue" />
          Deine eingereichten Buecher ({submissions.length})
        </h4>
        <button
          type="button"
          onClick={onToggleForm}
          className="btn btn-secondary btn-sm inline-flex items-center gap-1 text-xs"
        >
          <PlusIcon className="h-4 w-4" />
          {showForm ? "Formular schliessen" : "Weiteres Buch bewerben"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {submissions.map((sub) => {
          const isWon = sub.timesSelected > 0;
          return (
            <div
              key={sub.id}
              className="card-base p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h5 className="font-sans font-bold text-sm text-arena-blue m-0 leading-snug">
                    {sub.title}
                  </h5>
                  {isWon ? (
                    <span className="badge bg-amber-100 text-amber-900 border border-amber-300">
                      {sub.timesSelected}x gewonnen
                    </span>
                  ) : (sub.authorTimesWon ?? 0) > 0 ? (
                    <span className="badge bg-amber-50 text-amber-800 border border-amber-200">
                      Autoren-Pause
                    </span>
                  ) : (
                    <span className="badge bg-slate-100 text-slate-700">
                      Im Lostopf
                    </span>
                  )}
                </div>

                <p className="text-xs text-arena-muted m-0 mt-1">
                  Autor: <strong className="text-arena-text">{sub.author}</strong>
                  {sub.speaker && <span> · Sprecher: {sub.speaker}</span>}
                </p>

                {sub.youtubeUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <a
                      href={sub.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-arena-blue hover:underline inline-flex items-center gap-1"
                    >
                      <VideoCameraIcon className="h-4 w-4" />
                      <span>YouTube-Video oeffnen</span>
                      <ArrowTopRightOnSquareIcon className="h-3 w-3 opacity-60" />
                    </a>
                    {isYouTubeShort(sub.youtubeUrl) && (
                      <span className="badge text-[10px]">
                        Reel / Short
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-3 pt-2.5 border-t border-arena-border-light flex items-center justify-between text-xs">
                <div className="text-[11px] text-arena-muted">
                  Gewinn-Punkte: <strong className="text-arena-blue">{sub.weight}</strong>
                  {(isWon || (sub.authorTimesWon ?? 0) > 0) && (
                    <span className="text-arena-muted text-[10px] ml-1">(Autoren-Bremse aktiv)</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(sub.id)}
                  className="text-arena-danger hover:underline inline-flex items-center gap-1 text-[11px] p-1 cursor-pointer"
                  title="Bewerbung zurueckziehen"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                  <span>Entfernen</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
