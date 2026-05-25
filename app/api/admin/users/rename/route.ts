import { NextResponse } from "next/server";
import {
  getUsersCollection,
  getBooksCollection,
  getDiscussionsCollection,
  getMessagesCollection,
  getSupportCollection,
  getDatabase,
  isDuplicateKeyError,
} from "@/lib/mongodb";
import { requireAdmin } from "@/lib/server-auth";

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
    const admin = await requireAdmin();
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
        { message: "Der SuperAdmin-Benutzername kann nicht geändert werden." },
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

    const database = await getDatabase();

    await database.collection("kalender_events").updateMany(
      { createdBy: oldUsername },
      { $set: { createdBy: newUsername } },
    );
    await database.collection("kalender_events").updateMany(
      { participants: oldUsername },
      { $set: { "participants.$": newUsername } },
    );
    await database.collection("polls").updateMany(
      { authorUsername: oldUsername },
      { $set: { authorUsername: newUsername } },
    );
    await database.collection("polls").updateMany(
      { "votes.username": oldUsername },
      { $set: { "votes.$[v].username": newUsername } },
      { arrayFilters: [{ "v.username": oldUsername }] },
    );
    await database.collection("polls").updateMany(
      { "replies.authorUsername": oldUsername },
      { $set: { "replies.$[r].authorUsername": newUsername } },
      { arrayFilters: [{ "r.authorUsername": oldUsername }] },
    );
    await database.collection("tausch").updateMany(
      { authorUsername: oldUsername },
      { $set: { authorUsername: newUsername } },
    );
    await database.collection("lesezeichen").updateMany(
      { username: oldUsername },
      { $set: { username: newUsername } },
    );
    await database.collection("discussions").updateMany(
      { "reactions.username": oldUsername },
      { $set: { "reactions.$[r].username": newUsername } },
      { arrayFilters: [{ "r.username": oldUsername }] },
    );
    await database.collection("buchzirkel").updateMany(
      { veranstalterUsername: oldUsername },
      { $set: { veranstalterUsername: newUsername } },
    );
    await database.collection("buchzirkel_bewerbungen").updateMany(
      { bewerberUsername: oldUsername },
      { $set: { bewerberUsername: newUsername } },
    );
    await database.collection("buchzirkel_teilnahmen").updateMany(
      { teilnehmerUsername: oldUsername },
      { $set: { teilnehmerUsername: newUsername } },
    );
    await database.collection("buchzirkel_beitraege").updateMany(
      { autorUsername: oldUsername },
      { $set: { autorUsername: newUsername } },
    );
    await database.collection("buchzirkel_beitraege").updateMany(
      { "replies.autorUsername": oldUsername },
      { $set: { "replies.$[r].autorUsername": newUsername } },
      { arrayFilters: [{ "r.autorUsername": oldUsername }] },
    );
    await database.collection("buchzirkel_beitraege").updateMany(
      { "reactions.username": oldUsername },
      { $set: { "reactions.$[r].username": newUsername } },
      { arrayFilters: [{ "r.username": oldUsername }] },
    );
    await database.collection("buchzirkel_chat").updateMany(
      { senderUsername: oldUsername },
      { $set: { senderUsername: newUsername } },
    );
    await database.collection("buchzirkel_chat").updateMany(
      { readBy: oldUsername },
      { $set: { "readBy.$[elem]": newUsername } },
      { arrayFilters: [{ elem: oldUsername }] },
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
