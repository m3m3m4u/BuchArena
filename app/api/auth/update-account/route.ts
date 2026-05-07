import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { getServerAccount, createAuthToken } from "@/lib/server-auth";

type UpdatePayload = {
  currentPassword: string;
  newUsername?: string;
  newEmail?: string;
  newPassword?: string;
};

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json(
        { message: "Nicht authentifiziert." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as UpdatePayload;
    const currentPassword = body.currentPassword?.trim();
    const newUsername = body.newUsername?.trim();
    const newEmail = body.newEmail?.trim()?.toLowerCase();
    const newPassword = body.newPassword?.trim();

    if (!currentPassword) {
      return NextResponse.json(
        { message: "Bitte gib dein aktuelles Passwort zur Bestätigung ein." },
        { status: 400 }
      );
    }

    if (!newUsername && !newEmail && !newPassword) {
      return NextResponse.json(
        { message: "Keine Änderungen angegeben." },
        { status: 400 }
      );
    }

    // Validate new username
    if (newUsername) {
      if (newUsername.length < 3 || newUsername.length > 30) {
        return NextResponse.json(
          { message: "Der Benutzername muss zwischen 3 und 30 Zeichen lang sein." },
          { status: 400 }
        );
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(newUsername)) {
        return NextResponse.json(
          { message: "Der Benutzername darf nur Buchstaben, Zahlen, - und _ enthalten." },
          { status: 400 }
        );
      }
    }

    // Validate new email
    if (newEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        return NextResponse.json(
          { message: "Bitte gib eine gültige E-Mail-Adresse ein." },
          { status: 400 }
        );
      }
    }

    // Validate new password
    if (newPassword && newPassword.length < 8) {
      return NextResponse.json(
        { message: "Das neue Passwort muss mindestens 8 Zeichen lang sein." },
        { status: 400 }
      );
    }

    const users = await getUsersCollection();

    // Verify current password
    const dbUser = await users.findOne(
      { username: account.username },
      { projection: { passwordHash: 1 } }
    );
    if (!dbUser) {
      return NextResponse.json(
        { message: "Benutzer nicht gefunden." },
        { status: 404 }
      );
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: "Aktuelles Passwort ist falsch." },
        { status: 403 }
      );
    }

    // Check uniqueness of new username / email
    if (newUsername && newUsername !== account.username) {
      const existing = await users.findOne(
        { username: newUsername },
        { projection: { _id: 1 } }
      );
      if (existing) {
        return NextResponse.json(
          { message: "Dieser Benutzername ist bereits vergeben." },
          { status: 409 }
        );
      }
    }

    if (newEmail && newEmail !== account.email) {
      const existing = await users.findOne(
        { email: newEmail },
        { projection: { _id: 1 } }
      );
      if (existing) {
        return NextResponse.json(
          { message: "Diese E-Mail-Adresse wird bereits verwendet." },
          { status: 409 }
        );
      }
    }

    // Build update
    const updateFields: Record<string, unknown> = {};
    if (newUsername && newUsername !== account.username) {
      updateFields.username = newUsername;
    }
    if (newEmail && newEmail !== account.email) {
      updateFields.email = newEmail;
    }
    if (newPassword) {
      updateFields.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { message: "Keine Änderungen nötig – die Daten sind identisch." },
        { status: 200 }
      );
    }

    await users.updateOne(
      { username: account.username },
      { $set: updateFields }
    );

    // If username or email changed, update related collections
    if (updateFields.username) {
      const oldUsername = account.username;
      const updatedUsername = updateFields.username as string;

      const { getDatabase } = await import("@/lib/mongodb");
      const database = await getDatabase();
      await database.collection("books").updateMany(
        { ownerUsername: oldUsername },
        { $set: { ownerUsername: updatedUsername } }
      );
      await database.collection("discussions").updateMany(
        { authorUsername: oldUsername },
        { $set: { authorUsername: updatedUsername } }
      );
      await database.collection("messages").updateMany(
        { senderUsername: oldUsername },
        { $set: { senderUsername: updatedUsername } }
      );
      await database.collection("messages").updateMany(
        { recipientUsername: oldUsername },
        { $set: { recipientUsername: updatedUsername } }
      );
      await database.collection("lesezeichen").updateMany(
        { username: oldUsername },
        { $set: { username: updatedUsername } }
      );
      await database.collection("support").updateMany(
        { username: oldUsername },
        { $set: { username: updatedUsername } }
      );
      await database.collection("kalender").updateMany(
        { createdBy: oldUsername },
        { $set: { createdBy: updatedUsername } }
      );
      await database.collection("kalender").updateMany(
        { participants: oldUsername },
        { $set: { "participants.$": updatedUsername } }
      );
    }

    // Issue new JWT with updated info
    const updatedAccount = {
      username: (updateFields.username as string) ?? account.username,
      email: (updateFields.email as string) ?? account.email,
      role: account.role,
    };

    const token = await createAuthToken(updatedAccount);

    const res = NextResponse.json({
      message: "Kontodaten erfolgreich aktualisiert.",
      user: updatedAccount,
    });

    res.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch {
    return NextResponse.json(
      { message: "Aktualisierung fehlgeschlagen." },
      { status: 500 }
    );
  }
}
