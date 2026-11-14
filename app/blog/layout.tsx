import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BuchArena Blog – Neuigkeiten, Schreibtipps & Autoren-Interviews",
  description:
    "Spannende Blogbeiträge rund um das Schreiben, Buchveröffentlichungen, Buchmarketing und literarisches Schaffen in der BuchArena.",
  alternates: {
    canonical: "https://bucharena.org/blog",
  },
  openGraph: {
    title: "BuchArena Blog",
    description: "Neuigkeiten, Schreibtipps und Einblicke aus der Buch-Community.",
    url: "https://bucharena.org/blog",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "BuchArena Logo" }],
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
