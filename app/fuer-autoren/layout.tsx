import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BuchArena für Autoren – Bücher präsentieren & Leser gewinnen",
  description:
    "Erfahre, wie BuchArena Autoren hilft: Bücher einstellen, Leseproben teilen, mit Sprechern und Bloggern kooperieren und die Reichweite steigern.",
  alternates: {
    canonical: "https://bucharena.org/fuer-autoren",
  },
  openGraph: {
    title: "BuchArena für Autoren",
    description: "Die Plattform für Autoren, Selfpublisher und Verlage.",
    url: "https://bucharena.org/fuer-autoren",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "BuchArena Logo" }],
  },
};

export default function FuerAutorenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
