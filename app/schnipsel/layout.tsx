import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Textschnipsel & Buchzitate",
  description:
    "Kurze Leseauszüge, Dialoge und Lieblingszitate aus Büchern unserer Autorinnen und Autoren entdecken.",
  alternates: {
    canonical: "https://bucharena.org/schnipsel",
  },
  openGraph: {
    title: "Textschnipsel | BuchArena",
    description: "Kurze Zitate und Leseproben aus aktuellen Büchern.",
    url: "https://bucharena.org/schnipsel",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "BuchArena Logo" }],
  },
};

export default function SchnipselLayout({ children }: { children: React.ReactNode }) {
  return children;
}
