import { NextResponse } from "next/server";
import { getSubscribersCollection, verifyUnsubscribeToken } from "@/lib/newsletter";
import { getUsersCollection } from "@/lib/mongodb";

/**
 * GET /api/newsletter/unsubscribe?token=<HMAC-signed-token>
 *
 * Wird aufgerufen, wenn ein Nutzer auf den Abmelde-Link in der E-Mail klickt.
 * Der Token enthält die Base64url-kodierte E-Mail-Adresse und eine HMAC-Signatur –
 * so können keine fremden Adressen abgemeldet werden.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim() ?? "";

  if (!token) {
    return new NextResponse(renderPage("Ungültiger Link", "Der Abmelde-Link ist unvollständig."), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  let email: string;
  try {
    email = verifyUnsubscribeToken(token);
  } catch {
    return new NextResponse(
      renderPage("Ungültiger Link", "Der Abmelde-Link ist abgelaufen oder wurde verändert."),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  try {
    // Externe Abonnenten abmelden
    const col = await getSubscribersCollection();
    await col.updateOne(
      { email },
      { $set: { status: "unsubscribed", unsubscribedAt: new Date() } }
    );

    // Registrierte Nutzer: newsletterOptIn deaktivieren
    const usersCol = await getUsersCollection();
    await usersCol.updateOne(
      { email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
      { $set: { newsletterOptIn: false } }
    );

    return new NextResponse(
      renderPage(
        "Erfolgreich abgemeldet",
        `Die E-Mail-Adresse <strong>${escapeHtml(email)}</strong> wurde vom Newsletter abgemeldet. Du erhältst keine weiteren Nachrichten von uns.`
      ),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (err) {
    console.error("[Newsletter Unsubscribe] Fehler:", err);
    return new NextResponse(
      renderPage("Fehler", "Es ist ein Fehler aufgetreten. Bitte versuche es später erneut."),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} – BuchArena</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #f9fafb;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .card {
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      padding: 2.5rem 3rem;
      max-width: 480px;
      width: 100%;
      text-align: center;
    }
    h1 { font-size: 1.5rem; font-weight: 700; color: #111827; margin-bottom: 1rem; }
    p  { color: #4b5563; line-height: 1.6; }
    a  { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .back { margin-top: 1.5rem; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${escapeHtml(title)}</h1>
    <p>${message}</p>
    <p class="back"><a href="https://bucharena.org">← Zurück zu BuchArena</a></p>
  </div>
</body>
</html>`;
}
