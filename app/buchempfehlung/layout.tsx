import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buchempfehlungen & Buch der Woche",
  description:
    "Entdecke persönliche Buchempfehlungen und das aktuelle Buch der Woche in der BuchArena. Lass dich von neuen Geschichten begeistern.",
  alternates: {
    canonical: "https://bucharena.org/buchempfehlung",
  },
  openGraph: {
    title: "Buchempfehlungen | BuchArena",
    description: "Handverlesene Buchempfehlungen und das Buch der Woche entdecken.",
    url: "https://bucharena.org/buchempfehlung",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "BuchArena Logo" }],
  },
};

export default function BuchempfehlungLayout({ children }: { children: React.ReactNode }) {
  return children;
}
