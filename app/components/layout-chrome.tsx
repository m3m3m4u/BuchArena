"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import SiteHeader from "./site-header";
import AnalyticsTracker from "./analytics-tracker";
import LesezeichenToast from "./lesezeichen-toast";
import SessionGuard from "./session-guard";

type LayoutChromeProps = { children: ReactNode };

export default function LayoutChrome({ children }: LayoutChromeProps) {
  const pathname = usePathname();
  const showHeader = pathname !== "/auth";

  return (
    <>
      <SessionGuard />
      {showHeader && <SiteHeader />}
      <AnalyticsTracker />
      <LesezeichenToast />
      <div id="main-content" className="site-main">{children}</div>
    </>
  );
}
