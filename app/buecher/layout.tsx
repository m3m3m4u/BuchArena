import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bücher entdecken – Romane, Krimis, Fantasy & Sachbücher",
  description:
    "Entdecke Bücher unabhängiger Autoren auf BuchArena. Stöbere in verschiedenen Genres, lies Leseproben, höre Hörproben und vernetze dich mit Autoren.",
  alternates: {
    canonical: "https://bucharena.org/buecher",
  },
  openGraph: {
    title: "Bücher entdecken | BuchArena",
    description:
      "Stöbere in Neuerscheinungen und Buchempfehlungen unabhängiger Autoren in der deutschsprachigen Buch-Community.",
    url: "https://bucharena.org/buecher",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "BuchArena Logo" }],
  },
};

export default function BuecherLayout({ children }: { children: React.ReactNode }) {
  return children;
}
