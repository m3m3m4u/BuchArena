import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lektoren & Korrektoren finden",
  description:
    "Finde erfahrene Lektorinnen, Lektoren und Korrektoren für dein Manuskript. Professionelles Feedback und Textoptimierung für dein Buch.",
  alternates: {
    canonical: "https://bucharena.org/lektoren",
  },
  openGraph: {
    title: "Lektoren finden | BuchArena",
    description: "Professionelle Lektoren und Korrektoren für Autoren auf BuchArena.",
    url: "https://bucharena.org/lektoren",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "BuchArena Logo" }],
  },
};

export default function LektorenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
