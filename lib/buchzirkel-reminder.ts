/**
 * Buchzirkel Deadline-Reminder
 *
 * Sendet E-Mail-Erinnerungen an Teilnehmer, deren Leseabschnitt-Deadline
 * morgen (innerhalb der nächsten 24 Stunden) fällig ist und noch nicht
 * als abgeschlossen markiert wurde.
 */

import { getBuchzirkelCollection, getBuchzirkelTeilnahmenCollection, getDatabase } from "@/lib/mongodb";
import { sendMail } from "@/lib/mail";

export async function sendBuchzirkelDeadlineReminders(): Promise<{ sent: number; errors: number }> {
  const buchzirkelCol = await getBuchzirkelCollection();
  const teilnahmenCol = await getBuchzirkelTeilnahmenCollection();

  const now = new Date();
  // Deadline-Fenster: morgen (24h–48h ab jetzt)
  const windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  // Aktive Zirkel mit mindestens einem Abschnitt dessen Deadline in window fällt
  const aktiveZirkel = await buchzirkelCol
    .find(
      { status: "aktiv" },
      { projection: { titel: 1, leseabschnitte: 1, veranstalterUsername: 1 } }
    )
    .toArray();

  let sent = 0;
  let errors = 0;

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://bucharena.org").replace(/\/+$/, "");

  for (const zirkel of aktiveZirkel) {
    if (!zirkel.leseabschnitte || zirkel.leseabschnitte.length === 0) continue;

    // Finde Abschnitte mit Deadline morgen
    const abschnitteHeute = zirkel.leseabschnitte.filter((a) => {
      const d = new Date(a.deadline);
      return d >= windowStart && d < windowEnd;
    });

    if (abschnitteHeute.length === 0) continue;

    // Lade alle Teilnahmen für diesen Zirkel
    const teilnahmen = await teilnahmenCol
      .find(
        { buchzirkelId: zirkel._id, abgebrochen: { $ne: true } },
        { projection: { teilnehmerUsername: 1, abgeschlosseneAbschnitte: 1 } }
      )
      .toArray();

    // Lade E-Mail-Adressen der Teilnehmer aus der Users-Collection
    const db = await getDatabase();
    const usersCol = db.collection<{ username: string; email: string }>("users");
    const usernames = teilnahmen.map((t) => t.teilnehmerUsername);
    const usersResult = await usersCol
      .find({ username: { $in: usernames } }, { projection: { username: 1, email: 1 } })
      .toArray();
    const emailMap = new Map(usersResult.map((u) => [u.username, u.email]));

    for (const teilnahme of teilnahmen) {
      const abgeschlossen: string[] = teilnahme.abgeschlosseneAbschnitte ?? [];

      // Filtere nur Abschnitte, die der Teilnehmer noch nicht abgeschlossen hat
      const offeneAbschnitte = abschnitteHeute.filter(
        (a: { id: string }) => !abgeschlossen.includes(a.id)
      );

      if (offeneAbschnitte.length === 0) continue;

      const email = emailMap.get(teilnahme.teilnehmerUsername);
      if (!email) continue;

      const abschnittListe = offeneAbschnitte
        .map((a: { titel: string; deadline: string }) => `<li><strong>${a.titel}</strong> – Deadline: ${new Date(a.deadline).toLocaleDateString("de-AT")}</li>`)
        .join("");

      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
          <h2 style="color: #1d4ed8;">📚 Buchzirkel-Erinnerung: „${zirkel.titel}"</h2>
          <p>Hallo ${teilnahme.teilnehmerUsername},</p>
          <p>morgen läuft die Deadline für folgende Leseabschnitte im Buchzirkel <strong>„${zirkel.titel}"</strong> ab:</p>
          <ul>${abschnittListe}</ul>
          <p>Vergiss nicht, deinen Fortschritt im Teilnehmer-Bereich zu markieren!</p>
          <p style="margin-top: 24px;">
            <a href="${baseUrl}/buchzirkel/${zirkel._id}/teilnehmer"
               style="background: #1d4ed8; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              Zum Buchzirkel
            </a>
          </p>
          <p style="font-size: 12px; color: #666; margin-top: 32px;">
            Diese E-Mail wurde automatisch von BuchArena gesendet.
          </p>
        </div>
      `;

      try {
        await sendMail(
          email,
          `📚 Erinnerung: Deadline morgen im Buchzirkel „${zirkel.titel}"`,
          html
        );
        sent++;
      } catch (err) {
        console.error(`[BuchzirkelReminder] Fehler beim Senden an ${email}:`, err);
        errors++;
      }
    }
  }

  return { sent, errors };
}
