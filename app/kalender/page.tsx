"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { getStoredAccount, ACCOUNT_CHANGED_EVENT } from "@/lib/client-account";
import { VALID_COUNTRIES, type KalenderCategory } from "@/lib/kalender";

type LeafletModule = typeof import("leaflet");

interface KalenderLocation {
  street?: string;
  city?: string;
  zipCode?: string;
  country?: string;
}

interface KalenderEvent {
  id: string;
  title: string;
  description: string;
  category: KalenderCategory;
  date: string;
  dateTo: string | null;
  timeFrom: string | null;
  timeTo: string | null;
  location: KalenderLocation | null;
  link: string | null;
  createdBy: string;
  createdByUsername: string;
  createdByDisplayName: string;
  participantCount: number;
  participants: string[];
  participantDisplayNames: Record<string, string>;
  participantUsernames: Record<string, string>;
  createdAt: string;
}

const CATEGORIES: KalenderCategory[] = ["Buchmesse", "Lesung", "Release", "Sonstiges"];

const CATEGORY_COLORS: Record<KalenderCategory, string> = {
  "Buchmesse": "bg-blue-100 text-blue-800 border-blue-300",
  "Lesung": "bg-purple-100 text-purple-800 border-purple-300",
  "Release": "bg-green-100 text-green-800 border-green-300",
  "Sonstiges": "bg-gray-100 text-gray-800 border-gray-300",
};

const CATEGORY_MAP_COLORS: Record<KalenderCategory, string> = {
  "Buchmesse": "#2563eb",
  "Lesung": "#a855f7",
  "Release": "#16a34a",
  "Sonstiges": "#6b7280",
};

type ViewMode = "list" | "map";

const COUNTRIES: readonly string[] = VALID_COUNTRIES;

function CountryAutocomplete({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const suggestions = value.length >= 1
    ? COUNTRIES.filter((c) => c.toLowerCase().includes(value.toLowerCase()))
    : [];

  const isValid = !value || COUNTRIES.includes(value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setFocused(true);
          if (value.length >= 1) setOpen(true);
        }}
        onBlur={() => setFocused(false)}
        className={`${className ?? ""} ${!isValid && !focused ? "border-red-400 ring-1 ring-red-300" : ""}`}
        placeholder={placeholder}
        autoComplete="off"
      />
      {!isValid && !focused && (
        <p className="text-xs text-red-500 mt-0.5">Bitte wähle ein gültiges Land aus.</p>
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white dark:bg-[#1e1e1e] border border-[var(--color-arena-border)] rounded shadow-lg mt-1 max-h-48 overflow-y-auto text-sm">
          {suggestions.slice(0, 20).map((c) => (
            <li
              key={c}
              className="px-3 py-1.5 cursor-pointer hover:bg-[var(--color-arena-primary)] hover:text-white"
              onMouseDown={() => {
                onChange(c);
                setOpen(false);
              }}
            >
              {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function getMonthLabel(year: number, month: number): string {
  const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  return `${monthNames[month - 1]} ${year}`;
}

// Geocoding via server-side proxy with in-memory cache
const geocodeCache = new Map<string, [number, number] | null>();

async function geocodeLocation(loc: {
  street?: string;
  city?: string;
  zipCode?: string;
  country?: string;
}): Promise<[number, number] | null> {
  const parts = [loc.street, loc.zipCode, loc.city, loc.country].filter(Boolean);
  if (parts.length === 0) return null;
  const query = parts.join(", ");
  const key = query.toLowerCase();
  if (geocodeCache.has(key)) return geocodeCache.get(key)!;

  try {
    const res = await fetch(`/api/kalender/geocode?q=${encodeURIComponent(query)}`);
    if (!res.ok) { geocodeCache.set(key, null); return null; }
    const data = (await res.json()) as { coords: { lat: number; lon: number } | null };
    if (!data.coords) {
      // Fallback: try with just city + country
      if (loc.street && loc.city) {
        const fallbackParts = [loc.city, loc.country].filter(Boolean);
        const fallbackQuery = fallbackParts.join(", ");
        const fallbackRes = await fetch(`/api/kalender/geocode?q=${encodeURIComponent(fallbackQuery)}`);
        if (fallbackRes.ok) {
          const fallbackData = (await fallbackRes.json()) as { coords: { lat: number; lon: number } | null };
          if (fallbackData.coords) {
            const coords: [number, number] = [fallbackData.coords.lat, fallbackData.coords.lon];
            geocodeCache.set(key, coords);
            return coords;
          }
        }
      }
      geocodeCache.set(key, null);
      return null;
    }
    const coords: [number, number] = [data.coords.lat, data.coords.lon];
    geocodeCache.set(key, coords);
    return coords;
  } catch {
    geocodeCache.set(key, null);
    return null;
  }
}

export default function KalenderPage() {
  const [username, setUsername] = useState<string>("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [events, setEvents] = useState<KalenderEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Sonstiges" as KalenderCategory,
    date: "",
    dateTo: "",
    timeFrom: "",
    timeTo: "",
    locationStreet: "",
    locationCity: "",
    locationZipCode: "",
    locationCountry: "",
    link: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail modal
  const [selectedEvent, setSelectedEvent] = useState<KalenderEvent | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isUserRole, setIsUserRole] = useState<"none" | "admin" | "user">("none");
  const [editFormData, setEditFormData] = useState(formData);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportText, setReportText] = useState("");
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);

  // Category filter
  const [filterCategories, setFilterCategories] = useState<Set<KalenderCategory>>(new Set());

  const toggleFilterCategory = (cat: KalenderCategory) => {
    setFilterCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // Map state
  const [eventCoords, setEventCoords] = useState<Record<string, [number, number]>>({});
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const leafletRef = useRef<LeafletModule | null>(null);

  // Auth sync
  useEffect(() => {
    const sync = () => {
      const account = getStoredAccount();
      if (account) {
        setLoggedIn(true);
        setUsername(account.username);
      } else {
        setLoggedIn(false);
        setUsername("");
      }
    };
    sync();
    window.addEventListener(ACCOUNT_CHANGED_EVENT, sync);
    return () => window.removeEventListener(ACCOUNT_CHANGED_EVENT, sync);
  }, []);

  // Load events
  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/kalender/list?year=${year}&month=${month}`);
      const data = (await response.json()) as { events?: KalenderEvent[] };
      setEvents(data.events ?? []);
    } catch (err) {
      console.error("Error loading events:", err);
      setMessage("Fehler beim Laden der Termine.");
    } finally {
      setIsLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  // Geocode events whenever they change
  useEffect(() => {
    let cancelled = false;
    const eventsWithLoc = events.filter((e) => e.location?.city || e.location?.street);
    if (eventsWithLoc.length === 0) {
      setEventCoords({});
      return;
    }

    (async () => {
      const results: Record<string, [number, number]> = {};
      for (const event of eventsWithLoc) {
        if (cancelled) return;
        const coords = await geocodeLocation(event.location!);
        if (coords) results[event.id] = coords;
      }
      if (!cancelled) setEventCoords(results);
    })();

    return () => { cancelled = true; };
  }, [events]);

  // Initialize Leaflet map + place markers
  useEffect(() => {
    if (viewMode !== "map" || !mapContainer.current) return;

    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;

    const run = async () => {
      try {
        // If map doesn't exist yet, create it
        if (!mapInstance.current) {
          const container = mapContainer.current;
          if (!container) return;

          // Wait until the container has a real size
          if (container.clientWidth === 0 || container.clientHeight === 0) {
            await new Promise<void>((resolve) => {
              const ro = new ResizeObserver((entries) => {
                for (const entry of entries) {
                  if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
                    ro.disconnect();
                    resolve();
                    return;
                  }
                }
              });
              ro.observe(container);
              resizeObserver = ro;
            });
          }

          if (disposed || !mapContainer.current) return;

          const L = (await import("leaflet")) as LeafletModule;
          leafletRef.current = L;
          if (disposed || !mapContainer.current) return;

          const map = L.map(mapContainer.current, {
            center: [48.5, 10.5],
            zoom: 6,
            zoomControl: true,
          });

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "© OpenStreetMap",
          }).addTo(map);

          mapInstance.current = map;

          setTimeout(() => {
            if (!disposed && mapInstance.current) mapInstance.current.invalidateSize();
          }, 300);
        }

        // Place markers (map already exists at this point)
        const map = mapInstance.current;
        const L = leafletRef.current;
        if (!map || !L || disposed) return;

        // Remove old markers
        markersRef.current.forEach((m) => m.remove?.());
        markersRef.current = [];

        const eventsToPlace = filterCategories.size === 0 ? events : events.filter((e) => filterCategories.has(e.category));
        for (const event of eventsToPlace) {
          const coords = eventCoords[event.id];
          if (!coords) continue;

          const color = CATEGORY_MAP_COLORS[event.category];
          const marker = L.circleMarker(coords, {
            radius: 12,
            fillColor: color,
            color: "#fff",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9,
          }).addTo(map);

          marker.bindPopup(
            `<div style="max-width: 220px">
              <strong>${event.title}</strong><br>
              <small>${event.category}</small><br>
              ${event.location?.street ? `${event.location.street}<br>` : ""}
              ${event.location?.zipCode ? `${event.location.zipCode} ` : ""}${event.location?.city ?? ""}<br>
              <small>von ${event.createdByDisplayName || event.createdBy}</small>
            </div>`
          );

          marker.on("click", () => openEventDetail(event));
          markersRef.current.push(marker);
        }
      } catch (err) {
        console.error("Map error:", err);
      }
    };

    void run();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
    };
  }, [viewMode, events, eventCoords, filterCategories]);

  // Cleanup map when leaving map view
  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [viewMode]);

  const goToPreviousMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = async () => {
    if (!loggedIn) {
      setMessage("Bitte melde dich an.");
      return;
    }

    if (!formData.title.trim() || !formData.description.trim() || !formData.date) {
      setMessage("Bitte fülle alle erforderlichen Felder aus.");
      return;
    }

    if (formData.locationCountry && !COUNTRIES.includes(formData.locationCountry)) {
      setMessage("Bitte wähle ein gültiges Land aus.");
      return;
    }

    if ((formData.category === "Buchmesse" || formData.category === "Lesung") && (!formData.locationCity.trim() || !formData.locationCountry.trim())) {
      setMessage("Bei Buchmessen und Lesungen sind Stadt und Land Pflichtfelder.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/kalender/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = (await response.json()) as { success?: boolean; message?: string; id?: string };

      if (!response.ok) {
        setMessage(data.message || "Fehler beim Erstellen.");
        return;
      }

      setMessage("Termin erstellt!");
      setFormData({
        title: "",
        description: "",
        category: "Sonstiges",
        date: "",
        dateTo: "",
        timeFrom: "",
        timeTo: "",
        locationStreet: "",
        locationCity: "",
        locationZipCode: "",
        locationCountry: "",
        link: "",
      });
      setShowForm(false);
      await loadEvents();
    } catch (err) {
      console.error("Error:", err);
      setMessage("Fehler beim Erstellen.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEventDetail = (event: KalenderEvent) => {
    setSelectedEvent(event);
    setIsEditMode(false);
    if (event.createdBy === username || username === "Kopernikus") {
      setIsUserRole(username === "Kopernikus" ? "admin" : "user");
    } else {
      setIsUserRole("none");
    }
    setEditFormData({
      title: event.title,
      description: event.description,
      category: event.category,
      date: event.date,
      dateTo: event.dateTo ?? "",
      timeFrom: event.timeFrom ?? "",
      timeTo: event.timeTo ?? "",
      locationStreet: event.location?.street ?? "",
      locationCity: event.location?.city ?? "",
      locationZipCode: event.location?.zipCode ?? "",
      locationCountry: event.location?.country ?? "",
      link: event.link ?? "",
    });
  };

  const closeEventDetail = () => {
    setSelectedEvent(null);
    // Refresh map after modal closes so Leaflet regains interactivity
    setTimeout(() => {
      if (mapInstance.current) mapInstance.current.invalidateSize();
    }, 50);
  };

  const handleJoinEvent = async () => {
    if (!selectedEvent) return;

    try {
      const response = await fetch("/api/kalender/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedEvent.id }),
      });

      const data = (await response.json()) as { success?: boolean; participants?: string[] };

      if (response.ok && data.success) {
        setSelectedEvent((prev) =>
          prev
            ? {
                ...prev,
                participants: data.participants ?? prev.participants,
                participantCount: data.participants?.length ?? prev.participantCount,
              }
            : null
        );
        await loadEvents();
      }
    } catch (err) {
      console.error("Error:", err);
    }
  };

  const handleStartEdit = () => {
    setIsEditMode(true);
  };

  const handleEditFormChange = (field: string, value: string) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditSubmit = async () => {
    if (!selectedEvent) return;

    if (!editFormData.title.trim() || !editFormData.description.trim() || !editFormData.date) {
      setMessage("Bitte fülle alle erforderlichen Felder aus.");
      return;
    }

    if (editFormData.locationCountry && !COUNTRIES.includes(editFormData.locationCountry)) {
      setMessage("Bitte wähle ein gültiges Land aus.");
      return;
    }

    if ((editFormData.category === "Buchmesse" || editFormData.category === "Lesung") && (!editFormData.locationCity.trim() || !editFormData.locationCountry.trim())) {
      setMessage("Bei Buchmessen und Lesungen sind Stadt und Land Pflichtfelder.");
      return;
    }

    setIsEditSubmitting(true);
    try {
      const response = await fetch("/api/kalender/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedEvent.id, ...editFormData }),
      });

      const data = (await response.json()) as { success?: boolean; message?: string };

      if (!response.ok) {
        setMessage(data.message || "Fehler beim Aktualisieren.");
        return;
      }

      setMessage("Termin aktualisiert!");
      setIsEditMode(false);
      await loadEvents();
      const updatedEvent = events.find((e) => e.id === selectedEvent.id);
      if (updatedEvent) {
        setSelectedEvent(updatedEvent);
      } else {
        closeEventDetail();
      }
    } catch (err) {
      console.error("Error:", err);
      setMessage("Fehler beim Aktualisieren.");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent || !confirm("Wirklich löschen?")) return;

    try {
      const response = await fetch("/api/kalender/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedEvent.id }),
      });

      const data = (await response.json()) as { success?: boolean; message?: string };

      if (response.ok && data.success) {
        setMessage("Termin gelöscht!");
        closeEventDetail();
        await loadEvents();
      } else {
        setMessage(data.message || "Fehler beim Löschen.");
      }
    } catch (err) {
      console.error("Error:", err);
      setMessage("Fehler beim Löschen.");
    }
  };

  const handleReportSubmit = async () => {
    if (!selectedEvent || !reportText.trim()) return;
    setIsReportSubmitting(true);
    try {
      const response = await fetch("/api/kalender/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: selectedEvent.id, text: reportText.trim() }),
      });
      const data = (await response.json()) as { success?: boolean; message?: string };
      if (response.ok && data.success) {
        setMessage("Fehler wurde gemeldet. Danke!");
        setShowReportModal(false);
        setReportText("");
      } else {
        setMessage(data.message || "Fehler beim Melden.");
      }
    } catch {
      setMessage("Fehler beim Melden.");
    } finally {
      setIsReportSubmitting(false);
    }
  };

  const filteredEvents = filterCategories.size === 0 ? events : events.filter((e) => filterCategories.has(e.category));

  const groupedEvents = new Map<string, KalenderEvent[]>();
  filteredEvents.forEach((event) => {
    if (event.dateTo && event.dateTo > event.date) {
      // Multi-day event: add to each day within the current month view
      const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
      const start = event.date < monthStart ? monthStart : event.date;
      const end = event.dateTo >= monthEnd ? monthEnd : event.dateTo;
      let current = start;
      while (current <= end && current < monthEnd) {
        if (!groupedEvents.has(current)) groupedEvents.set(current, []);
        groupedEvents.get(current)!.push(event);
        // Increment day (use noon to avoid timezone/DST issues with toISOString)
        const d = new Date(current + "T12:00:00");
        d.setDate(d.getDate() + 1);
        current = d.toISOString().slice(0, 10);
      }
    } else {
      if (!groupedEvents.has(event.date)) groupedEvents.set(event.date, []);
      groupedEvents.get(event.date)!.push(event);
    }
  });

  const sortedDates = Array.from(groupedEvents.keys()).sort();
  const eventsWithLocation = filteredEvents.filter((e) => eventCoords[e.id]);

  return (
    <main className="top-centered-main">
      <div className="w-full space-y-6">
        {/* Header mit View Toggle */}
        <section className="card font-sans">
          <div className="flex flex-col items-center gap-3 sm:gap-4 font-sans">
            <div className="flex items-center gap-1.5 sm:gap-2 w-full justify-center font-sans">
              <button
                onClick={goToPreviousMonth}
                className="btn btn-sm font-sans flex-shrink-0 sm:!w-24"
              >
                ← <span className="hidden sm:inline">Zurück</span>
              </button>
              <h1 className="font-sans text-2xl font-bold text-center text-arena-blue flex-1 sm:flex-none sm:min-w-[14rem]">
                {getMonthLabel(year, month)}
              </h1>
              <button
                onClick={goToNextMonth}
                className="btn btn-sm font-sans flex-shrink-0 sm:!w-24"
              >
                <span className="hidden sm:inline">Weiter </span>→
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 w-full font-sans">
              <div className="segmented-control font-sans">
                <button
                  onClick={() => setViewMode("list")}
                  className={`segmented-control-btn font-sans ${
                    viewMode === "list" ? "active" : ""
                  }`}
                >
                  📅 Kalender
                </button>
                <button
                  onClick={() => setViewMode("map")}
                  className={`segmented-control-btn font-sans ${
                    viewMode === "map" ? "active" : ""
                  }`}
                >
                  🗺️ Karte
                </button>
              </div>
              {loggedIn && (
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="btn btn-primary font-sans"
                >
                  + Termin erstellen
                </button>
              )}
            </div>
            {/* Category filter */}
            <div className="flex flex-wrap items-center justify-center gap-2 w-full font-sans">
              <span className="font-sans text-xs text-arena-muted font-bold">Filtern:</span>
              {CATEGORIES.map((cat) => {
                const active = filterCategories.has(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleFilterCategory(cat)}
                    className={`font-sans px-3 py-1 text-xs sm:text-sm font-semibold rounded border transition ${
                      active ? CATEGORY_COLORS[cat] : "border-arena-border-light text-arena-muted hover:border-arena-blue hover:text-arena-blue"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
              {filterCategories.size > 0 && (
                <button
                  onClick={() => setFilterCategories(new Set())}
                  className="font-sans px-3 py-1 text-xs sm:text-sm rounded border border-arena-border-light text-arena-muted hover:text-arena-danger hover:border-arena-danger/40 transition"
                >
                  ✕ Alle
                </button>
              )}
            </div>
          </div>
        </section>

        {showForm && loggedIn && (
          <div className="overlay-backdrop" style={{ zIndex: 10000 }}>
            <div className="card font-sans max-w-2xl w-full max-h-[90vh] overflow-y-auto p-0 bg-white" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-arena-border-light px-6 py-4 flex items-center justify-between z-10 font-sans">
                <h2 className="font-sans text-xl font-bold text-arena-blue tracking-tight m-0">
                  Neuer Termin
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-2xl leading-none text-arena-muted hover:text-arena-text transition-colors border-none bg-transparent cursor-pointer font-sans"
                >
                  ×
                </button>
              </div>
              <div className="p-6 space-y-4 font-sans">
              <div>
                <label className="block text-sm font-bold text-arena-blue mb-1 font-sans">Titel *</label>
                <input
                  type="text"
                  maxLength={200}
                  value={formData.title}
                  onChange={(e) => handleFormChange("title", e.target.value)}
                  className="input-base font-normal w-full mt-1"
                  placeholder="z.B. Frankfurter Buchmesse 2026"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-arena-blue mb-1 font-sans">Beschreibung *</label>
                <textarea
                  maxLength={3000}
                  value={formData.description}
                  onChange={(e) => handleFormChange("description", e.target.value)}
                  rows={4}
                  className="input-base font-normal w-full mt-1 resize-y font-sans"
                  placeholder="Beschreibe den Termin..."
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4 font-sans">
                <div>
                  <label className="block text-sm font-bold text-arena-blue mb-1 font-sans">Kategorie *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleFormChange("category", e.target.value)}
                    className="input-base font-normal w-full mt-1"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-arena-blue mb-1 font-sans">Datum *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleFormChange("date", e.target.value)}
                    className="input-base font-normal w-full mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-arena-blue mb-1 font-sans">Bis Datum (optional, für mehrtägige Termine)</label>
                <input
                  type="date"
                  value={formData.dateTo}
                  onChange={(e) => handleFormChange("dateTo", e.target.value)}
                  min={formData.date || undefined}
                  className="input-base font-normal w-full mt-1"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4 font-sans">
                <div>
                  <label className="block text-sm font-bold text-arena-blue mb-1 font-sans">Von (optional)</label>
                  <input
                    type="time"
                    value={formData.timeFrom}
                    onChange={(e) => handleFormChange("timeFrom", e.target.value)}
                    className="input-base font-normal w-full mt-1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-arena-blue mb-1 font-sans">Bis (optional)</label>
                  <input
                    type="time"
                    value={formData.timeTo}
                    onChange={(e) => handleFormChange("timeTo", e.target.value)}
                    className="input-base font-normal w-full mt-1"
                  />
                </div>
              </div>

              <fieldset className="border border-arena-border-light rounded-lg p-4 font-sans">
                <legend className="font-sans text-sm font-bold text-arena-blue px-1.5">Ort {formData.category === "Buchmesse" || formData.category === "Lesung" ? "(Stadt + Land Pflicht)" : "(optional)"}</legend>
                <div className="space-y-3 mt-3 font-sans">
                  <div>
                    <label className="block text-xs font-bold text-arena-blue mb-0.5 font-sans">Straße</label>
                    <input
                      type="text"
                      value={formData.locationStreet}
                      onChange={(e) => handleFormChange("locationStreet", e.target.value)}
                      className="input-base font-normal w-full mt-1 text-sm"
                      placeholder="Straße und Hausnummer"
                    />
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3 font-sans">
                    <div>
                      <label className="block text-xs font-bold text-arena-blue mb-0.5 font-sans">PLZ</label>
                      <input
                        type="text"
                        value={formData.locationZipCode}
                        onChange={(e) => handleFormChange("locationZipCode", e.target.value)}
                        className="input-base font-normal w-full mt-1 text-sm"
                        placeholder="12345"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-arena-blue mb-0.5 font-sans">Stadt {formData.category === "Buchmesse" || formData.category === "Lesung" ? "*" : ""}</label>
                      <input
                        type="text"
                        value={formData.locationCity}
                        onChange={(e) => handleFormChange("locationCity", e.target.value)}
                        className="input-base font-normal w-full mt-1 text-sm"
                        placeholder="Hamburg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-arena-blue mb-0.5 font-sans">Land {formData.category === "Buchmesse" || formData.category === "Lesung" ? "*" : ""}</label>
                      <CountryAutocomplete
                        value={formData.locationCountry}
                        onChange={(v) => handleFormChange("locationCountry", v)}
                        className="input-base font-normal w-full mt-1 text-sm"
                        placeholder="Deutschland"
                      />
                    </div>
                  </div>
                </div>
              </fieldset>

              <div>
                <label className="block text-sm font-bold text-arena-blue mb-1 font-sans">Link (optional)</label>
                <input
                  type="url"
                  maxLength={500}
                  value={formData.link}
                  onChange={(e) => handleFormChange("link", e.target.value)}
                  className="input-base font-normal w-full mt-1 text-sm"
                  placeholder="https://beispiel.de/event"
                />
              </div>

              {message && <div className="font-sans p-3 bg-green-100 text-green-800 rounded font-semibold text-sm">{message}</div>}

              <div className="flex gap-3 font-sans mt-4">
                <button
                  onClick={handleFormSubmit}
                  disabled={isSubmitting}
                  className="btn btn-primary font-sans flex-1"
                >
                  {isSubmitting ? "Wird erstellt..." : "Erstellen"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="btn font-sans"
                >
                  Abbrechen
                </button>
              </div>
              </div>
            </div>
          </div>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <section className="card font-sans">
            {isLoading ? (
              <p className="font-sans text-sm text-arena-muted">Lade Termine...</p>
            ) : filteredEvents.length === 0 ? (
              <p className="font-sans text-sm text-arena-muted">{events.length === 0 ? `Keine Termine im ${getMonthLabel(year, month)}.` : "Keine Termine für den gewählten Filter."}</p>
            ) : (
              <div className="space-y-6 font-sans">
                {sortedDates.map((date) => (
                  <div key={date} className="font-sans">
                    <h3 className="font-sans font-bold text-base mb-3 text-arena-blue">
                      {new Date(date + "T00:00:00").toLocaleDateString("de-DE", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </h3>
                    <div className="grid gap-3 font-sans">
                      {groupedEvents.get(date)!.map((event) => (
                        <div
                          key={event.id}
                          onClick={() => openEventDetail(event)}
                          className="p-4 border border-arena-border-light rounded-lg cursor-pointer hover:shadow-md transition-shadow font-sans bg-white"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 font-sans">
                            <div className="flex-1 min-w-0 font-sans">
                              <div className="flex flex-wrap items-center gap-2 mb-2 font-sans">
                                <span
                                  className={`font-sans px-2 py-0.5 sm:px-3 sm:py-1 text-xs sm:text-sm font-bold rounded border ${CATEGORY_COLORS[event.category]}`}
                                >
                                  {event.category}
                                </span>
                                {event.dateTo && event.dateTo > event.date && (
                                  <span className="font-sans px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-800 border border-amber-300 font-sans">
                                    {new Date(event.date + "T00:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                                    {" – "}
                                    {new Date(event.dateTo + "T00:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                                  </span>
                                )}
                                {event.timeFrom && (
                                  <span className="font-sans text-xs sm:text-sm text-arena-muted font-semibold">
                                    {event.timeFrom}
                                    {event.timeTo ? ` - ${event.timeTo}` : ""}
                                  </span>
                                )}
                              </div>
                              <h4 className="font-sans font-bold text-base sm:text-lg text-arena-blue mb-1">{event.title}</h4>
                              <p className="font-sans text-xs sm:text-sm text-arena-muted line-clamp-2">{event.description}</p>
                              {event.location && (
                                <p className="font-sans text-xs sm:text-sm text-arena-muted mt-2">
                                  📍{" "}
                                  {[event.location.street, event.location.zipCode, event.location.city, event.location.country]
                                    .filter(Boolean)
                                    .join(", ")}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 shrink-0 flex-wrap font-sans">
                              <div className="font-sans text-xs text-arena-muted">von {event.createdByDisplayName || event.createdBy}</div>
                              {event.participants.length > 0 && (
                                <div className="sm:text-right font-sans">
                                  <div className="text-xs text-arena-muted mb-1 font-sans">Dabei ({event.participants.length}):</div>
                                  <div className="flex flex-wrap sm:justify-end gap-1 font-sans">
                                    {event.participants.map((p) => (
                                      <Link
                                        key={p}
                                        href={`/autor/${encodeURIComponent(event.participantUsernames?.[p] || p)}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-xs px-2.5 py-1 rounded-full bg-arena-blue text-white hover:opacity-85 transition-opacity font-sans font-semibold"
                                      >
                                        {event.participantDisplayNames?.[p] || p}
                                      </Link>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Map View */}
        {viewMode === "map" && (
          <section className="card font-sans">
            <div className="space-y-4 font-sans">
              <>
                <div
                  ref={mapContainer}
                  className="relative z-0 h-[350px] sm:h-[600px] border border-arena-border-light rounded-lg bg-arena-bg"
                  style={{
                    width: "100%",
                  }}
                />

                {eventsWithLocation.length === 0 && (
                  <p className="font-sans text-sm text-arena-muted">Keine Termine mit Standortinformationen im {getMonthLabel(year, month)}.</p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-sans">
                  {Object.entries(CATEGORY_MAP_COLORS).map(([cat, color]) => (
                    <div key={cat} className="flex items-center gap-2 font-sans">
                      <div
                        style={{
                          width: "16px",
                          height: "16px",
                          backgroundColor: color,
                          borderRadius: "50%",
                          border: "2px solid white",
                          boxShadow: "0 0 4px rgba(0,0,0,0.3)",
                        }}
                      />
                      <span className="text-xs font-sans font-medium text-arena-muted">{cat}</span>
                    </div>
                  ))}
                </div>
              </>
            </div>
          </section>
        )}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="overlay-backdrop" style={{ zIndex: 10000 }}>
          <div className="card font-sans max-w-2xl w-full max-h-[90vh] overflow-y-auto p-0 bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-arena-border-light px-6 py-4 flex items-center justify-between gap-2 z-10 font-sans">
              <h2 className="font-sans text-xl font-bold line-clamp-2 text-arena-blue tracking-tight m-0">
                {selectedEvent.title}
              </h2>
              <button
                onClick={() => closeEventDetail()}
                className="text-2xl leading-none text-arena-muted hover:text-arena-text transition-colors border-none bg-transparent cursor-pointer font-sans"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4 font-sans">
              {!isEditMode ? (
                <>
                  <div>
                    <span className={`font-sans inline-block px-3 py-1 text-sm font-bold rounded border ${CATEGORY_COLORS[selectedEvent.category]}`}>
                      {selectedEvent.category}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-arena-blue mb-1 font-sans">Beschreibung</label>
                    <p className="font-sans text-sm text-arena-text text-justify leading-relaxed">{selectedEvent.description}</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 font-sans">
                    <div>
                      <label className="block text-sm font-bold text-arena-blue mb-1 font-sans">Datum</label>
                      <p className="font-sans text-sm text-arena-text">
                        {new Date(selectedEvent.date + "T00:00:00").toLocaleDateString("de-DE", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                        {selectedEvent.dateTo && selectedEvent.dateTo > selectedEvent.date && (
                          <>
                            {" – "}
                            {new Date(selectedEvent.dateTo + "T00:00:00").toLocaleDateString("de-DE", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </>
                        )}
                      </p>
                    </div>
                    {selectedEvent.timeFrom && (
                      <div>
                        <label className="block text-sm font-bold text-arena-blue mb-1 font-sans">Uhrzeit</label>
                        <p className="font-sans text-sm text-arena-text">
                          {selectedEvent.timeFrom}
                          {selectedEvent.timeTo && ` - ${selectedEvent.timeTo}`}
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedEvent.location && (
                    <div>
                      <label className="block text-sm font-bold text-arena-blue mb-1 font-sans">Ort</label>
                      <p className="font-sans text-sm text-arena-text">
                        {[
                          selectedEvent.location.street,
                          selectedEvent.location.zipCode,
                          selectedEvent.location.city,
                          selectedEvent.location.country,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  )}

                  {selectedEvent.link && (
                    <div>
                      <label className="block text-sm font-bold text-arena-blue mb-1 font-sans">Link</label>
                      <p className="font-sans text-sm text-arena-text">
                        <a
                          href={selectedEvent.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-sans text-sm text-arena-link hover:underline break-all"
                        >
                          {selectedEvent.link}
                        </a>
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-arena-blue mb-1 font-sans">Erstellt von</label>
                    <p className="font-sans text-sm text-arena-text">
                      <Link href={`/autor/${encodeURIComponent(selectedEvent.createdByUsername || selectedEvent.createdBy)}`} className="font-sans text-sm text-arena-link hover:underline">
                        {selectedEvent.createdByDisplayName || selectedEvent.createdBy}
                      </Link>
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-arena-blue mb-2 font-sans">Teilnehmer ({selectedEvent.participantCount})</label>
                    <div className="flex flex-wrap gap-2 font-sans">
                      {selectedEvent.participants.map((p) => (
                        <Link
                          key={p}
                          href={`/autor/${encodeURIComponent(selectedEvent.participantUsernames?.[p] || p)}`}
                          className="font-sans px-3 py-1 bg-arena-blue text-white text-sm rounded-full hover:opacity-85 transition-opacity font-semibold"
                        >
                          {selectedEvent.participantDisplayNames?.[p] || p}
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:gap-3 pt-4 border-t border-arena-border-light font-sans mt-4">
                    {loggedIn && !selectedEvent.participants.includes(username) && (
                      <button
                        onClick={handleJoinEvent}
                        className="btn btn-primary font-sans flex-1 min-w-[120px] font-bold"
                      >
                        ✓ Ich bin dabei
                      </button>
                    )}
                    {loggedIn && selectedEvent.participants.includes(username) && (
                      <button
                        onClick={handleJoinEvent}
                        className="btn font-sans flex-1 min-w-[120px] text-arena-muted hover:bg-gray-200 font-bold"
                      >
                        ✓ Absagen
                      </button>
                    )}
                    {(isUserRole === "user" || isUserRole === "admin") && (
                      <button
                        onClick={handleStartEdit}
                        className="btn font-sans font-bold"
                      >
                        ✎ Bearbeiten
                      </button>
                    )}
                    {(isUserRole === "user" || isUserRole === "admin") && (
                      <button
                        onClick={handleDeleteEvent}
                        className="btn font-sans text-arena-danger hover:bg-red-50 font-bold"
                      >
                        🗑 Löschen
                      </button>
                    )}
                    {loggedIn && selectedEvent.createdBy !== username && (
                      <button
                        onClick={() => { setReportText(""); setShowReportModal(true); }}
                        className="btn font-sans text-orange-600 border-orange-400/40 hover:bg-orange-55 font-bold"
                      >
                        ⚠ Fehler melden
                      </button>
                    )}
                    <button
                      onClick={() => closeEventDetail()}
                      className="btn font-sans"
                    >
                      Schließen
                    </button>
                  </div>

                  {/* Fehler melden Modal */}
                  {showReportModal && (
                    <div className="mt-4 p-4 border border-orange-200 rounded-lg bg-orange-50/50 font-sans">
                      <h4 className="font-sans font-bold mb-2 text-orange-800 text-sm">Fehler melden</h4>
                      <textarea
                        value={reportText}
                        onChange={(e) => setReportText(e.target.value)}
                        maxLength={2000}
                        rows={3}
                        className="input-base font-normal w-full mt-1 text-sm font-sans resize-y border-orange-200"
                        placeholder="Beschreibe den Fehler (mind. 5 Zeichen)..."
                      />
                      <div className="flex gap-2 mt-2 font-sans">
                        <button
                          onClick={handleReportSubmit}
                          disabled={isReportSubmitting || reportText.trim().length < 5}
                          className="btn font-sans text-sm bg-orange-500 hover:bg-orange-600 text-white font-bold"
                        >
                          {isReportSubmitting ? "Wird gesendet..." : "Absenden"}
                        </button>
                        <button
                          onClick={() => setShowReportModal(false)}
                          className="btn font-sans text-sm"
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-bold text-arena-blue mb-1 font-sans">Titel *</label>
                    <input
                      type="text"
                      maxLength={200}
                      value={editFormData.title}
                      onChange={(e) => handleEditFormChange("title", e.target.value)}
                      className="input-base font-normal w-full mt-1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-arena-blue mb-1 font-sans">Beschreibung *</label>
                    <textarea
                      maxLength={3000}
                      value={editFormData.description}
                      onChange={(e) => handleEditFormChange("description", e.target.value)}
                      rows={4}
                      className="input-base font-normal w-full mt-1 resize-y font-sans"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 font-sans">
                    <div>
                      <label className="block text-sm font-bold text-arena-blue mb-1 font-sans">Kategorie *</label>
                      <select
                        value={editFormData.category}
                        onChange={(e) => handleEditFormChange("category", e.target.value)}
                        className="input-base font-normal w-full mt-1"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-arena-blue mb-1 font-sans">Datum *</label>
                      <input
                        type="date"
                        value={editFormData.date}
                        onChange={(e) => handleEditFormChange("date", e.target.value)}
                        className="input-base font-normal w-full mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-arena-blue mb-1 font-sans">Bis Datum (optional, für mehrtägige Termine)</label>
                    <input
                      type="date"
                      value={editFormData.dateTo}
                      onChange={(e) => handleEditFormChange("dateTo", e.target.value)}
                      min={editFormData.date || undefined}
                      className="input-base font-normal w-full mt-1"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 font-sans">
                    <div>
                      <label className="block text-sm font-bold text-arena-blue mb-1 font-sans">Von (optional)</label>
                      <input
                        type="time"
                        value={editFormData.timeFrom}
                        onChange={(e) => handleEditFormChange("timeFrom", e.target.value)}
                        className="input-base font-normal w-full mt-1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-arena-blue mb-1 font-sans">Bis (optional)</label>
                      <input
                        type="time"
                        value={editFormData.timeTo}
                        onChange={(e) => handleEditFormChange("timeTo", e.target.value)}
                        className="input-base font-normal w-full mt-1"
                      />
                    </div>
                  </div>

                  <fieldset className="border border-arena-border-light rounded-lg p-4 font-sans">
                    <legend className="font-sans text-sm font-bold text-arena-blue px-1.5">Ort {editFormData.category === "Buchmesse" || editFormData.category === "Lesung" ? "(Stadt + Land Pflicht)" : "(optional)"}</legend>
                    <div className="space-y-3 mt-3 font-sans">
                      <div>
                        <label className="block text-xs font-bold text-arena-blue mb-0.5 font-sans">Straße</label>
                        <input
                          type="text"
                          value={editFormData.locationStreet}
                          onChange={(e) => handleEditFormChange("locationStreet", e.target.value)}
                          className="input-base font-normal w-full mt-1 text-sm"
                        />
                      </div>
                      <div className="grid sm:grid-cols-3 gap-3 font-sans">
                        <div>
                          <label className="block text-xs font-bold text-arena-blue mb-0.5 font-sans">PLZ</label>
                          <input
                            type="text"
                            value={editFormData.locationZipCode}
                            onChange={(e) => handleEditFormChange("locationZipCode", e.target.value)}
                            className="input-base font-normal w-full mt-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-arena-blue mb-0.5 font-sans">Stadt {editFormData.category === "Buchmesse" || editFormData.category === "Lesung" ? "*" : ""}</label>
                          <input
                            type="text"
                            value={editFormData.locationCity}
                            onChange={(e) => handleEditFormChange("locationCity", e.target.value)}
                            className="input-base font-normal w-full mt-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-arena-blue mb-0.5 font-sans">Land {editFormData.category === "Buchmesse" || editFormData.category === "Lesung" ? "*" : ""}</label>
                          <CountryAutocomplete
                            value={editFormData.locationCountry}
                            onChange={(v) => handleEditFormChange("locationCountry", v)}
                            className="input-base font-normal w-full mt-1 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </fieldset>

                  <div>
                    <label className="block text-sm font-bold text-arena-blue mb-1 font-sans">Link (optional)</label>
                    <input
                      type="url"
                      maxLength={500}
                      value={editFormData.link}
                      onChange={(e) => handleEditFormChange("link", e.target.value)}
                      className="input-base font-normal w-full mt-1 text-sm"
                      placeholder="https://beispiel.de/event"
                    />
                  </div>

                  {message && <div className="font-sans p-3 bg-green-100 text-green-800 rounded font-semibold text-sm">{message}</div>}

                  <div className="flex gap-3 pt-4 border-t border-arena-border-light font-sans mt-4">
                    <button
                      onClick={handleEditSubmit}
                      disabled={isEditSubmitting}
                      className="btn btn-primary font-sans flex-1"
                    >
                      {isEditSubmitting ? "Wird gespeichert..." : "Speichern"}
                    </button>
                    <button
                      onClick={() => setIsEditMode(false)}
                      className="btn font-sans"
                    >
                      Abbrechen
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
