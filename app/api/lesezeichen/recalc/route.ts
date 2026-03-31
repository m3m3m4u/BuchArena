import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { getLesezeichenCollection } from "@/lib/lesezeichen";

/**
 * POST /api/lesezeichen/recalc
 * Admin-only: Korrigiert alle "buecher_hochgeladen"-Einträge von 15 auf 3
 * und berechnet den total-Wert jedes Users neu.
 */
export async function POST() {
  try {
    const account = await requireAdmin();
    if (!account) {
      return NextResponse.json({ message: "Kein Adminzugang." }, { status: 403 });
    }

    const col = await getLesezeichenCollection();
    const allDocs = await col.find({}).limit(10000).toArray();

    let usersFixed = 0;

    for (const doc of allDocs) {
      let changed = false;
      const updatedEntries = doc.entries.map((e) => {
        if (e.reason === "buecher_hochgeladen" && e.amount === 15) {
          changed = true;
          return { ...e, amount: 3 };
        }
        return e;
      });

      if (changed) {
        const newTotal = updatedEntries.reduce((sum, e) => sum + e.amount, 0);
        await col.updateOne(
          { username: doc.username },
          {
            $set: {
              entries: updatedEntries,
              total: newTotal,
              updatedAt: new Date(),
            },
          },
        );
        usersFixed++;
      }
    }

    return NextResponse.json({
      message: `${usersFixed} User korrigiert (buecher_hochgeladen: 15 → 3, total neu berechnet).`,
    });
  } catch (err) {
    console.error("POST /api/lesezeichen/recalc error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
