import type { Metadata } from "next";

type Category = "autoren" | "blogger" | "testleser" | "sprecher" | "lektoren" | "verlage";

const LABELS: Record<Category, string> = {
  autoren: "Autoren",
  blogger: "Buchblogger",
  testleser: "Testleser",
  sprecher: "Hörbuch-Sprecher",
  lektoren: "Lektoren",
  verlage: "Verlage",
};

type Props = {
  params: Promise<{ category: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const label = LABELS[category as Category] || "Community";
  const title = `${label} auf der Landkarte finden`;
  const description = `Finde ${label} in deiner Region auf der interaktiven Deutschland-, Österreich- und Schweiz-Karte der BuchArena.`;
  const canonicalUrl = `https://bucharena.org/wohnort-karte/${category}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${label} auf der Karte | BuchArena`,
      description,
      url: canonicalUrl,
      images: [{ url: "/logo.png", width: 512, height: 512, alt: "BuchArena Logo" }],
    },
  };
}

export default function WohnortKarteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
