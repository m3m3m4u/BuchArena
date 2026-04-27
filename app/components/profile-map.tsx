"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type LeafletModule = typeof import("leaflet");

type MapUser = {
  username: string;
  displayName: string;
  profileSlug: string;
  postalCode: string;
  city: string;
  country: string;
  profilePath: string;
};

type Category = "autoren" | "blogger" | "testleser" | "sprecher" | "lektoren" | "verlage";

const geocodeCache = new Map<string, [number, number] | null>();

async function geocodeUser(user: MapUser): Promise<[number, number] | null> {
  const parts = [user.postalCode, user.city, user.country].filter(Boolean);
  if (parts.length === 0) return null;
  const query = parts.join(", ");
  const key = query.toLowerCase();
  if (geocodeCache.has(key)) return geocodeCache.get(key)!;

  try {
    const res = await fetch(`/api/kalender/geocode?q=${encodeURIComponent(query)}`);
    if (!res.ok) { geocodeCache.set(key, null); return null; }
    const data = (await res.json()) as { coords: { lat: number; lon: number } | null };
    if (!data.coords) { geocodeCache.set(key, null); return null; }
    const coords: [number, number] = [data.coords.lat, data.coords.lon];
    geocodeCache.set(key, coords);
    return coords;
  } catch {
    geocodeCache.set(key, null);
    return null;
  }
}

// Slightly jitter coords if multiple users share the same spot
function jitter(coords: [number, number]): [number, number] {
  return [
    coords[0] + (Math.random() - 0.5) * 0.003,
    coords[1] + (Math.random() - 0.5) * 0.003,
  ];
}

const CATEGORY_COLOR: Record<Category, string> = {
  autoren: "#7c3aed",
  blogger: "#0891b2",
  testleser: "#16a34a",
  sprecher: "#ea580c",
  lektoren: "#db2777",
  verlage: "#b45309",
};

type Props = {
  category: Category;
  categoryLabel: string;
};

export default function ProfileMapView({ category, categoryLabel }: Props) {
  const [users, setUsers] = useState<MapUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [geocodeProgress, setGeocodeProgress] = useState<{ done: number; total: number } | null>(null);
  const [userCoords, setUserCoords] = useState<Record<string, [number, number]>>({});

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const leafletRef = useRef<LeafletModule | null>(null);

  // Load users from API
  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/profile-map?category=${category}`)
      .then((r) => r.json())
      .then((data: { users?: MapUser[] }) => {
        setUsers(data.users ?? []);
      })
      .catch(() => setUsers([]))
      .finally(() => setIsLoading(false));
  }, [category]);

  // Geocode all users once loaded
  useEffect(() => {
    if (users.length === 0) return;
    let cancelled = false;

    (async () => {
      setGeocodeProgress({ done: 0, total: users.length });
      const results: Record<string, [number, number]> = {};
      let done = 0;
      for (const user of users) {
        if (cancelled) return;
        const coords = await geocodeUser(user);
        if (coords) {
          results[user.username] = jitter(coords);
        }
        done++;
        if (!cancelled) setGeocodeProgress({ done, total: users.length });
      }
      if (!cancelled) setUserCoords(results);
    })();

    return () => { cancelled = true; };
  }, [users]);

  // Initialize / update Leaflet map
  useEffect(() => {
    if (isLoading || !mapContainer.current) return;

    let disposed = false;
    let ro: ResizeObserver | null = null;

    const run = async () => {
      try {
        if (!mapInstance.current) {
          const container = mapContainer.current;
          if (!container) return;

          if (container.clientWidth === 0 || container.clientHeight === 0) {
            await new Promise<void>((resolve) => {
              ro = new ResizeObserver((entries) => {
                for (const e of entries) {
                  if (e.contentRect.width > 0 && e.contentRect.height > 0) {
                    ro?.disconnect();
                    resolve();
                    return;
                  }
                }
              });
              ro.observe(container);
            });
          }

          if (disposed || !mapContainer.current) return;

          const L = (await import("leaflet")) as LeafletModule;
          leafletRef.current = L;
          if (disposed || !mapContainer.current) return;

          const map = L.map(mapContainer.current, {
            center: [51.0, 10.0],
            zoom: 6,
            zoomControl: true,
          });

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "© OpenStreetMap",
          }).addTo(map);

          mapInstance.current = map;
          setTimeout(() => mapInstance.current?.invalidateSize(), 300);
        }

        const map = mapInstance.current;
        const L = leafletRef.current;
        if (!map || !L || disposed) return;

        // Clear old markers
        markersRef.current.forEach((m) => m.remove?.());
        markersRef.current = [];

        const color = CATEGORY_COLOR[category];

        for (const user of users) {
          const coords = userCoords[user.username];
          if (!coords) continue;

          const marker = L.circleMarker(coords, {
            radius: 11,
            fillColor: color,
            color: "#fff",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9,
          }).addTo(map);

          const location = [user.postalCode, user.city, user.country].filter(Boolean).join(", ");

          marker.bindPopup(
            `<div style="max-width:200px; font-family: sans-serif">
              <strong style="font-size:0.95rem">${user.displayName}</strong><br>
              <span style="font-size:0.8rem; color:#666">${location}</span><br>
              <a href="${user.profilePath}" style="font-size:0.85rem; color:#7c3aed">Profil ansehen →</a>
            </div>`
          );

          markersRef.current.push(marker);
        }
      } catch (err) {
        console.error("Karte konnte nicht geladen werden:", err);
      }
    };

    void run();

    return () => {
      disposed = true;
      ro?.disconnect();
    };
  }, [isLoading, users, userCoords, category]);

  // Destroy map on unmount
  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  const usersWithCoords = Object.keys(userCoords).length;
  const locatedPercent =
    geocodeProgress && geocodeProgress.done === geocodeProgress.total
      ? usersWithCoords
      : null;

  return (
    <div>
      {/* Header */}
      <div className="mb-3">
        <h2 className="m-0 text-lg">Suche nach Wohnort – {categoryLabel}</h2>
        {geocodeProgress && geocodeProgress.done < geocodeProgress.total && (
          <p className="text-xs text-arena-muted m-0">
            Orte werden ermittelt … {geocodeProgress.done}/{geocodeProgress.total}
          </p>
        )}
        {locatedPercent !== null && (
          <p className="text-xs text-arena-muted m-0">
            {locatedPercent} von {users.length} Einträgen auf der Karte
          </p>
        )}
      </div>

      {/* Map body */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px] text-arena-muted">
          Lade Daten …
        </div>
      ) : users.length === 0 ? (
        <div className="flex items-center justify-center min-h-[400px] text-arena-muted">
          Noch keine Einträge mit Ortsinformationen vorhanden.
        </div>
      ) : (
        <div
          ref={mapContainer}
          style={{ width: "100%", height: "calc(100vh - 220px)", minHeight: 420 }}
        />
      )}
    </div>
  );
}
