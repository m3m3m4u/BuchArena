import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getBooksCollection, getMessagesCollection, getUsersCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { checkRateLimit } from "@/lib/rate-limit";

/** POST /api/books/co-authors – Buchbesitzer lädt einen Mitautor ein */
export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    if (!checkRateLimit(`book-coauthor-invite:${account.username}`, 20, 60 * 1000)) {
      return NextResponse.json({ message: "Zu viele Anfragen." }, { status: 429 });
    }

    const body = (await request.json()) as { bookId?: string; coAuthorUsername?: string };
    const bookId = body.bookId?.trim();
    const coAuthorUsername = body.coAuthorUsername?.trim();

    if (!bookId || !coAuthorUsername) {
      return NextResponse.json({ message: "Buch-ID und Benutzername erforderlich." }, { status: 400 });
    }

    if (!ObjectId.isValid(bookId)) {
      return NextResponse.json({ message: "Ungültige Buch-ID." }, { status: 400 });
    }

    if (coAuthorUsername === account.username) {
      return NextResponse.json({ message: "Du kannst dich nicht selbst als Mitautor*in angeben." }, { status: 400 });
    }

    const books = await getBooksCollection();
    const book = await books.findOne({ _id: new ObjectId(bookId), ownerUsername: account.username });
    if (!book) {
      return NextResponse.json({ message: "Buch nicht gefunden oder kein Zugriff." }, { status: 404 });
    }

    // Prüfen ob bereits eingeladen (außer wenn abgelehnt)
    const existing = book.coAuthors?.find((c) => c.username === coAuthorUsername);
    if (existing && existing.status !== "declined") {
      return NextResponse.json({ message: "Diese Person wurde bereits eingeladen oder hat bereits bestätigt." }, { status: 409 });
    }

    // Zielbenutzer prüfen
    const users = await getUsersCollection();
    const targetUser = await users.findOne(
      { username: coAuthorUsername, $or: [{ status: { $exists: false } }, { status: "active" }] },
      { projection: { username: 1, profile: 1, displayName: 1 } },
    );
    if (!targetUser) {
      return NextResponse.json({ message: "Benutzer nicht gefunden." }, { status: 404 });
    }
    if (!targetUser.profile) {
      return NextResponse.json({ message: `${coAuthorUsername} hat kein Autor-Profil.` }, { status: 400 });
    }

    const now = new Date();

    // Alten Eintrag (abgelehnt) entfernen, dann neuen hinzufügen
    await books.updateOne(
      { _id: new ObjectId(bookId) },
      { $pull: { coAuthors: { username: coAuthorUsername } } } as Parameters<typeof books.updateOne>[1],
    );
    await books.updateOne(
      { _id: new ObjectId(bookId) },
      { $push: { coAuthors: { username: coAuthorUsername, status: "pending", invitedAt: now } } } as Parameters<typeof books.updateOne>[1],
    );

    // Nachricht an den eingeladenen Benutzer senden
    const me = await users.findOne({ username: account.username }, { projection: { profile: 1, displayName: 1 } });
    const myDisplayName = me?.profile?.name?.value || me?.displayName || account.username;
    const subject = `Einladung als Mitautor*in: ${book.title}`;
    const msgBody = `Hallo!\n\n${myDisplayName} hat dich als Mitautor*in für das Buch „${book.title}" eingeladen.\n\nDu kannst die Einladung direkt hier bestätigen oder ablehnen.\n\nNach der Bestätigung erscheint das Buch auch in deiner Bücherliste.`;

    const messages = await getMessagesCollection();
    const insertResult = await messages.insertOne({
      senderUsername: account.username,
      recipientUsername: coAuthorUsername,
      subject,
      body: msgBody,
      read: false,
      bookCoAuthorId: bookId,
      deletedBySender: false,
      deletedByRecipient: false,
      createdAt: now,
    });
    await messages.updateOne(
      { _id: insertResult.insertedId },
      { $set: { threadId: insertResult.insertedId } },
    );

    return NextResponse.json({ message: "Einladung gesendet!" });
  } catch (err) {
    console.error("POST /api/books/co-authors error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}

/** DELETE /api/books/co-authors – Mitautor entfernen (Owner oder Mitautor selbst) */
export async function DELETE(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId")?.trim();
    const targetUsername = searchParams.get("username")?.trim();

    if (!bookId || !ObjectId.isValid(bookId)) {
      return NextResponse.json({ message: "Ungültige Buch-ID." }, { status: 400 });
    }

    const books = await getBooksCollection();

    if (targetUsername) {
      // Owner entfernt einen Mitautor
      const book = await books.findOne({ _id: new ObjectId(bookId), ownerUsername: account.username });
      if (!book) {
        return NextResponse.json({ message: "Buch nicht gefunden oder kein Zugriff." }, { status: 404 });
      }
      await books.updateOne(
        { _id: new ObjectId(bookId) },
        { $pull: { coAuthors: { username: targetUsername } } } as Parameters<typeof books.updateOne>[1],
      );
    } else {
      // Mitautor entfernt sich selbst
      await books.updateOne(
        { _id: new ObjectId(bookId), "coAuthors.username": account.username },
        { $pull: { coAuthors: { username: account.username } } } as Parameters<typeof books.updateOne>[1],
      );
    }

    return NextResponse.json({ message: "Mitautorenschaft entfernt." });
  } catch (err) {
    console.error("DELETE /api/books/co-authors error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
