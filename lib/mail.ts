import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMail(to: string, subject: string, html: string) {
  const { error } = await resend.emails.send({
    from: process.env.MAIL_FROM ?? "BuchArena <noreply@bucharena.org>",
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Resend-Fehler: ${error.message}`);
  }
}
