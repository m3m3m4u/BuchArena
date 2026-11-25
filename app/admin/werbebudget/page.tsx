import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/server-auth";
import { AdminSubpageHeader } from "../AdminNav";
import WerbebudgetSection from "@/app/social-media/werbebudget/werbebudget-section";

export default async function AdminWerbebudgetPage() {
  if (!await requireAdmin()) redirect("/auth");
  return <main className="top-centered-main"><section className="card font-sans">
    <AdminSubpageHeader title="100 € Werbebudget – Monatsaktion" subtitle="Monatliche Bewerbungen und Teilnahmevarianten verwalten" />
    <WerbebudgetSection signedIn admin />
  </section></main>;
}
