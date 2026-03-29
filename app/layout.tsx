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
  title: "BuchArena",
  description: "Die Community für Autoren, Sprecher und Leser",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>
        <TwemojiProvider />
        <LayoutChrome>{children}</LayoutChrome>
        <SiteFooter />
        <CookieBanner />
      </body>
    </html>
  );
}
