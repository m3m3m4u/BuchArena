import Link from "next/link";
import { getServerAccount } from "@/lib/server-auth";
import WerbebudgetSection from "./werbebudget-section";

export default async function WerbebudgetPage() {
  const account = await getServerAccount();
  return (
    <main className="top-centered-main">
      <section className="card font-sans">
        <Link href="/social-media" className="text-sm text-arena-link hover:underline">← Social Media</Link>
        <h1 className="text-3xl font-extrabold text-arena-blue max-sm:text-2xl">100 € Werbebudget für dein Buch</h1>
        <WerbebudgetSection signedIn={!!account} />
      </section>
    </main>
  );
}
