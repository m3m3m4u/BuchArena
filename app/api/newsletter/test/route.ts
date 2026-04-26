import { NextResponse } from "next/server";
import { getServerAccount } from "@/lib/server-auth";
import { sendMail } from "@/lib/mail";
import { createUnsubscribeToken } from "@/lib/newsletter";
import { embedImages } from "@/lib/newsletter-worker";

/**
 * POST /api/newsletter/test
 *
 * Sendet den Newsletter-Entwurf direkt (ohne Queue) an eine einzelne Test-E-Mail-Adresse.
 * Nur für Admins zugänglich.
 */
export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account || (account.role !== "ADMIN" && account.role !== "SUPERADMIN")) {
      return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
    }

    const body = (await request.json()) as {
      testEmail?: string;
      subject?: string;
      htmlContent?: string;
    };

    const testEmail = body.testEmail?.trim().toLowerCase();
    const subject = body.subject?.trim();
    const htmlContent = body.htmlContent?.trim();

    if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      return NextResponse.json({ message: "Gültige Test-E-Mail-Adresse erforderlich." }, { status: 400 });
    }
    if (!subject) {
      return NextResponse.json({ message: "Betreff ist erforderlich." }, { status: 400 });
    }
    if (!htmlContent) {
      return NextResponse.json({ message: "Inhalt ist erforderlich." }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://bucharena.org";
    const token = createUnsubscribeToken(testEmail);
    const unsubscribeLink = `${baseUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;

    const testBanner = `
<div style="background:#fef9c3;border:2px dashed #ca8a04;padding:12px 16px;margin-bottom:24px;border-radius:6px;font-family:system-ui,sans-serif;font-size:13px;color:#92400e;">
  <strong>⚠ Testzusendung</strong> – Diese E-Mail wurde als Vorschau an <em>${testEmail}</em> gesendet und geht nicht an echte Abonnenten.
</div>`;

    const footer = `
<div style="margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;text-align:center;">
  <p>Du erhältst diese E-Mail, weil du den BuchArena-Newsletter abonniert hast.</p>
  <p><a href="${unsubscribeLink}" style="color:#6b7280;text-decoration:underline;">Newsletter abbestellen</a></p>
</div>`;

    const fullHtml = testBanner + htmlContent + footer;

    const { html: embeddedHtml, attachments } = await embedImages(fullHtml);

    await sendMail(testEmail, `[TEST] ${subject}`, embeddedHtml, attachments.length > 0 ? attachments : undefined);

    return NextResponse.json({ message: `Testzusendung erfolgreich an ${testEmail} gesendet.` });
  } catch (err) {
    console.error("[Newsletter Test] Fehler:", err);
    return NextResponse.json({ message: "Fehler beim Senden der Testzusendung." }, { status: 500 });
  }
}
