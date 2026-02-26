"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import SiteHeader from "./site-header";

type LayoutChromeProps = { children: ReactNode };

export default function LayoutChrome({ children }: LayoutChromeProps) {
  const pathname = usePathname();
  const showHeader = pathname !== "/auth";

  return (
    <>
      {showHeader && <SiteHeader />}
      <div className="site-main pb-2 sm:pb-14">{children}</div>
    </>
  );
}
