"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { getStoredAccount, ACCOUNT_CHANGED_EVENT } from "@/lib/client-account";
import type { KalenderCategory } from "@/lib/kalender";

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
  timeFrom: string | null;
  timeTo: string | null;
  location: KalenderLocation | null;
  createdBy: string;
  participantCount: number;
  participants: string[];
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
    timeFrom: "",
    timeTo: "",
    locationStreet: "",
    locationCity: "",
    locationZipCode: "",
    locationCountry: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail modal
  const [selectedEvent, setSelectedEvent] = useState<KalenderEvent | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isUserRole, setIsUserRole] = useState<"none" | "admin" | "user">("none");
  const [editFormData, setEditFormData] = useState(formData);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

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

        for (const event of events) {
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
              <small>von ${event.createdBy}</small>
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
  }, [viewMode, events, eventCoords]);

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
        timeFrom: "",
        timeTo: "",
        locationStreet: "",
        locationCity: "",
        locationZipCode: "",
        locationCountry: "",
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
      timeFrom: event.timeFrom ?? "",
      timeTo: event.timeTo ?? "",
      locationStreet: event.location?.street ?? "",
      locationCity: event.location?.city ?? "",
      locationZipCode: event.location?.zipCode ?? "",
      locationCountry: event.location?.country ?? "",
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

  if (!loggedIn) {
    return (
      <main className="top-centered-main">
        <section className="card">
          <p>
            Bitte <a href="/auth">melde dich an</a>, um den Kalender zu nutzen.
          </p>
        </section>
      </main>
    );
  }

  const groupedEvents = new Map<string, KalenderEvent[]>();
  events.forEach((event) => {
    if (!groupedEvents.has(event.date)) {
      groupedEvents.set(event.date, []);
    }
    groupedEvents.get(event.date)!.push(event);
  });

  const sortedDates = Array.from(groupedEvents.keys()).sort();
  const eventsWithLocation = events.filter((e) => eventCoords[e.id]);

  return (
    <main className="top-centered-main">
      <div className="w-full space-y-6">
        {/* Header mit View Toggle */}
        <section className="card">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
              <button
                onClick={goToPreviousMonth}
                className="w-28 px-4 py-2 bg-[var(--color-arena-blue)] text-white rounded hover:bg-[var(--color-arena-blue-mid)]"
              >
                ← Zurück
              </button>
              <h1 className="text-2xl font-bold text-center min-w-[14rem]" style={{ color: "var(--color-arena-blue)" }}>
                {getMonthLabel(year, month)}
              </h1>
              <button
                onClick={goToNextMonth}
                className="w-28 px-4 py-2 bg-[var(--color-arena-blue)] text-white rounded hover:bg-[var(--color-arena-blue-mid)]"
              >
                Weiter →
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setViewMode("list")}
                className={`px-4 py-2 rounded font-semibold transition ${
                  viewMode === "list"
                    ? "bg-[var(--color-arena-blue)] text-white"
                    : "border border-[var(--color-arena-blue)] text-[var(--color-arena-blue)] hover:bg-blue-50"
                }`}
              >
                📅 Kalender
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`px-4 py-2 rounded font-semibold transition ${
                  viewMode === "map"
                    ? "bg-[var(--color-arena-blue)] text-white"
                    : "border border-[var(--color-arena-blue)] text-[var(--color-arena-blue)] hover:bg-blue-50"
                }`}
              >
                🗺️ Karte
              </button>
            </div>
            {loggedIn && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-6 py-2 bg-[var(--color-arena-yellow)] text-[var(--color-arena-blue)] font-bold rounded hover:bg-yellow-400"
              >
                + Termin erstellen
              </button>
            )}
          </div>
        </section>

        {showForm && loggedIn && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4" style={{ zIndex: 10000 }}>
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-[var(--color-arena-border)] p-4 flex items-center justify-between">
                <h2 className="text-xl font-bold" style={{ color: "var(--color-arena-blue)" }}>
                  Neuer Termin
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-2xl leading-none hover:text-[var(--color-arena-muted)]"
                >
                  ×
                </button>
              </div>
              <div className="p-6 space-y-4">
              <div>
                <label className="block font-semibold mb-1">Titel *</label>
                <input
                  type="text"
                  maxLength={200}
                  value={formData.title}
                  onChange={(e) => handleFormChange("title", e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-arena-border)] rounded"
                  placeholder="z.B. Frankfurter Buchmesse 2026"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Beschreibung *</label>
                <textarea
                  maxLength={3000}
                  value={formData.description}
                  onChange={(e) => handleFormChange("description", e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-[var(--color-arena-border)] rounded"
                  placeholder="Beschreibe den Termin..."
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Kategorie *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleFormChange("category", e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-arena-border)] rounded"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Datum *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleFormChange("date", e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-arena-border)] rounded"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Von (optional)</label>
                  <input
                    type="time"
                    value={formData.timeFrom}
                    onChange={(e) => handleFormChange("timeFrom", e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-arena-border)] rounded"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Bis (optional)</label>
                  <input
                    type="time"
                    value={formData.timeTo}
                    onChange={(e) => handleFormChange("timeTo", e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-arena-border)] rounded"
                  />
                </div>
              </div>

              <fieldset className="border border-[var(--color-arena-border)] rounded p-4">
                <legend className="font-semibold">Ort (optional)</legend>
                <div className="space-y-3 mt-3">
                  <div>
                    <label className="block text-sm mb-1">Straße</label>
                    <input
                      type="text"
                      value={formData.locationStreet}
                      onChange={(e) => handleFormChange("locationStreet", e.target.value)}
                      className="w-full px-3 py-2 border border-[var(--color-arena-border)] rounded text-sm"
                      placeholder="Straße und Hausnummer"
                    />
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm mb-1">PLZ</label>
                      <input
                        type="text"
                        value={formData.locationZipCode}
                        onChange={(e) => handleFormChange("locationZipCode", e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--color-arena-border)] rounded text-sm"
                        placeholder="12345"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Stadt</label>
                      <input
                        type="text"
                        value={formData.locationCity}
                        onChange={(e) => handleFormChange("locationCity", e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--color-arena-border)] rounded text-sm"
                        placeholder="Hamburg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Land</label>
                      <input
                        type="text"
                        value={formData.locationCountry}
                        onChange={(e) => handleFormChange("locationCountry", e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--color-arena-border)] rounded text-sm"
                        placeholder="Deutschland"
                      />
                    </div>
                  </div>
                </div>
              </fieldset>

              {message && <div className="p-3 bg-green-100 text-green-800 rounded">{message}</div>}

              <div className="flex gap-3">
                <button
                  onClick={handleFormSubmit}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-[var(--color-arena-blue)] text-white font-bold rounded hover:bg-[var(--color-arena-blue-mid)] disabled:opacity-50"
                >
                  {isSubmitting ? "Wird erstellt..." : "Erstellen"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-[var(--color-arena-blue)] text-[var(--color-arena-blue)] rounded hover:bg-gray-100"
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
          <section className="card">
            {isLoading ? (
              <p>Lade Termine...</p>
            ) : events.length === 0 ? (
              <p>Keine Termine im {getMonthLabel(year, month)}.</p>
            ) : (
              <div className="space-y-6">
                {sortedDates.map((date) => (
                  <div key={date}>
                    <h3 className="font-bold text-lg mb-3" style={{ color: "var(--color-arena-blue)" }}>
                      {new Date(date + "T00:00:00").toLocaleDateString("de-DE", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </h3>
                    <div className="grid gap-3">
                      {groupedEvents.get(date)!.map((event) => (
                        <div
                          key={event.id}
                          onClick={() => openEventDetail(event)}
                          className="p-4 border-2 border-[var(--color-arena-border)] rounded cursor-pointer hover:shadow-lg transition-shadow"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span
                                  className={`px-3 py-1 text-sm font-bold rounded border ${CATEGORY_COLORS[event.category]}`}
                                >
                                  {event.category}
                                </span>
                                {event.timeFrom && (
                                  <span className="text-sm text-[var(--color-arena-muted)] font-semibold">
                                    {event.timeFrom}
                                    {event.timeTo ? ` - ${event.timeTo}` : ""}
                                  </span>
                                )}
                              </div>
                              <h4 className="font-bold text-lg mb-1">{event.title}</h4>
                              <p className="text-sm text-[var(--color-arena-muted)] line-clamp-2">{event.description}</p>
                              {event.location && (
                                <p className="text-sm mt-2" style={{ color: "var(--color-arena-muted)" }}>
                                  📍{" "}
                                  {[event.location.street, event.location.zipCode, event.location.city, event.location.country]
                                    .filter(Boolean)
                                    .join(", ")}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <div className="text-xs text-[var(--color-arena-muted)]">von {event.createdBy}</div>
                              {event.participants.length > 0 && (
                                <div className="text-right">
                                  <div className="text-xs text-[var(--color-arena-muted)] mb-1">Dabei ({event.participants.length}):</div>
                                  <div className="flex flex-wrap justify-end gap-1">
                                    {event.participants.map((p) => (
                                      <Link
                                        key={p}
                                        href={`/autor/${encodeURIComponent(p)}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-arena-blue)] text-white hover:opacity-80 transition-opacity"
                                      >
                                        {p}
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
          <section className="card">
            <div className="space-y-4">
              <>
                <div
                  ref={mapContainer}
                  style={{
                    width: "100%",
                    height: "600px",
                    borderRadius: "8px",
                    border: "2px solid var(--color-arena-border)",
                    backgroundColor: "#f0f0f0",
                  }}
                />

                {eventsWithLocation.length === 0 && (
                  <p>Keine Termine mit Standortinformationen im {getMonthLabel(year, month)}.</p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(CATEGORY_MAP_COLORS).map(([cat, color]) => (
                    <div key={cat} className="flex items-center gap-2">
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
                      <span className="text-xs">{cat}</span>
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
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4" style={{ zIndex: 10000 }}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-[var(--color-arena-border)] p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold" style={{ color: "var(--color-arena-blue)" }}>
                {selectedEvent.title}
              </h2>
              <button
                onClick={() => closeEventDetail()}
                className="text-2xl leading-none hover:text-[var(--color-arena-muted)]"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              {!isEditMode ? (
                <>
                  <div>
                    <span className={`inline-block px-3 py-1 text-sm font-bold rounded border ${CATEGORY_COLORS[selectedEvent.category]}`}>
                      {selectedEvent.category}
                    </span>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Beschreibung</label>
                    <p className="text-justify">{selectedEvent.description}</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold mb-1">Datum</label>
                      <p>
                        {new Date(selectedEvent.date + "T00:00:00").toLocaleDateString("de-DE", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    {selectedEvent.timeFrom && (
                      <div>
                        <label className="block font-semibold mb-1">Uhrzeit</label>
                        <p>
                          {selectedEvent.timeFrom}
                          {selectedEvent.timeTo && ` - ${selectedEvent.timeTo}`}
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedEvent.location && (
                    <div>
                      <label className="block font-semibold mb-1">Ort</label>
                      <p>
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

                  <div>
                    <label className="block font-semibold mb-1">Erstellt von</label>
                    <p>
                      <Link href={`/autor/${encodeURIComponent(selectedEvent.createdBy)}`} className="text-[var(--color-arena-link)] hover:underline">
                        {selectedEvent.createdBy}
                      </Link>
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold mb-2">Teilnehmer ({selectedEvent.participantCount})</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedEvent.participants.map((p) => (
                        <Link
                          key={p}
                          href={`/autor/${encodeURIComponent(p)}`}
                          className="px-3 py-1 bg-[var(--color-arena-blue)] text-white text-sm rounded hover:bg-[var(--color-arena-blue-mid)] transition-colors"
                        >
                          {p}
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-[var(--color-arena-border)]">
                    {loggedIn && !selectedEvent.participants.includes(username) && (
                      <button
                        onClick={handleJoinEvent}
                        className="flex-1 px-4 py-2 bg-[var(--color-arena-yellow)] text-[var(--color-arena-blue)] font-bold rounded hover:bg-yellow-400"
                      >
                        ✓ Ich bin dabei
                      </button>
                    )}
                    {loggedIn && selectedEvent.participants.includes(username) && (
                      <button
                        onClick={handleJoinEvent}
                        className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 font-bold rounded hover:bg-gray-400"
                      >
                        ✓ Teilnahme absagen
                      </button>
                    )}
                    {(isUserRole === "user" || isUserRole === "admin") && (
                      <button
                        onClick={handleStartEdit}
                        className="px-4 py-2 border border-[var(--color-arena-blue)] text-[var(--color-arena-blue)] font-bold rounded hover:bg-blue-50"
                      >
                        ✎ Bearbeiten
                      </button>
                    )}
                    {isUserRole === "admin" && (
                      <button
                        onClick={handleDeleteEvent}
                        className="px-4 py-2 border border-red-500 text-red-600 font-bold rounded hover:bg-red-50"
                      >
                        🗑 Löschen
                      </button>
                    )}
                    <button
                      onClick={() => closeEventDetail()}
                      className="px-4 py-2 border border-[var(--color-arena-border)] rounded hover:bg-gray-100"
                    >
                      Schließen
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block font-semibold mb-1">Titel *</label>
                    <input
                      type="text"
                      maxLength={200}
                      value={editFormData.title}
                      onChange={(e) => handleEditFormChange("title", e.target.value)}
                      className="w-full px-3 py-2 border border-[var(--color-arena-border)] rounded"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Beschreibung *</label>
                    <textarea
                      maxLength={3000}
                      value={editFormData.description}
                      onChange={(e) => handleEditFormChange("description", e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-[var(--color-arena-border)] rounded"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold mb-1">Kategorie *</label>
                      <select
                        value={editFormData.category}
                        onChange={(e) => handleEditFormChange("category", e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--color-arena-border)] rounded"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Datum *</label>
                      <input
                        type="date"
                        value={editFormData.date}
                        onChange={(e) => handleEditFormChange("date", e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--color-arena-border)] rounded"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold mb-1">Von (optional)</label>
                      <input
                        type="time"
                        value={editFormData.timeFrom}
                        onChange={(e) => handleEditFormChange("timeFrom", e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--color-arena-border)] rounded"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Bis (optional)</label>
                      <input
                        type="time"
                        value={editFormData.timeTo}
                        onChange={(e) => handleEditFormChange("timeTo", e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--color-arena-border)] rounded"
                      />
                    </div>
                  </div>

                  <fieldset className="border border-[var(--color-arena-border)] rounded p-4">
                    <legend className="font-semibold">Ort (optional)</legend>
                    <div className="space-y-3 mt-3">
                      <div>
                        <label className="block text-sm mb-1">Straße</label>
                        <input
                          type="text"
                          value={editFormData.locationStreet}
                          onChange={(e) => handleEditFormChange("locationStreet", e.target.value)}
                          className="w-full px-3 py-2 border border-[var(--color-arena-border)] rounded text-sm"
                        />
                      </div>
                      <div className="grid sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm mb-1">PLZ</label>
                          <input
                            type="text"
                            value={editFormData.locationZipCode}
                            onChange={(e) => handleEditFormChange("locationZipCode", e.target.value)}
                            className="w-full px-3 py-2 border border-[var(--color-arena-border)] rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-1">Stadt</label>
                          <input
                            type="text"
                            value={editFormData.locationCity}
                            onChange={(e) => handleEditFormChange("locationCity", e.target.value)}
                            className="w-full px-3 py-2 border border-[var(--color-arena-border)] rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-1">Land</label>
                          <input
                            type="text"
                            value={editFormData.locationCountry}
                            onChange={(e) => handleEditFormChange("locationCountry", e.target.value)}
                            className="w-full px-3 py-2 border border-[var(--color-arena-border)] rounded text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </fieldset>

                  {message && <div className="p-3 bg-green-100 text-green-800 rounded">{message}</div>}

                  <div className="flex gap-3 pt-4 border-t border-[var(--color-arena-border)]">
                    <button
                      onClick={handleEditSubmit}
                      disabled={isEditSubmitting}
                      className="flex-1 px-4 py-2 bg-[var(--color-arena-blue)] text-white font-bold rounded hover:bg-[var(--color-arena-blue-mid)] disabled:opacity-50"
                    >
                      {isEditSubmitting ? "Wird gespeichert..." : "Speichern"}
                    </button>
                    <button
                      onClick={() => setIsEditMode(false)}
                      className="px-4 py-2 border border-[var(--color-arena-border)] rounded hover:bg-gray-100"
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
