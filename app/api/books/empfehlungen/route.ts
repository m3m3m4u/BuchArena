import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase, getBooksCollection, getUsersCollection, getMessagesCollection, getMessageConversationsCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { awardBuchempfehlung, awardBuchempfehlungErhalten } from "@/lib/lesezeichen";

export type EmpfehlungDoc = {
  _id?: ObjectId;
  bookId: string;
  username: string;
  text: string;
  createdAt: Date;
};

async function getEmpfehlungenCollection() {
  const db = await getDatabase();
  return db.collection<EmpfehlungDoc>("buchempfehlungen");
}

/**
 * GET /api/books/empfehlungen?bookId=...
 * Gibt alle Empfehlungen für ein Buch zurück.
 */
export async function GET(req: NextRequest) {
  const bookId = req.nextUrl.searchParams.get("bookId");
  if (!bookId) {
    return NextResponse.json({ message: "bookId fehlt." }, { status: 400 });
  }

  try {
    const col = await getEmpfehlungenCollection();
    const rows = await col
      .find({ bookId })
      .sort({ createdAt: -1 })
      .toArray();

    // Display-Namen laden
    const usernames = [...new Set(rows.map((r) => r.username))];
    const users = await getUsersCollection();
    const userDocs = await users
      .find(
        { username: { $in: usernames } },
        { projection: { username: 1, profile: 1, speakerProfile: 1, bloggerProfile: 1 } },
      )
      .toArray();

    const nameMap = new Map<string, string>();
    for (const u of userDocs) {
      const name =
        u.profile?.name?.value ||
        u.speakerProfile?.name?.value ||
        u.bloggerProfile?.name?.value ||
        u.username;
      nameMap.set(u.username, name);
    }

    const empfehlungen = rows.map((r) => ({
      id: r._id!.toString(),
      username: r.username,
      displayName: nameMap.get(r.username) ?? r.username,
      text: r.text,
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json({ empfehlungen });
  } catch (err) {
    console.error("GET /api/books/empfehlungen error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}

/**
 * POST /api/books/empfehlungen
 * Erstellt eine neue Empfehlung. Vergibt Lesezeichen an Empfehler & Buchbesitzer.
 * Jeder User darf jedes Buch nur 1× empfehlen.
 */
export async function POST(req: NextRequest) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await req.json()) as { bookId?: string; text?: string };
    const bookId = body.bookId?.trim();
    const text = body.text?.trim();

    if (!bookId || !text) {
      return NextResponse.json({ message: "bookId und text sind erforderlich." }, { status: 400 });
    }

    if (text.length > 2000) {
      return NextResponse.json({ message: "Empfehlung darf max. 2000 Zeichen lang sein." }, { status: 400 });
    }

    // Buch prüfen
    const books = await getBooksCollection();
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(bookId);
    } catch {
      return NextResponse.json({ message: "Ungültige Buch-ID." }, { status: 400 });
    }

    const book = await books.findOne({ _id: objectId }, { projection: { ownerUsername: 1, title: 1 } });
    if (!book) {
      return NextResponse.json({ message: "Buch nicht gefunden." }, { status: 404 });
    }

    // Prüfen ob bereits empfohlen
    const col = await getEmpfehlungenCollection();
    const existing = await col.findOne({ bookId, username: account.username });
    if (existing) {
      return NextResponse.json({ message: "Du hast dieses Buch bereits empfohlen." }, { status: 409 });
    }

    // Empfehlung speichern
    const doc: EmpfehlungDoc = {
      bookId,
      username: account.username,
      text,
      createdAt: new Date(),
    };
    await col.insertOne(doc);

    // Lesezeichen vergeben (max. 3/Tag für Empfehler)
    const pointsAwarded = await awardBuchempfehlung(account.username);

    // +1 Lesezeichen für den Buchbesitzer (ohne Tageslimit)
    if (book.ownerUsername && book.ownerUsername !== account.username) {
      await awardBuchempfehlungErhalten(book.ownerUsername);

      // Nachricht an den Autor senden
      try {
        // Display-Name des Empfehlers laden
        const users = await getUsersCollection();
        const empfehlerDoc = await users.findOne(
          { username: account.username },
          { projection: { profile: 1, speakerProfile: 1, bloggerProfile: 1 } },
        );
        const empfehlerName =
          empfehlerDoc?.profile?.name?.value ||
          empfehlerDoc?.speakerProfile?.name?.value ||
          empfehlerDoc?.bloggerProfile?.name?.value ||
          account.username;

        const messages = await getMessagesCollection();
        const msgDoc = {
          senderUsername: account.username,
          recipientUsername: book.ownerUsername,
          subject: `Neue Empfehlung für „${book.title}"`,
          body: `${empfehlerName} hat dein Buch „${book.title}" empfohlen:\n\n„${text.length > 300 ? text.slice(0, 300) + "…" : text}"`,
          read: false,
          deletedBySender: false,
          deletedByRecipient: false,
          createdAt: new Date(),
        };
        const insertResult = await messages.insertOne(msgDoc);
        await messages.updateOne(
          { _id: insertResult.insertedId },
          { $set: { threadId: insertResult.insertedId } },
        );
        const [convUserA, convUserB] = [account.username, book.ownerUsername].sort();
        const convIsA = account.username === convUserA;
        const convCol = await getMessageConversationsCollection();
        await convCol.updateOne(
          { userA: convUserA, userB: convUserB },
          {
            $set: {
              latestMessageId: insertResult.insertedId,
              latestSender: account.username,
              latestRecipient: book.ownerUsername,
              latestSubject: msgDoc.subject,
              latestBody: msgDoc.body,
              latestCreatedAt: msgDoc.createdAt,
              updatedAt: msgDoc.createdAt,
            },
            $inc: { [convIsA ? "unreadForB" : "unreadForA"]: 1 },
            $setOnInsert: {
              userA: convUserA,
              userB: convUserB,
              [convIsA ? "unreadForA" : "unreadForB"]: 0,
            },
          },
          { upsert: true },
        );
      } catch (msgErr) {
        console.error("Empfehlungs-Benachrichtigung fehlgeschlagen:", msgErr);
      }
    }

    return NextResponse.json({
      message: "Empfehlung gespeichert!",
      pointsAwarded,
      lesezeichen: pointsAwarded ? 1 : 0,
    });
  } catch (err) {
    console.error("POST /api/books/empfehlungen error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}

/**
 * PUT /api/books/empfehlungen
 * Bearbeitet eine eigene Empfehlung.
 */
export async function PUT(req: NextRequest) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await req.json()) as { id?: string; text?: string };
    const id = body.id?.trim();
    const text = body.text?.trim();

    if (!id || !text) {
      return NextResponse.json({ message: "id und text sind erforderlich." }, { status: 400 });
    }
    if (text.length > 2000) {
      return NextResponse.json({ message: "Empfehlung darf max. 2000 Zeichen lang sein." }, { status: 400 });
    }

    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
    }

    const col = await getEmpfehlungenCollection();
    const doc = await col.findOne({ _id: objectId });
    if (!doc) {
      return NextResponse.json({ message: "Empfehlung nicht gefunden." }, { status: 404 });
    }
    if (doc.username !== account.username) {
      return NextResponse.json({ message: "Du kannst nur eigene Empfehlungen bearbeiten." }, { status: 403 });
    }

    await col.updateOne({ _id: objectId }, { $set: { text } });
    return NextResponse.json({ message: "Empfehlung aktualisiert." });
  } catch (err) {
    console.error("PUT /api/books/empfehlungen error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}

/**
 * DELETE /api/books/empfehlungen?id=...
 * Löscht eine Empfehlung. Erlaubt für: Verfasser oder Buchbesitzer.
 */
export async function DELETE(req: NextRequest) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ message: "id fehlt." }, { status: 400 });
    }

    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
    }

    const col = await getEmpfehlungenCollection();
    const doc = await col.findOne({ _id: objectId });
    if (!doc) {
      return NextResponse.json({ message: "Empfehlung nicht gefunden." }, { status: 404 });
    }

    // Erlaubt für Verfasser oder Buchbesitzer
    const isAuthor = doc.username === account.username;
    let isBookOwner = false;
    if (!isAuthor) {
      const books = await getBooksCollection();
      try {
        const book = await books.findOne(
          { _id: new ObjectId(doc.bookId) },
          { projection: { ownerUsername: 1 } },
        );
        isBookOwner = book?.ownerUsername === account.username;
      } catch { /* invalid bookId */ }
    }

    if (!isAuthor && !isBookOwner) {
      return NextResponse.json({ message: "Keine Berechtigung." }, { status: 403 });
    }

    await col.deleteOne({ _id: objectId });
    return NextResponse.json({ message: "Empfehlung gelöscht." });
  } catch (err) {
    console.error("DELETE /api/books/empfehlungen error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
