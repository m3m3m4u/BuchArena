"use client";

import dynamic from "next/dynamic";

type Category = "autoren" | "blogger" | "testleser" | "sprecher" | "lektoren" | "verlage";

const ProfileMapView = dynamic(() => import("@/app/components/profile-map"), { ssr: false });

export default function MapClient({ category, categoryLabel }: { category: Category; categoryLabel: string }) {
  return <ProfileMapView category={category} categoryLabel={categoryLabel} />;
}
