import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/server-auth";
import {
  ensureBuchDerWocheSelection,
  runBuchDerWocheSelection,
  getBdwCycleInfo,
  getBdwSubmissionsCollection,
  calculateBdwWeight,
} from "@/lib/buch-der-woche";
import { getLesezeichenCollection } from "@/lib/lesezeichen";

export type BuchDerWoche = {
  title: string;
  author: string;
  speaker: string;
  youtubeUrl: string;
  buyUrl: string;
  active: boolean;
  updatedAt: string;
  bookId?: string;
  authorUsername?: string;
  speakerUsername?: string;
  cycleKey?: string;
  submissionId?: string;
  isAutomatic?: boolean;
  selectedAt?: string;
  selectionInfo?: {
    totalCandidates: number;
    authorBookmarks: number;
    totalWeight: number;
    candidateWeight: number;
  };
};

/** GET – Buch der Woche laden (öffentlich & automatisch rotiert) */
export async function GET(request: NextRequest) {
  try {
    // Stellt sicher, dass die wöchentliche Sonntags-Auslosung ab 18:00 Uhr erfolgt ist
    await ensureBuchDerWocheSelection();

    const db = await getDatabase();
    const doc = await db.collection("settings").findOne({ key: "buchDerWoche" });
    const bdw = (doc?.value as BuchDerWoche) || null;

    const isAdmin = request.nextUrl.searchParams.get("admin") === "1";
    if (!isAdmin && bdw && bdw.active === false) {
      return NextResponse.json({ buchDerWoche: null });
    }

    const cycleInfo = getBdwCycleInfo();

    // Wenn Admin die Seite aufruft, auch alle Bewerbungen mitliefern
    let submissions: any[] = [];
    if (isAdmin) {
      const admin = await requireAdmin();
      if (admin) {
        const subsCol = await getBdwSubmissionsCollection();
        const rawSubs = await subsCol
          .find({ status: { $ne: "withdrawn" } })
          .sort({ createdAt: -1 })
          .toArray();

        const lzCol = await getLesezeichenCollection();
        const usernames = [...new Set(rawSubs.map((s) => s.username))];
        const lzDocs = await lzCol.find({ username: { $in: usernames } }).toArray();
        const lzMap = new Map<string, number>();
        for (const d of lzDocs) lzMap.set(d.username, d.total ?? 0);

        submissions = rawSubs.map((s) => {
          const bkm = lzMap.get(s.username) ?? 0;
          const { weight } = calculateBdwWeight(bkm, s.timesSelected, s.lastSelectedAt);
          return {
            id: String(s._id),
            username: s.username,
            authorDisplayName: s.authorDisplayName,
            title: s.title,
            author: s.author,
            speaker: s.speaker,
            youtubeUrl: s.youtubeUrl,
            buyUrl: s.buyUrl,
            status: s.status,
            timesSelected: s.timesSelected ?? 0,
            lastSelectedAt: s.lastSelectedAt,
            createdAt: s.createdAt,
            bookmarks: bkm,
            weight,
          };
        });
      }
    }

    const res = NextResponse.json({
      buchDerWoche: bdw,
      cycleInfo,
      ...(isAdmin ? { submissions } : {}),
    });

    res.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
    return res;
  } catch (err) {
    console.error("GET /api/buch-der-woche error:", err);
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}

/** POST – Buch der Woche speichern oder Auslosung anstoßen (nur Admin) */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
  }

  try {
    const body = await request.json();

    // Aktion: Lotterie manuell anstoßen
    if (body.action === "trigger-draw") {
      const result = await runBuchDerWocheSelection({
        force: true,
        manualWinnerId: body.submissionId,
        adminUsername: admin.username,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 400 });
      }

      return NextResponse.json({ ok: true, message: result.message, buchDerWoche: result.selected });
    }

    const { title, author, speaker, youtubeUrl, buyUrl, active, bookId, authorUsername, speakerUsername } =
      body as Partial<BuchDerWoche>;

    if (!title || !author) {
      return NextResponse.json({ error: "Titel und Autor sind Pflichtfelder" }, { status: 400 });
    }

    const value: BuchDerWoche = {
      title: title.trim().slice(0, 200),
      author: author.trim().slice(0, 200),
      speaker: (speaker ?? "").trim().slice(0, 200),
      youtubeUrl: (youtubeUrl ?? "").trim().slice(0, 500),
      buyUrl: (buyUrl ?? "").trim().slice(0, 500),
      active: active ?? true,
      updatedAt: new Date().toISOString(),
      bookId: (bookId ?? "").trim().slice(0, 100) || undefined,
      authorUsername: (authorUsername ?? "").trim().slice(0, 100) || undefined,
      speakerUsername: (speakerUsername ?? "").trim().slice(0, 100) || undefined,
      cycleKey: getBdwCycleInfo().currentCycleKey,
      isAutomatic: false,
    };

    const db = await getDatabase();
    await db.collection("settings").updateOne(
      { key: "buchDerWoche" },
      { $set: { key: "buchDerWoche", value } },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, buchDerWoche: value });
  } catch {
    return NextResponse.json({ error: "Fehler beim Speichern" }, { status: 500 });
  }
}
