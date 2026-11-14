import type { Metadata } from "next";
import { getKalenderCollection } from "@/lib/mongodb";

export const metadata: Metadata = {
  title: "Literarischer Kalender – Lesungen, Buchmessen & Termine",
  description:
    "Finde anstehende Buchmessen, Autorenlesungen, Buch-Releases und literarische Events in Deutschland, Österreich und der Schweiz im BuchArena Kalender.",
  alternates: {
    canonical: "https://bucharena.org/kalender",
  },
  openGraph: {
    title: "Literarischer Kalender | BuchArena",
    description:
      "Aktuelle Buchmessen, Lesungen und Termine im deutschsprachigen Raum auf einen Blick.",
    url: "https://bucharena.org/kalender",
    type: "website",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "BuchArena Logo" }],
  },
  twitter: {
    card: "summary",
    title: "Literarischer Kalender – BuchArena",
    description: "Buchmessen, Lesungen und Veröffentlichungstermine im Überblick.",
    images: ["/logo.png"],
  },
};

export default async function KalenderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let jsonLd: Record<string, any> | null = null;

  try {
    const col = await getKalenderCollection();
    const today = new Date().toISOString().slice(0, 10);
    const events = await col
      .find({
        $or: [
          { date: { $gte: today } },
          { dateTo: { $gte: today } },
        ],
      })
      .sort({ date: 1 })
      .limit(25)
      .toArray();

    if (events.length > 0) {
      jsonLd = {
        "@context": "https://schema.org",
        "@graph": events.map((ev) => {
          const startDate = ev.timeFrom ? `${ev.date}T${ev.timeFrom}:00` : ev.date;
          const endDate = ev.dateTo
            ? ev.timeTo
              ? `${ev.dateTo}T${ev.timeTo}:00`
              : ev.dateTo
            : ev.timeTo
              ? `${ev.date}T${ev.timeTo}:00`
              : undefined;

          const hasPhysicalLocation = Boolean(ev.location?.city);
          const locationObj = hasPhysicalLocation
            ? {
                "@type": "Place",
                name: ev.location?.city,
                address: {
                  "@type": "PostalAddress",
                  ...(ev.location?.street ? { streetAddress: ev.location.street } : {}),
                  ...(ev.location?.zipCode ? { postalCode: ev.location.zipCode } : {}),
                  addressLocality: ev.location?.city,
                  addressCountry: ev.location?.country || "DE",
                },
              }
            : {
                "@type": "VirtualLocation",
                url: ev.link || "https://bucharena.org/kalender",
              };

          return {
            "@type": "Event",
            name: ev.title,
            description: ev.description || undefined,
            startDate,
            ...(endDate ? { endDate } : {}),
            eventStatus: "https://schema.org/EventScheduled",
            eventAttendanceMode: hasPhysicalLocation
              ? "https://schema.org/OfflineEventAttendanceMode"
              : "https://schema.org/OnlineEventAttendanceMode",
            location: locationObj,
            ...(ev.link ? { url: ev.link } : { url: "https://bucharena.org/kalender" }),
            organizer: {
              "@type": "Person",
              name: ev.createdBy,
            },
          };
        }),
      };
    }
  } catch {
    // fallback
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c").replace(/>/g, "\\u003e"),
          }}
        />
      )}
      {children}
    </>
  );
}
