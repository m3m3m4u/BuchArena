import type { Metadata } from "next";
import CookieBanner from "./components/cookie-banner";
import LayoutChrome from "./components/layout-chrome";
import SiteFooter from "./components/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "BuchArena",
  description: "Next.js App für BuchArena",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>
        <LayoutChrome>{children}</LayoutChrome>
        <SiteFooter />
        <CookieBanner />
      </body>
    </html>
  );
}
