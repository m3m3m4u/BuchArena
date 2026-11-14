import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hörbuch-Sprecher & Sprecherinnen finden",
  description:
    "Finde professionelle Sprecherinnen und Sprecher für dein Hörbuch oder deine Buchlesung. Höre Sprechproben und nimm direkt Kontakt auf.",
  alternates: {
    canonical: "https://bucharena.org/sprecher",
  },
  openGraph: {
    title: "Hörbuch-Sprecher finden | BuchArena",
    description: "Professionelle Stimmen für dein Hörbuch auf BuchArena finden.",
    url: "https://bucharena.org/sprecher",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "BuchArena Logo" }],
  },
};

export default function SprecherLayout({ children }: { children: React.ReactNode }) {
  return children;
}
