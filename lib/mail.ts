import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export async function sendMail(to: string, subject: string, html: string) {
  const { error } = await getResend().emails.send({
    from: process.env.MAIL_FROM ?? "BuchArena <noreply@bucharena.org>",
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Resend-Fehler: ${error.message}`);
  }
}
