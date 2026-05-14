import type { Metadata, Viewport } from "next";
import CookieBanner from "./components/cookie-banner";
import LayoutChrome from "./components/layout-chrome";
import SiteFooter from "./components/site-footer";
import TwemojiProvider from "./components/twemoji";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
    canonical: "https://bucharena.org",
  },
  verification: {
    google: "QLwdhZctTXMDNbCg3ABgu9W2MbU3sex9wc-MAKWP0Fc",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <head>
        <meta name="trustpilot-one-time-domain-verification-id" content="6a722b3e-d4e1-46c9-9e81-06b04541e2b4" />
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
