import Link from "next/link";
export default function SocialMediaPromoContentOverviewPage() {
  return (
    <main className="top-centered-main">
      <section className="card grid gap-5">
        <div className="grid gap-2">
          <h1 className="text-xl font-bold mb-0">Fertige Inhalte für Social Media</h1>
          <p className="text-[0.95rem] text-arena-muted leading-relaxed m-0">
            Hier kommst du zuerst auf eine kurze Auswahlseite. Danach gelangst du gezielt zu fertigen Beiträgen oder Reels, ohne dass die eigentlichen Medien in einer langen Mischliste untergehen.
          </p>
        </div>

        <div className="rounded-xl border-2 border-arena-blue/30 bg-arena-blue/5 p-6">
          <h2 className="text-lg font-bold m-0 mb-3">Was möchtest du herunterladen?</h2>
          <p className="m-0 text-[0.95rem] leading-relaxed">
            Wähle zuerst den passenden Bereich. Auf den Unterseiten findest du jeweils den Download und die Caption-Vorschläge direkt unter dem Medium.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/social-media/fertige-inhalte/beitraege"
            className="rounded-xl border border-arena-border-light bg-white p-5 no-underline text-inherit transition-transform hover:-translate-y-0.5"
          >
            <div className="grid gap-2">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-arena-blue m-0">Beiträge</p>
              <h3 className="text-lg font-bold m-0">Fertige Bilder mit Caption-Vorschlägen</h3>
              <p className="text-sm text-arena-muted m-0 leading-relaxed">
                Für klassische Feed-Posts. Die Bilder bekommen auf der Detailseite ihre volle Breite, die Captions stehen darunter.
              </p>
              <span className="text-sm font-medium text-arena-blue">Zu den Beiträgen →</span>
            </div>
          </Link>

          <Link
            href="/social-media/fertige-inhalte/reels"
            className="rounded-xl border border-arena-border-light bg-white p-5 no-underline text-inherit transition-transform hover:-translate-y-0.5"
          >
            <div className="grid gap-2">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-arena-blue m-0">Reels</p>
              <h3 className="text-lg font-bold m-0">Fertige Videos mit Caption-Vorschlägen</h3>
              <p className="text-sm text-arena-muted m-0 leading-relaxed">
                Für vertikale Clips. Die Reels bleiben zentriert und werden nicht mehr durch danebenliegende Texte optisch zusammengedrückt.
              </p>
              <span className="text-sm font-medium text-arena-blue">Zu den Reels →</span>
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