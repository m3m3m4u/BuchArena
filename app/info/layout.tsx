import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Über BuchArena – Die Community-Plattform",
  description:
    "Erfahre mehr über BuchArena: Unsere Mission, Funktionen für Autoren, Sprecher, Blogger, Lektoren und Leser im deutschsprachigen Raum.",
  alternates: {
    canonical: "https://bucharena.org/info",
  },
  openGraph: {
    title: "Über BuchArena",
    description: "Die Community für Autoren, Sprecher, Lektoren und Leser.",
    url: "https://bucharena.org/info",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "BuchArena Logo" }],
  },
};

export default function InfoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
