import { NextResponse } from "next/server";
import { sendBuchzirkelDeadlineReminders } from "@/lib/buchzirkel-reminder";
import { requireSuperAdmin } from "@/lib/server-auth";

/**
 * Cron-Endpunkt: Sendet Deadline-Erinnerungen für Buchzirkel-Leseabschnitte.
 * Aufruf täglich via externem Cron (z. B. cron-job.org) oder intern via Admin.
 * Nur für SUPERADMIN zugänglich.
 */
export async function POST(req: Request) {
  // Cron-Secret-Header-Schutz (optional, über Env-Variable)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      // Fallback: SUPERADMIN-Prüfung
      const admin = await requireSuperAdmin();
      if (!admin) {
        return NextResponse.json({ message: "Nicht autorisiert." }, { status: 401 });
      }
    }
  } else {
    // Kein CRON_SECRET gesetzt: SUPERADMIN-Prüfung
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json({ message: "Nicht autorisiert." }, { status: 401 });
    }
  }

  try {
    const result = await sendBuchzirkelDeadlineReminders();
    return NextResponse.json({
      success: true,
      ...result,
      message: `${result.sent} Erinnerungen gesendet, ${result.errors} Fehler.`,
    });
  } catch (err) {
    console.error("[buchzirkel/deadline-reminder] Fehler:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
