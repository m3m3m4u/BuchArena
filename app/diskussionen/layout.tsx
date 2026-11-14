import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buch-Diskussionen & Leseforum",
  description:
    "Tausche dich mit anderen Autoren und Lesern über Bücher, Schreibtipps, Verlage und literarische Themen im BuchArena-Forum aus.",
  alternates: {
    canonical: "https://bucharena.org/diskussionen",
  },
  openGraph: {
    title: "Buch-Diskussionen & Forum | BuchArena",
    description: "Diskutiere über Bücher und literarische Themen in unserer Community.",
    url: "https://bucharena.org/diskussionen",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "BuchArena Logo" }],
  },
};

export default function DiskussionenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
