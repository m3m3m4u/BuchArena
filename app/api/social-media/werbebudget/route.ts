import { MongoServerError, ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { getBooksCollection, getUsersCollection } from "@/lib/mongodb";
import { getServerAccount, requireAdmin } from "@/lib/server-auth";
import { getAdBudgetCycle, getAdBudgetExpiry, getAdBudgetMonth, isAdBudgetCountry, isAdBudgetMonth, isAdBudgetParticipationOption } from "@/lib/werbebudget";
import { getAdBudgetRounds } from "@/lib/werbebudget-db";
import { AD_BUDGET_TERMS_VERSION } from "@/lib/werbebudget-terms";

export const runtime = "nodejs";

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
    if (!account) {
      const cycle = getAdBudgetCycle(getAdBudgetMonth());
      return NextResponse.json({ cycle, closed: !cycle.applicationsOpen, myApplication: null,
        myBooks: [], myPreviousApplications: [], isAdmin: false }, { headers: { "Cache-Control": "private, no-store" } });
    }
    const selected = request.nextUrl.searchParams.get("month");
    const month = isAdmin && selected ? selected : getAdBudgetMonth();
    if (!isAdBudgetMonth(month) || month > getAdBudgetMonth()) return failure("Ungültiger Monat.");
    const collection = await getAdBudgetRounds();
    const round = await collection.findOne({ _id: month });
    const user = account ? await (await getUsersCollection()).findOne({ username: account.username }, { projection: { _id: 1 } }) : null;
    const books = account ? await (await getBooksCollection()).find(ownBooks(account.username))
      .project({ title: 1 }).sort({ title: 1 }).toArray() : [];
    const previous = user ? await collection.find(
      { _id: { $ne: month }, "applications.userId": String(user._id), expiresAt: { $gt: new Date() } },
      { projection: { _id: 1, applications: { $elemMatch: { userId: String(user._id) } } } },
    ).sort({ _id: -1 }).toArray() : [];
    const cycle = getAdBudgetCycle(month);
    return NextResponse.json({
      cycle,
      closed: !cycle.applicationsOpen,
      myApplication: user ? round?.applications.find((a) => a.userId === String(user._id)) ?? null : null,
      myBooks: books.map((b) => ({ id: String(b._id), title: b.title })),
      myPreviousApplications: previous.flatMap((round) => round.applications.map((application) => ({ month: round._id, application }))),
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
    if (account.role === "ADMIN" || account.role === "SUPERADMIN") return failure("An der Verwaltung beteiligte Personen sind von der Teilnahme ausgeschlossen.", 403);
    const user = await (await getUsersCollection()).findOne({ username: account.username, status: { $ne: "deactivated" } }, { projection: { _id: 1 } });
    if (!user) return failure("Dein Konto ist nicht verfügbar.", 403);
    const userId = String(user._id);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return failure("Ungültige Bewerbung.");
    const month = getAdBudgetMonth();
    if (body.month !== month) return failure("Eine neue Monatsrunde hat begonnen. Bitte lade die Seite neu.", 409);
    if (!getAdBudgetCycle(month).applicationsOpen) return failure("Die Bewerbungsfrist dieser Runde ist abgelaufen. Ab dem Monatsersten beginnt die nächste Runde.", 409);
    if (body.conditionsAccepted !== true) return failure("Bitte bestätige die Teilnahmebedingungen.");
    if (body.termsVersion !== AD_BUDGET_TERMS_VERSION) return failure("Die Teilnahmebedingungen wurden aktualisiert. Bitte lade sie neu und bestätige die aktuelle Fassung.", 409);
    if (!isAdBudgetParticipationOption(body.participationOption)) return failure("Bitte wähle 10 Kommentare + 3 Story-Teilungen oder 20 Kommentare, jeweils auf mindestens drei Tage verteilt.");
    if (body.eligibilityConfirmed !== true || !isAdBudgetCountry(body.country)) return failure("Bitte bestätige Volljährigkeit und Teilnahmeberechtigung und wähle dein Wohnsitzland.");
    if (body.rightsConfirmed !== true) return failure("Bitte bestätige die Nutzungsrechte für die eingereichten Buchmaterialien.");
    if (typeof body.publicationConsent !== "boolean") return failure("Bitte prüfe die freiwillige Angabe zur Gewinnernennung.");
    if (typeof body.bookId !== "string" || !/^[a-f\d]{24}$/i.test(body.bookId)) return failure("Bitte wähle dein Buch aus.");
    const socialHandle = typeof body.socialHandle === "string" ? body.socialHandle.trim() : "";
    if (!socialHandle || socialHandle.length > 200) return failure("Bitte gib dein Social-Media-Profil an (maximal 200 Zeichen).");
    const book = await (await getBooksCollection()).findOne({ _id: new ObjectId(body.bookId), ...ownBooks(account.username) });
    if (!book) return failure("Du kannst nur ein eigenes Buch aus der BuchArena einreichen.", 403);
    const collection = await getAdBudgetRounds();
    // A single monthly document makes entry uniqueness atomic.
    try {
      await collection.updateOne({ _id: month }, { $setOnInsert: { revision: 0, status: "open", applications: [], expiresAt: getAdBudgetExpiry(month) } }, { upsert: true });
    } catch (error) {
      if (!(error instanceof MongoServerError && error.code === 11000)) throw error;
    }
    const now = new Date().toISOString();
    const acceptance = { version: AD_BUDGET_TERMS_VERSION, acceptedAt: now, eligibilityConfirmed: true as const, rightsConfirmed: true as const };
    const publicationConsent = { granted: body.publicationConsent, updatedAt: now };
    if (update) {
      const result = await collection.updateOne({ _id: month, status: "open", "applications.userId": userId }, {
        $set: { "applications.$.username": account.username, "applications.$.bookId": body.bookId,
          "applications.$.bookTitle": book.title, "applications.$.socialHandle": socialHandle,
          "applications.$.participationOption": body.participationOption, "applications.$.status": "pending", "applications.$.updatedAt": now,
          "applications.$.country": body.country, "applications.$.acceptance": acceptance, "applications.$.publicationConsent": publicationConsent },
        $unset: { "applications.$.notes": "", "applications.$.reviewedBy": "", "applications.$.reviewReason": "", "applications.$.withdrawnAt": "" },
        $inc: { revision: 1 },
      });
      if (!result.modifiedCount) return failure("Deine Bewerbung ist nicht vorhanden oder die Runde ist abgeschlossen.", 409);
      return NextResponse.json({ ok: true });
    }
    const result = await collection.updateOne({ _id: month, status: "open", "applications.userId": { $ne: userId } }, {
      $push: { applications: { id: new ObjectId().toHexString(), userId, username: account.username, bookId: body.bookId,
        bookTitle: book.title, socialHandle, participationOption: body.participationOption, status: "pending", createdAt: now, updatedAt: now,
        country: body.country, acceptance, initialAcceptance: acceptance, publicationConsent } },
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
    const body = await request.json().catch(() => null);
    if (body?.action === "revoke-publication") {
      const account = await getServerAccount();
      if (!account) return failure("Bitte melde dich an.", 401);
      if (!isAdBudgetMonth(body.month) || body.month > getAdBudgetMonth()) return failure("Ungültiger Monat.");
      const user = await (await getUsersCollection()).findOne({ username: account.username }, { projection: { _id: 1 } });
      if (!user) return failure("Konto nicht gefunden.", 403);
      const result = await (await getAdBudgetRounds()).updateOne({ _id: body.month, "applications.userId": String(user._id) }, {
        $set: { "applications.$.publicationConsent": { granted: false, updatedAt: new Date().toISOString() } },
        $inc: { revision: 1 },
      });
      if (!result.matchedCount) return failure("Bewerbung nicht gefunden.", 404);
      return NextResponse.json({ ok: true });
    }
    const account = await requireAdmin();
    if (!account) return failure("Nur für Admins.", 403);
    if (!body || !isAdBudgetMonth(body.month) || body.month > getAdBudgetMonth()) return failure("Ungültiger Monat.");
    if (body.action !== "review") return failure("Ungültige Aktion.");
    const collection = await getAdBudgetRounds();
    const round = await collection.findOne({ _id: body.month });
    if (!round || round.status !== "open") return failure("Diese Runde ist nicht offen.", 409);
    if (!getAdBudgetCycle(body.month).canReview) return failure("Die abschließende Prüfung ist nach Bewerbungsschluss möglich.");
    if (body.status !== "approved" && body.status !== "rejected") return failure("Ungültiger Prüfstatus.");
    if (typeof body.applicationId !== "string") return failure("Ungültige Bewerbung.");
    const reviewReason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (reviewReason.length > 500 || (body.status === "rejected" && !reviewReason)) return failure("Bitte dokumentiere den Grund der Ablehnung (maximal 500 Zeichen).");
    const result = await collection.updateOne({ _id: body.month, status: "open", applications: { $elemMatch: { id: body.applicationId, status: { $ne: "withdrawn" } } } }, {
      $set: { "applications.$.status": body.status, "applications.$.reviewedBy": account.username,
        "applications.$.reviewReason": reviewReason, "applications.$.updatedAt": new Date().toISOString() },
      $inc: { revision: 1 },
    });
    if (!result.modifiedCount) return failure("Bewerbung nicht gefunden oder Runde bereits beendet.", 409);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Werbebudget verwalten:", error);
    return failure("Die Aktion konnte nicht gespeichert werden.", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const account = await getServerAccount();
    if (!account) return failure("Bitte melde dich an.", 401);
    const body = await request.json().catch(() => null);
    if (!body || !isAdBudgetMonth(body.month) || body.month > getAdBudgetMonth()) return failure("Ungültiger Monat.");
    const user = await (await getUsersCollection()).findOne({ username: account.username }, { projection: { _id: 1 } });
    if (!user) return failure("Konto nicht gefunden.", 403);
    const now = new Date().toISOString();
    const result = await (await getAdBudgetRounds()).updateOne({ _id: body.month, "applications.userId": String(user._id) }, {
      $set: { "applications.$.status": "withdrawn", "applications.$.socialHandle": "", "applications.$.notes": "",
        "applications.$.withdrawnAt": now, "applications.$.updatedAt": now,
        "applications.$.publicationConsent": { granted: false, updatedAt: now } },
      $unset: { "applications.$.country": "", "applications.$.reviewedBy": "", "applications.$.reviewReason": "" },
      $inc: { revision: 1 },
    });
    if (!result.matchedCount) return failure("Bewerbung nicht gefunden.", 404);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Werbebudget zurückziehen:", error);
    return failure("Die Bewerbung konnte nicht zurückgezogen werden.", 500);
  }
}
