import { MongoServerError, ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { getBooksCollection, getDatabase, getUsersCollection } from "@/lib/mongodb";
import { getServerAccount, requireAdmin } from "@/lib/server-auth";
import { getAdBudgetCycle, getAdBudgetMonth, isAdBudgetMonth, type AdBudgetRound } from "@/lib/werbebudget";

export const runtime = "nodejs";

async function rounds() {
  return (await getDatabase()).collection<AdBudgetRound>("social_media_werbebudget");
}

function ownBooks(username: string) {
  return { $or: [
    { ownerUsername: username, isUnclaimed: { $ne: true } },
    { coAuthors: { $elemMatch: { username, status: "confirmed" } } },
  ] };
}

function failure(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const account = await getServerAccount();
    const isAdmin = account?.role === "ADMIN" || account?.role === "SUPERADMIN";
    const selected = request.nextUrl.searchParams.get("month");
    const month = isAdmin && selected ? selected : getAdBudgetMonth();
    if (!isAdBudgetMonth(month) || month > getAdBudgetMonth()) return failure("Ungültiger Monat.");
    const collection = await rounds();
    const round = await collection.findOne({ _id: month });
    const user = account ? await (await getUsersCollection()).findOne({ username: account.username }, { projection: { _id: 1 } }) : null;
    const books = account ? await (await getBooksCollection()).find(ownBooks(account.username))
      .project({ title: 1 }).sort({ title: 1 }).toArray() : [];
    return NextResponse.json({
      cycle: getAdBudgetCycle(month),
      closed: month !== getAdBudgetMonth(),
      myApplication: user ? round?.applications.find((a) => a.userId === String(user._id)) ?? null : null,
      myBooks: books.map((b) => ({ id: String(b._id), title: b.title })),
      isAdmin,
      ...(isAdmin ? {
        applications: round?.applications ?? [],
        months: [...new Set([getAdBudgetMonth(), ...(await collection.find({}, { projection: { _id: 1 } }).toArray()).map((r) => r._id)])].sort().reverse(),
      } : {}),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Werbebudget laden:", error);
    return failure("Die Bewerbungen konnten nicht geladen werden.", 500);
  }
}

export async function POST(request: NextRequest) {
  return saveApplication(request, false);
}

export async function PUT(request: NextRequest) {
  return saveApplication(request, true);
}

async function saveApplication(request: NextRequest, update: boolean) {
  try {
    const account = await getServerAccount();
    if (!account) return failure("Bitte melde dich an, um dich zu bewerben.", 401);
    const user = await (await getUsersCollection()).findOne({ username: account.username, status: { $ne: "deactivated" } }, { projection: { _id: 1 } });
    if (!user) return failure("Dein Konto ist nicht verfügbar.", 403);
    const userId = String(user._id);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return failure("Ungültige Bewerbung.");
    const month = getAdBudgetMonth();
    if (body.month !== month) return failure("Eine neue Monatsrunde hat begonnen. Bitte lade die Seite neu.", 409);
    if (body.conditionsAccepted !== true) return failure("Bitte bestätige die Teilnahmebedingungen.");
    if (typeof body.bookId !== "string" || !/^[a-f\d]{24}$/i.test(body.bookId)) return failure("Bitte wähle dein Buch aus.");
    const socialHandle = typeof body.socialHandle === "string" ? body.socialHandle.trim() : "";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    if (!socialHandle || socialHandle.length > 200 || notes.length > 2000) return failure("Bitte gib dein Social-Media-Profil an (max. 200 Zeichen; Hinweise max. 2.000 Zeichen).");
    const book = await (await getBooksCollection()).findOne({ _id: new ObjectId(body.bookId), ...ownBooks(account.username) });
    if (!book) return failure("Du kannst nur ein eigenes Buch aus der BuchArena einreichen.", 403);
    const collection = await rounds();
    // A single monthly document makes entry uniqueness atomic.
    try {
      await collection.updateOne({ _id: month }, { $setOnInsert: { revision: 0, status: "open", applications: [] } }, { upsert: true });
    } catch (error) {
      if (!(error instanceof MongoServerError && error.code === 11000)) throw error;
    }
    const now = new Date().toISOString();
    if (update) {
      const result = await collection.updateOne({ _id: month, status: "open", "applications.userId": userId }, {
        $set: { "applications.$.username": account.username, "applications.$.bookId": body.bookId,
          "applications.$.bookTitle": book.title, "applications.$.socialHandle": socialHandle,
          "applications.$.notes": notes, "applications.$.status": "pending", "applications.$.updatedAt": now },
        $unset: { "applications.$.reviewedBy": "" },
        $inc: { revision: 1 },
      });
      if (!result.modifiedCount) return failure("Deine Bewerbung ist nicht vorhanden oder die Runde ist abgeschlossen.", 409);
      return NextResponse.json({ ok: true });
    }
    const result = await collection.updateOne({ _id: month, status: "open", "applications.userId": { $ne: userId } }, {
      $push: { applications: { id: new ObjectId().toHexString(), userId, username: account.username, bookId: body.bookId,
        bookTitle: book.title, socialHandle, notes, status: "pending", createdAt: now, updatedAt: now } },
      $inc: { revision: 1 },
    });
    if (!result.modifiedCount) return failure("Du bist für diesen Monat bereits beworben.", 409);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Werbebudget bewerben:", error);
    return failure("Deine Bewerbung konnte nicht gespeichert werden.", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const account = await requireAdmin();
    if (!account) return failure("Nur für Admins.", 403);
    const body = await request.json().catch(() => null);
    if (!body || !isAdBudgetMonth(body.month) || body.month > getAdBudgetMonth()) return failure("Ungültiger Monat.");
    if (body.action !== "review") return failure("Ungültige Aktion.");
    const collection = await rounds();
    const round = await collection.findOne({ _id: body.month });
    if (!round || round.status !== "open") return failure("Diese Runde ist nicht offen.", 409);
    if (!getAdBudgetCycle(body.month).canReview) return failure("Die abschließende Prüfung ist ab dem letzten Tag des Teilnahmemonats möglich.");
    if (body.status !== "approved" && body.status !== "rejected") return failure("Ungültiger Prüfstatus.");
    if (typeof body.applicationId !== "string") return failure("Ungültige Bewerbung.");
    const result = await collection.updateOne({ _id: body.month, status: "open", "applications.id": body.applicationId }, {
      $set: { "applications.$.status": body.status, "applications.$.reviewedBy": account.username, "applications.$.updatedAt": new Date().toISOString() },
      $inc: { revision: 1 },
    });
    if (!result.modifiedCount) return failure("Bewerbung nicht gefunden oder Runde bereits beendet.", 409);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Werbebudget verwalten:", error);
    return failure("Die Aktion konnte nicht gespeichert werden.", 500);
  }
}
