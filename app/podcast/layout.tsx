import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BuchArena Podcast – Autoren-Gespräche & Literatur-Insights",
  description:
    "Höre den BuchArena Podcast: Interviews mit Autoren, Sprechern und Literaturexperten sowie spannende Blicke hinter die Kulissen.",
  alternates: {
    canonical: "https://bucharena.org/podcast",
  },
  openGraph: {
    title: "BuchArena Podcast",
    description: "Der Podcast für Autoren, Sprecher und Leser.",
    url: "https://bucharena.org/podcast",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "BuchArena Logo" }],
  },
};

export default function PodcastLayout({ children }: { children: React.ReactNode }) {
  return children;
}
