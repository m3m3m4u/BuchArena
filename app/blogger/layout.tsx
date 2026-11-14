import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buchblogger & Rezensenten finden",
  description:
    "Entdecke engagierte Buchblogger, Bookstagrammer und Rezensenten für Buchrezensionen, Kooperationen und Aktionen.",
  alternates: {
    canonical: "https://bucharena.org/blogger",
  },
  openGraph: {
    title: "Buchblogger finden | BuchArena",
    description: "Vernetze dich mit Buchbloggern für ehrliche Rezensionen und Buchvorstellungen.",
    url: "https://bucharena.org/blogger",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "BuchArena Logo" }],
  },
};

export default function BloggerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
