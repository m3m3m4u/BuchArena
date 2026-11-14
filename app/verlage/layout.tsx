import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verlage & Kleinverlage im Überblick",
  description:
    "Entdecke unabhängige Verlage, Kleinverlage und Verlagsprogramme auf BuchArena. Vernetze dich mit Verlagsvertretern.",
  alternates: {
    canonical: "https://bucharena.org/verlage",
  },
  openGraph: {
    title: "Verlage im Überblick | BuchArena",
    description: "Unabhängige Verlage und ihre Programme auf BuchArena kennenlernen.",
    url: "https://bucharena.org/verlage",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "BuchArena Logo" }],
  },
};

export default function VerlageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
