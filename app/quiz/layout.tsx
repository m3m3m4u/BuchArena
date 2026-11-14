import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buch-Quiz – Teste dein Literaturwissen",
  description:
    "Mache spannende Buch-Quizze, teste dein Wissen über Romane, Autoren und literarische Figuren auf BuchArena.",
  alternates: {
    canonical: "https://bucharena.org/quiz",
  },
  openGraph: {
    title: "Buch-Quiz | BuchArena",
    description: "Teste dein Literaturwissen in unseren Community-Quizzen.",
    url: "https://bucharena.org/quiz",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "BuchArena Logo" }],
  },
};

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return children;
}
