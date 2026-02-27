import { NextResponse } from "next/server";
import {
  getUsersCollection,
  getBooksCollection,
  getDiscussionsCollection,
  getMessagesCollection,
  getSupportCollection,
  isDuplicateKeyError,
} from "@/lib/mongodb";
import { requireSuperAdmin } from "@/lib/server-auth";

type RenamePayload = {
  oldUsername?: string;
  newUsername?: string;
};

/**
 * Ändert den Benutzernamen eines Users.
 * Aktualisiert alle Referenzen in: users, books, discussions, messages, support.
 */
export async function POST(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
    }

    const body = (await request.json()) as RenamePayload;
    const oldUsername = body.oldUsername?.trim();
    const newUsername = body.newUsername?.trim();

    if (!oldUsername || !newUsername) {
      return NextResponse.json(
        { message: "Alter und neuer Benutzername erforderlich." },
        { status: 400 },
      );
    }

    if (newUsername.length < 3 || newUsername.length > 30) {
      return NextResponse.json(
        { message: "Benutzername muss zwischen 3 und 30 Zeichen lang sein." },
        { status: 400 },
      );
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(newUsername)) {
      return NextResponse.json(
        { message: "Benutzername darf nur Buchstaben, Zahlen, _ und - enthalten." },
        { status: 400 },
      );
    }

    if (oldUsername === newUsername) {
      return NextResponse.json(
        { message: "Der neue Name ist identisch mit dem alten." },
        { status: 400 },
      );
    }

    const users = await getUsersCollection();

    const target = await users.findOne(
      { username: oldUsername },
      { projection: { role: 1 } },
    );

    if (!target) {
      return NextResponse.json(
        { message: "Benutzer nicht gefunden." },
        { status: 404 },
      );
    }

    if (target.role === "SUPERADMIN") {
      return NextResponse.json(
        { message: "Der Admin-Benutzername kann nicht geändert werden." },
        { status: 403 },
      );
    }

    // Username in users-Collection ändern
    try {
      await users.updateOne(
        { username: oldUsername },
        { $set: { username: newUsername } },
      );
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        return NextResponse.json(
          { message: `Benutzername „${newUsername}" ist bereits vergeben.` },
          { status: 409 },
        );
      }
      throw err;
    }

    // Alle Referenzen in anderen Collections aktualisieren
    const books = await getBooksCollection();
    await books.updateMany(
      { ownerUsername: oldUsername },
      { $set: { ownerUsername: newUsername } },
    );

    const discussions = await getDiscussionsCollection();
    // Diskussionen (Autor)
    await discussions.updateMany(
      { authorUsername: oldUsername },
      { $set: { authorUsername: newUsername } },
    );
    // Antworten innerhalb von Diskussionen
    await discussions.updateMany(
      { "replies.authorUsername": oldUsername },
      { $set: { "replies.$[reply].authorUsername": newUsername } },
      { arrayFilters: [{ "reply.authorUsername": oldUsername }] },
    );

    const messages = await getMessagesCollection();
    await messages.updateMany(
      { senderUsername: oldUsername },
      { $set: { senderUsername: newUsername } },
    );
    await messages.updateMany(
      { recipientUsername: oldUsername },
      { $set: { recipientUsername: newUsername } },
    );

    const support = await getSupportCollection();
    await support.updateMany(
      { authorUsername: oldUsername },
      { $set: { authorUsername: newUsername } },
    );

    return NextResponse.json({
      message: `Benutzername „${oldUsername}" wurde zu „${newUsername}" geändert.`,
    });
  } catch {
    return NextResponse.json(
      { message: "Umbenennung fehlgeschlagen." },
      { status: 500 },
    );
  }
}
