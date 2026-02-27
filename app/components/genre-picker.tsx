"use client";

import { useState, useRef, useEffect } from "react";
import { GENRE_OPTIONS } from "@/lib/genres";
import { XMarkIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

/**
 * Parst einen Genre-String (kommasepariert) in ein sauberes Array.
 * Einzelwerte wie "Fantasy" werden zu ["Fantasy"].
 */
export function parseGenres(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
}

/** Wandelt ein Genre-Array zurück in einen kommaseparierten String. */
export function joinGenres(genres: string[]): string {
  return genres.join(", ");
}

type GenrePickerProps = {
  value: string; // kommaseparierter String
  onChange: (value: string) => void;
  /** Zeigt Pflichtfeld-Stern an */
  required?: boolean;
  /** Label-Text (default: "Genre") */
  label?: string;
  /** Kompakter Modus ohne Label */
  compact?: boolean;
};

export default function GenrePicker({
  value,
  onChange,
  required,
  label = "Genre",
  compact = false,
}: GenrePickerProps) {
  const selected = parseGenres(value);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Schließen bei Klick außerhalb
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  function toggle(genre: string) {
    const next = selected.includes(genre)
      ? selected.filter((g) => g !== genre)
      : [...selected, genre];
    onChange(joinGenres(next));
  }

  function remove(genre: string) {
    onChange(joinGenres(selected.filter((g) => g !== genre)));
  }

  const filtered = GENRE_OPTIONS.filter(
    (g) =>
      g.toLowerCase().includes(search.toLowerCase()) &&
      !selected.includes(g),
  );

  return (
    <div ref={containerRef} className="grid gap-1 relative">
      {!compact && (
        <span className="text-[0.95rem] font-medium">
          {label} {required && <span className="text-red-500">*</span>}
        </span>
      )}

      {/* Selected pills + trigger */}
      <button
        type="button"
        className="input-base flex flex-wrap gap-1.5 items-center min-h-[42px] text-left cursor-pointer bg-white"
        onClick={() => {
          setOpen((o) => !o);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
      >
        {selected.length === 0 && (
          <span className="text-arena-muted text-[0.95rem]">– Genre wählen –</span>
        )}
        {selected.map((g) => (
          <span
            key={g}
            className="inline-flex items-center gap-1 rounded-full bg-arena-blue text-white text-xs font-medium px-2.5 py-1"
          >
            {g}
            <XMarkIcon
              className="size-4 cursor-pointer hover:text-arena-yellow p-0.5"
              onClick={(e) => {
                e.stopPropagation();
                remove(g);
              }}
            />
          </span>
        ))}
        <ChevronDownIcon className={`size-4 ml-auto shrink-0 text-arena-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-arena-border bg-white shadow-lg max-h-[280px] overflow-hidden flex flex-col">
          {/* Suchfeld */}
          <div className="p-2 border-b border-arena-border">
            <input
              ref={inputRef}
              className="input-base w-full text-sm"
              placeholder="Genre suchen …"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Optionsliste */}
          <div className="overflow-y-auto p-1">
            {/* Bereits gewählte – mit Häkchen */}
            {selected.map((g) => (
              <button
                key={g}
                type="button"
                className="flex items-center gap-2 w-full text-left px-3 py-2.5 sm:py-1.5 text-sm rounded hover:bg-arena-bg cursor-pointer border-none bg-transparent font-medium text-arena-blue"
                onClick={() => toggle(g)}
              >
                <span className="size-4 shrink-0 text-center">✓</span>
                {g}
              </button>
            ))}

            {selected.length > 0 && filtered.length > 0 && (
              <hr className="my-1 border-arena-border-light" />
            )}

            {/* Nicht gewählte */}
            {filtered.map((g) => (
              <button
                key={g}
                type="button"
                className="flex items-center gap-2 w-full text-left px-3 py-2.5 sm:py-1.5 text-sm rounded hover:bg-arena-bg cursor-pointer border-none bg-transparent"
                onClick={() => toggle(g)}
              >
                <span className="size-4 shrink-0" />
                {g}
              </button>
            ))}

            {filtered.length === 0 && selected.length === 0 && (
              <p className="text-arena-muted text-sm text-center py-3">Kein Genre gefunden</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
