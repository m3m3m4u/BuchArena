import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export type MailAttachment = {
  filename: string;
  content: Buffer;
  content_type: string;
  content_id: string;
};

export async function sendMail(
  to: string,
  subject: string,
  html: string,
  attachments?: MailAttachment[]
) {
  // Defense-in-depth: CR/LF aus subject und to entfernen (Header-Injection-Schutz).
  const safeSubject = subject.replace(/[\r\n]+/g, " ").slice(0, 998);
  const safeTo = to.replace(/[\r\n]+/g, "").trim();

  const { error } = await getResend().emails.send({
    from: process.env.MAIL_FROM ?? "BuchArena <noreply@bucharena.org>",
    to: safeTo,
    subject: safeSubject,
    html,
    attachments,
  });

  if (error) {
    throw new Error(`Resend-Fehler: ${error.message}`);
  }
}
