import crypto from "crypto";
import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { sendMail } from "@/lib/mail";

type ForgotPayload = { email?: string };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ForgotPayload;
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { message: "Bitte eine E-Mail-Adresse eingeben." },
        { status: 400 },
      );
    }

    // Immer gleiche Antwort – kein User-Enumeration-Leak
    const successMsg =
      "Falls ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet.";

    const users = await getUsersCollection();
    const user = await users.findOne(
      { email },
      { projection: { username: 1, email: 1, status: 1 } },
    );

    if (!user || user.status === "deactivated") {
      return NextResponse.json({ message: successMsg });
    }

    // Zufälligen Token erzeugen (URL-sicherer Hex-String)
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 Stunde

    await users.updateOne(
      { email },
      { $set: { resetToken: token, resetTokenExpiresAt: expiresAt } },
    );

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const resetLink = `${baseUrl}/passwort-reset?token=${token}`;

    await sendMail(
      user.email,
      "BuchArena – Passwort zurücksetzen",
      `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Passwort zurücksetzen</h2>
        <p>Hallo <strong>${user.username}</strong>,</p>
        <p>du hast angefordert, dein Passwort zurückzusetzen.
           Klicke auf den folgenden Link:</p>
        <p><a href="${resetLink}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none">Passwort zurücksetzen</a></p>
        <p style="font-size:0.85em;color:#666">Der Link ist 1 Stunde gültig.
           Falls du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail.</p>
      </div>
      `,
    );

    return NextResponse.json({ message: successMsg });
  } catch (err) {
    console.error("Forgot-password error:", err);
    return NextResponse.json(
      { message: "Fehler beim Senden der E-Mail." },
      { status: 500 },
    );
  }
}
