import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Testleser & Beta-Leser finden",
  description:
    "Finde engagierte Testleserinnen und Testleser für dein Manuskript. Erhalte wertvolles Leser-Feedback vor der Veröffentlichung.",
  alternates: {
    canonical: "https://bucharena.org/testleser",
  },
  openGraph: {
    title: "Testleser finden | BuchArena",
    description: "Finde qualifizierte Beta- und Testleser für dein Buch.",
    url: "https://bucharena.org/testleser",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "BuchArena Logo" }],
  },
};

export default function TestleserLayout({ children }: { children: React.ReactNode }) {
  return children;
}
