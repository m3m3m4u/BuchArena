import type { Metadata, Viewport } from "next";
import { Inter, Lora } from "next/font/google";
import CookieBanner from "./components/cookie-banner";
import LayoutChrome from "./components/layout-chrome";
import SiteFooter from "./components/site-footer";
import TwemojiProvider from "./components/twemoji";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const lora = Lora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lora",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "BuchArena – Die Community für Autoren, Sprecher & Leser",
    template: "%s | BuchArena",
  },
  description:
    "BuchArena ist die deutschsprachige Community für Autoren, Sprecher und Leser. Entdecke Bücher, vernetze dich mit Autoren und werde Teil der Arena.",
  metadataBase: new URL("https://bucharena.org"),
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "BuchArena – Die Community für Autoren, Sprecher & Leser",
    description:
      "Entdecke Bücher, vernetze dich mit Autoren und werde Teil der deutschsprachigen Buch-Community.",
    url: "https://bucharena.org",
    siteName: "BuchArena",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "BuchArena Logo" }],
    locale: "de_DE",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "BuchArena",
    description:
      "Die Community für Autoren, Sprecher, Lektoren, Testleser, Verlage und Leser.",
    images: ["/logo.png"],
  },
  alternates: {
    canonical: "/",
    languages: {
      "de-DE": "/",
      "de-AT": "/",
      "de-CH": "/",
      "x-default": "/",
    },
  },
  verification: {
    google: "QLwdhZctTXMDNbCg3ABgu9W2MbU3sex9wc-MAKWP0Fc",
  },
};

const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://bucharena.org/#website",
      "url": "https://bucharena.org",
      "name": "BuchArena",
      "description":
        "Die deutschsprachige Community für Autoren, Sprecher und Leser.",
      "inLanguage": "de-DE",
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://bucharena.org/buecher?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": "https://bucharena.org/#organization",
      "name": "BuchArena",
      "url": "https://bucharena.org",
      "logo": {
        "@type": "ImageObject",
        "url": "https://bucharena.org/logo.png",
        "width": 512,
        "height": 512,
      },
      "description":
        "BuchArena ist die deutschsprachige Plattform zur Vernetzung von Autoren, Sprechern, Lektoren, Testlesern, Bloggern und Lesern.",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${inter.variable} ${lora.variable}`}>
      <head>
        <meta name="trustpilot-one-time-domain-verification-id" content="6a722b3e-d4e1-46c9-9e81-06b04541e2b4" />
        <meta name="geo.region" content="DE" />
        <meta name="geo.placename" content="Deutschland" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(siteJsonLd).replace(/</g, "\\u003c").replace(/>/g, "\\u003e"),
          }}
        />
      </head>
      <body>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:top-2 focus:left-2 focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow-lg focus:text-arena-blue">
          Zum Inhalt springen
        </a>
        <TwemojiProvider />
        <LayoutChrome>{children}</LayoutChrome>
        <SiteFooter />
        <CookieBanner />
        <div id="modal-root" />
      </body>
    </html>
  );
}
