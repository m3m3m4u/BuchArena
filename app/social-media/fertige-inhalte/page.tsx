import Link from "next/link";
export default function SocialMediaPromoContentOverviewPage() {
  return (
    <main className="top-centered-main">
      <section className="card grid gap-5">
        <div className="rounded-2xl bg-arena-blue px-6 py-7 text-white shadow-sm">
          <div className="grid gap-3">
            <span className="inline-flex w-fit items-center rounded-full bg-arena-yellow px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-arena-blue">
              BuchArena Social Media
            </span>
            <h1 className="text-xl font-bold mb-0 text-white">Fertige Inhalte für Social Media</h1>
          </div>
        </div>

        <div className="rounded-xl bg-arena-blue p-6">
          <h2 className="text-lg font-bold m-0 mb-3 text-white">Was möchtest du herunterladen?</h2>
          <p className="m-0 text-[0.95rem] leading-relaxed text-white/90">
            Wähle zuerst den passenden Bereich. Auf den Unterseiten findest du jeweils den Download und die Caption-Vorschläge direkt unter dem Medium.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/social-media/fertige-inhalte/beitraege"
            className="rounded-xl border border-arena-blue bg-white p-5 no-underline text-inherit shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-arena-blue/5"
          >
            <div className="grid gap-2">
              <span className="inline-flex w-fit items-center rounded-full bg-arena-yellow px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-arena-blue">Beiträge</span>
              <h3 className="text-lg font-bold m-0 text-arena-blue">Fertige Bilder mit Caption-Vorschlägen</h3>
              <p className="text-sm text-arena-muted m-0 leading-relaxed">
                Für klassische Feed-Posts. Die Bilder bekommen auf der Detailseite ihre volle Breite, die Captions stehen darunter.
              </p>
              <span className="inline-flex items-center text-sm font-medium text-arena-blue">Zu den Beiträgen →</span>
            </div>
          </Link>

          <Link
            href="/social-media/fertige-inhalte/reels"
            className="rounded-xl border border-arena-yellow bg-arena-yellow p-5 no-underline text-inherit shadow-sm transition-transform hover:-translate-y-0.5 hover:brightness-95"
          >
            <div className="grid gap-2">
              <span className="inline-flex w-fit items-center rounded-full bg-arena-blue px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-arena-yellow">Reels</span>
              <h3 className="text-lg font-bold m-0 text-arena-blue">Fertige Videos mit Caption-Vorschlägen</h3>
              <p className="text-sm text-arena-blue/80 m-0 leading-relaxed">
                Für vertikale Clips. Die Reels bleiben zentriert und werden nicht mehr durch danebenliegende Texte optisch zusammengedrückt.
              </p>
              <span className="inline-flex items-center text-sm font-medium text-arena-blue">Zu den Reels →</span>
            </div>
          </Link>
        </div>

        <div>
          <Link href="/social-media" className="text-arena-link text-sm no-underline hover:underline">
            ← Zurück zu Reels und Beiträge für Social Media
          </Link>
        </div>
      </section>
    </main>
  );
}