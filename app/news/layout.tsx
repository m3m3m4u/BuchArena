import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Neuigkeiten & Ankündigungen",
  description:
    "Aktuelle Neuigkeiten, Ankündigungen und Feature-Updates aus der BuchArena-Community.",
  alternates: {
    canonical: "https://bucharena.org/news",
  },
  openGraph: {
    title: "Neuigkeiten | BuchArena",
    description: "Neuigkeiten und Updates rund um BuchArena.",
    url: "https://bucharena.org/news",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "BuchArena Logo" }],
  },
};

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
