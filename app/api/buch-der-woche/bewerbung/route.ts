import { NextRequest, NextResponse } from "next/server";
import { getServerAccount } from "@/lib/server-auth";
import { getBooksCollection, getDatabase } from "@/lib/mongodb";
import { extractYouTubeId } from "@/lib/bucharena-types";
import {
  getBdwSubmissionsCollection,
  getBdwCycleInfo,
  calculateBdwWeight,
  ensureBuchDerWocheSelection,
  type BdwSubmissionDocument,
} from "@/lib/buch-der-woche";
import { getOrCreateDoc } from "@/lib/lesezeichen";
import { ObjectId } from "mongodb";

/**
 * GET /api/buch-der-woche/bewerbung
 * Liefert Zyklus-Infos, eigene Bewerbungen und eigene Bücher des angemeldeten Users.
 */
export async function GET() {
  try {
    const cycleInfo = getBdwCycleInfo();
    const subsCol = await getBdwSubmissionsCollection();

    const totalSubmissionsCount = await subsCol.countDocuments({
      status: { $ne: "withdrawn" },
    });

    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({
        cycleInfo,
        totalSubmissionsCount,
        mySubmissions: [],
        myBooks: [],
        myBookmarks: 0,
      });
    }

    // Eigene Bewerbungen laden
    const rawSubmissions = await subsCol
      .find({
        username: account.username,
        status: { $ne: "withdrawn" },
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Eigene Lesezeichen
    const lzDoc = await getOrCreateDoc(account.username);
    const myBookmarks = lzDoc.total ?? 0;

    // Autorenweite Statistik (Option B)
    let authorTimesWon = 0;
    let authorLastSelectedAt: Date | undefined = undefined;
    for (const s of rawSubmissions) {
      authorTimesWon += (s.timesSelected || 0);
      if (s.lastSelectedAt) {
        const sDate = new Date(s.lastSelectedAt);
        if (!authorLastSelectedAt || sDate > authorLastSelectedAt) {
          authorLastSelectedAt = sDate;
        }
      }
    }

    const mySubmissions = rawSubmissions.map((s) => {
      const { weight } = calculateBdwWeight(myBookmarks, authorTimesWon, authorLastSelectedAt);
      return {
        id: String(s._id),
        title: s.title,
        author: s.author,
        speaker: s.speaker ?? "",
        youtubeUrl: s.youtubeUrl,
        buyUrl: s.buyUrl ?? "",
        bookId: s.bookId,
        status: s.status,
        timesSelected: s.timesSelected ?? 0,
        authorTimesWon,
        lastSelectedAt: s.lastSelectedAt,
        createdAt: s.createdAt,
        weight,
      };
    });

    // Eigene Bücher für Schnell-Auswahl
    const booksCol = await getBooksCollection();
    const booksList = await booksCol
      .find({
        $or: [
          { ownerUsername: account.username },
          { coAuthors: { $elemMatch: { username: account.username, status: "confirmed" } } },
        ],
      })
      .sort({ createdAt: -1 })
      .project({
        _id: 1,
        title: 1,
        ownerUsername: 1,
        publisher: 1,
        presentationVideoUrl: 1,
        buyLinks: 1,
        coverImageUrl: 1,
      })
      .toArray();

    const myBooks = booksList.map((b) => ({
      id: String(b._id),
      title: b.title,
      ownerUsername: b.ownerUsername,
      presentationVideoUrl: b.presentationVideoUrl ?? "",
      buyUrl: b.buyLinks && b.buyLinks.length > 0 ? b.buyLinks[0].url : "",
      coverImageUrl: b.coverImageUrl ?? "",
    }));

    return NextResponse.json({
      cycleInfo,
      totalSubmissionsCount,
      mySubmissions,
      myBooks,
      myBookmarks,
      accountDisplayName: account.username,
    });
  } catch (err) {
    console.error("GET /api/buch-der-woche/bewerbung error:", err);
    return NextResponse.json({ error: "Fehler beim Laden der Bewerbungen" }, { status: 500 });
  }
}

/**
 * POST /api/buch-der-woche/bewerbung
 * Bewerbung für Buch der Woche einreichen.
 */
export async function POST(request: NextRequest) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ error: "Du musst angemeldet sein, um dich zu bewerben." }, { status: 401 });
    }

    const body = await request.json();
    const { title, author, speaker, youtubeUrl, buyUrl, bookId } = body;

    const trimmedTitle = typeof title === "string" ? title.trim().slice(0, 200) : "";
    const trimmedAuthor = typeof author === "string" ? author.trim().slice(0, 200) : "";
    const trimmedSpeaker = typeof speaker === "string" ? speaker.trim().slice(0, 200) : "";
    const trimmedYoutube = typeof youtubeUrl === "string" ? youtubeUrl.trim().slice(0, 500) : "";
    const trimmedBuyUrl = typeof buyUrl === "string" ? buyUrl.trim().slice(0, 500) : "";
    const cleanBookId = typeof bookId === "string" ? bookId.trim().slice(0, 100) : undefined;

    if (!trimmedTitle) {
      return NextResponse.json({ error: "Bitte gib einen Buchtitel an." }, { status: 400 });
    }
    if (!trimmedAuthor) {
      return NextResponse.json({ error: "Bitte gib den Namen des Autors an." }, { status: 400 });
    }
    if (!trimmedYoutube) {
      return NextResponse.json({ error: "Ein YouTube-Link (Video oder Reel/Short) ist erforderlich." }, { status: 400 });
    }

    const ytId = extractYouTubeId(trimmedYoutube);
    if (!ytId) {
      return NextResponse.json(
        { error: "Ungültiger YouTube-Link. Bitte gib einen direkten Link zu einem YouTube-Video oder YouTube-Reel/Short an." },
        { status: 400 }
      );
    }

    const subsCol = await getBdwSubmissionsCollection();

    // Prüfen ob dasselbe Buch vom selben User schon aktiv im Lostopf ist
    const existing = await subsCol.findOne({
      username: account.username,
      title: trimmedTitle,
      status: { $ne: "withdrawn" },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Dieses Buch befindet sich bereits in deinen aktiven Bewerbungen." },
        { status: 400 }
      );
    }

    const now = new Date();
    const newDoc: BdwSubmissionDocument = {
      username: account.username,
      authorDisplayName: trimmedAuthor || account.username,
      title: trimmedTitle,
      author: trimmedAuthor,
      speaker: trimmedSpeaker,
      youtubeUrl: trimmedYoutube,
      buyUrl: trimmedBuyUrl,
      bookId: cleanBookId,
      status: "active",
      timesSelected: 0,
      createdAt: now,
      updatedAt: now,
    };

    const result = await subsCol.insertOne(newDoc);

    // Automatische Auslosung prüfen, falls noch gar kein Buch der Woche existiert
    await ensureBuchDerWocheSelection();

    return NextResponse.json({
      ok: true,
      id: String(result.insertedId),
      message: `"${trimmedTitle}" wurde erfolgreich für das Buch der Woche eingereicht!`,
    });
  } catch (err) {
    console.error("POST /api/buch-der-woche/bewerbung error:", err);
    return NextResponse.json({ error: "Fehler beim Einreichen der Bewerbung" }, { status: 500 });
  }
}

/**
 * DELETE /api/buch-der-woche/bewerbung
 * Bewerbung zurückziehen / löschen.
 */
export async function DELETE(request: NextRequest) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "ID fehlt" }, { status: 400 });
    }

    let objId: ObjectId;
    try {
      objId = new ObjectId(id);
    } catch {
      return NextResponse.json({ error: "Ungültige ID" }, { status: 400 });
    }

    const subsCol = await getBdwSubmissionsCollection();
    const submission = await subsCol.findOne({ _id: objId });

    if (!submission) {
      return NextResponse.json({ error: "Bewerbung nicht gefunden" }, { status: 404 });
    }

    // Nur der eigene User oder ein Admin darf löschen
    const isOwner = submission.username === account.username;
    const isAdmin = account.role === "ADMIN" || account.role === "SUPERADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
    }

    await subsCol.updateOne({ _id: objId }, { $set: { status: "withdrawn", updatedAt: new Date() } });

    return NextResponse.json({ ok: true, message: "Bewerbung wurde zurückgezogen." });
  } catch (err) {
    console.error("DELETE /api/buch-der-woche/bewerbung error:", err);
    return NextResponse.json({ error: "Fehler beim Zurückziehen der Bewerbung" }, { status: 500 });
  }
}
