import { NextResponse } from "next/server";
import { getServerAccount } from "@/lib/server-auth";
import { getSubscribersCollection, getNewsletterQueueCollection, getNewsletterArchiveCollection } from "@/lib/newsletter";
import { getUsersCollection } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account || (account.role !== "ADMIN" && account.role !== "SUPERADMIN")) {
      return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
    }

    const body = (await request.json()) as {
      subject?: string;
      htmlContent?: string;
    };

    const subject = body.subject?.trim();
    const htmlContent = body.htmlContent?.trim();

    if (!subject || !htmlContent) {
      return NextResponse.json(
        { message: "Betreff und Inhalt sind erforderlich." },
        { status: 400 }
      );
    }

    if (subject.length > 300) {
      return NextResponse.json(
        { message: "Betreff darf maximal 300 Zeichen lang sein." },
        { status: 400 }
      );
    }

    // Alle aktiven externen Abonnenten laden
    const subscribersCol = await getSubscribersCollection();
    const externalSubscribers = await subscribersCol
      .find({ status: "active" }, { projection: { _id: 1, email: 1 } })
      .toArray();

    // Registrierte Nutzer mit Newsletter-Opt-in laden (status optional – nicht deaktivierte Nutzer)
    const usersCol = await getUsersCollection();
    const registeredOptIns = await usersCol
      .find({ newsletterOptIn: true, status: { $ne: "deactivated" } }, { projection: { _id: 1, email: 1 } })
      .toArray();

    // E-Mails deduplizieren (externe Abonnenten haben Vorrang)
    const emailSet = new Set<string>();
    const allRecipients: { _id: ObjectId; email: string }[] = [];

    for (const sub of externalSubscribers) {
      const mail = sub.email.toLowerCase();
      if (!emailSet.has(mail) && sub._id) {
        emailSet.add(mail);
        allRecipients.push({ _id: sub._id, email: sub.email });
      }
    }
    for (const user of registeredOptIns) {
      const mail = user.email.toLowerCase();
      if (!emailSet.has(mail) && user._id) {
        emailSet.add(mail);
        allRecipients.push({ _id: user._id, email: user.email });
      }
    }

    if (allRecipients.length === 0) {
      return NextResponse.json({ message: "Keine aktiven Abonnenten vorhanden.", queued: 0 });
    }

    // Für jeden Empfänger einen Queue-Eintrag erstellen
    const queueCol = await getNewsletterQueueCollection();
    const now = new Date();
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const queueEntries = allRecipients.map((sub) => ({
      subscriberId: sub._id!,
      email: sub.email,
      subject,
      htmlContent,
      status: "pending" as const,
      batchId,
      createdAt: now,
    }));

    await queueCol.insertMany(queueEntries);

    // Im Archiv speichern
    const archiveCol = await getNewsletterArchiveCollection();
    await archiveCol.insertOne({
      subject,
      htmlContent,
      batchId,
      recipientCount: queueEntries.length,
      sentBy: account.username,
      createdAt: now,
    });

    return NextResponse.json({
      message: `Newsletter für ${queueEntries.length} Empfänger in die Warteschlange aufgenommen.`,
      queued: queueEntries.length,
      batchId,
    });
  } catch (err) {
    console.error("[Newsletter API] Fehler:", err);
    return NextResponse.json({ message: "Interner Serverfehler." }, { status: 500 });
  }
}
