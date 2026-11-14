import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Büchertauschbörse – Bücher tauschen & neue Geschichten finden",
  description:
    "Tausche gelesene Bücher sicher mit anderen Community-Mitgliedern auf BuchArena. Gib Büchern ein zweites Leben.",
  alternates: {
    canonical: "https://bucharena.org/tauschboerse",
  },
  openGraph: {
    title: "Büchertauschbörse | BuchArena",
    description: "Bücher tauschen und neuen Lesestoff entdecken.",
    url: "https://bucharena.org/tauschboerse",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "BuchArena Logo" }],
  },
};

export default function TauschboerseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
