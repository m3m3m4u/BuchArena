import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Autoren & Schriftstellerinnen entdecken",
  description:
    "Finde unabhängige Autorinnen und Autoren, entdecke ihre Bücher, Biografien und vernetze dich direkt in der BuchArena.",
  alternates: {
    canonical: "https://bucharena.org/autoren",
  },
  openGraph: {
    title: "Autoren entdecken | BuchArena",
    description: "Vernetze dich mit Autoren und entdecke neue literarische Stimmen.",
    url: "https://bucharena.org/autoren",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "BuchArena Logo" }],
  },
};

export default function AutorenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
