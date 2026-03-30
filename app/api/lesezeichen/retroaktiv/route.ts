import { NextResponse } from "next/server";
import { getDatabase, getUsersCollection, getBooksCollection, getDiscussionsCollection } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/server-auth";
import { getLesezeichenCollection, getOrCreateDoc } from "@/lib/lesezeichen";

/**
 * POST /api/lesezeichen/retroaktiv
 * Admin-only: Vergibt rückwirkend Lesezeichen basierend auf existierenden Daten.
 */
export async function POST() {
  try {
    const account = await requireAdmin();
    if (!account) {
      return NextResponse.json({ message: "Kein Adminzugang." }, { status: 403 });
    }

    const db = await getDatabase();
    const users = await getUsersCollection();
    const books = await getBooksCollection();
    const discussions = await getDiscussionsCollection();
    const col = await getLesezeichenCollection();
    const quizCol = db.collection("quiz_highscores");

    const allUsers = await users.find({}, { projection: { username: 1, profile: 1 } }).toArray();

    let totalAwarded = 0;
    const log: string[] = [];

    for (const user of allUsers) {
      const username = user.username;
      const doc = await getOrCreateDoc(username);
      const existingReasons = new Set(doc.entries.map((e) => e.reason));

      let added = 0;

      // 1) Profil ausgefüllt (einmalig)
      if (!existingReasons.has("profil_ausgefuellt")) {
        const p = user.profile;
        if (p && p.name?.value && p.motto?.value && p.profileImage?.value) {
          await col.updateOne(
            { username },
            {
              $inc: { total: 10 },
              $push: { entries: { reason: "profil_ausgefuellt", amount: 10, date: new Date() } },
              $set: { updatedAt: new Date() },
            },
          );
          added += 10;
        }
      }

      // 2) Bücher hochgeladen (3 pro Buch)
      const bookCount = await books.countDocuments({ ownerUsername: username });
      const alreadyBookEntries = doc.entries.filter((e) => e.reason === "buecher_hochgeladen").length;
      const missingBooks = bookCount - alreadyBookEntries;
      if (missingBooks > 0) {
        const amount = missingBooks * 3;
        const newEntries = Array.from({ length: missingBooks }, () => ({
          reason: "buecher_hochgeladen" as const,
          amount: 3,
          date: new Date(),
        }));
        await col.updateOne(
          { username },
          {
            $inc: { total: amount },
            $push: { entries: { $each: newEntries } },
            $set: { updatedAt: new Date() },
          },
        );
        added += amount;
      }

      // 3) Treffpunkt-Beiträge (1 pro Tag)
      // Diskussionen erstellt
      const userDiscussions = await discussions
        .find({ authorUsername: username }, { projection: { createdAt: 1 } })
        .toArray();

      // Antworten in allen Diskussionen
      const allDiscussions = await discussions
        .find(
          { "replies.authorUsername": username },
          { projection: { replies: 1 } },
        )
        .toArray();

      const treffpunktDaysSet = new Set<string>(doc.treffpunktDays);
      for (const d of userDiscussions) {
        if (d.createdAt) treffpunktDaysSet.add(new Date(d.createdAt).toISOString().slice(0, 10));
      }
      for (const d of allDiscussions) {
        for (const r of d.replies ?? []) {
          if (r.authorUsername === username && r.createdAt) {
            treffpunktDaysSet.add(new Date(r.createdAt).toISOString().slice(0, 10));
          }
        }
      }

      const existingTreffpunktDays = new Set(doc.treffpunktDays);
      const newTreffpunktDays = [...treffpunktDaysSet].filter((d) => !existingTreffpunktDays.has(d));
      if (newTreffpunktDays.length > 0) {
        const amount = newTreffpunktDays.length;
        const newEntries = newTreffpunktDays.map((day) => ({
          reason: "treffpunkt_beitrag" as const,
          amount: 1,
          date: new Date(day),
        }));
        await col.updateOne(
          { username },
          {
            $inc: { total: amount },
            $push: { entries: { $each: newEntries } },
            $addToSet: { treffpunktDays: { $each: newTreffpunktDays } },
            $set: { updatedAt: new Date() },
          },
        );
        added += amount;
      }

      // 4) Quiz-Tage & MC 10+ Punkte
      const userQuizScores = await quizCol
        .find({ username })
        .sort({ createdAt: 1 })
        .toArray();

      const existingQuizDays = new Set(doc.quizDays);
      const newQuizDays: string[] = [];
      let mc10Count = 0;

      for (const qs of userQuizScores) {
        if (qs.createdAt) {
          const day = new Date(qs.createdAt).toISOString().slice(0, 10);
          if (!existingQuizDays.has(day) && !newQuizDays.includes(day)) {
            newQuizDays.push(day);
          }
        }
        if (typeof qs.score === "number" && qs.score >= 10) {
          mc10Count++;
        }
      }

      if (newQuizDays.length > 0) {
        const amount = newQuizDays.length;
        const newEntries = newQuizDays.map((day) => ({
          reason: "quiz_tag" as const,
          amount: 1,
          date: new Date(day),
        }));
        await col.updateOne(
          { username },
          {
            $inc: { total: amount },
            $push: { entries: { $each: newEntries } },
            $addToSet: { quizDays: { $each: newQuizDays } },
            $set: { updatedAt: new Date() },
          },
        );
        added += amount;
      }

      // MC 10+ Punkte: Differenz zu bereits vergebenen
      const alreadyMc10 = doc.entries.filter((e) => e.reason === "mc_quiz_10_punkte").length;
      const missingMc10 = mc10Count - alreadyMc10;
      if (missingMc10 > 0) {
        const newEntries = Array.from({ length: missingMc10 }, () => ({
          reason: "mc_quiz_10_punkte" as const,
          amount: 1,
          date: new Date(),
        }));
        await col.updateOne(
          { username },
          {
            $inc: { total: missingMc10 },
            $push: { entries: { $each: newEntries } },
            $set: { updatedAt: new Date() },
          },
        );
        added += missingMc10;
      }

      if (added > 0) {
        log.push(`${username}: +${added} Lesezeichen`);
        totalAwarded += added;
      }
    }

    return NextResponse.json({
      message: `Retroaktiv ${totalAwarded} Lesezeichen an ${log.length} User vergeben.`,
      details: log,
    });
  } catch (err) {
    console.error("POST /api/lesezeichen/retroaktiv error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
