import { NextResponse } from "next/server";
import { getServerAccount } from "@/lib/server-auth";
import { getSubscribersCollection, getNewsletterQueueCollection, getNewsletterArchiveCollection } from "@/lib/newsletter";

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

    // Alle aktiven Abonnenten laden
    const subscribersCol = await getSubscribersCollection();
    const activeSubscribers = await subscribersCol
      .find({ status: "active" }, { projection: { _id: 1, email: 1 } })
      .toArray();

    if (activeSubscribers.length === 0) {
      return NextResponse.json({ message: "Keine aktiven Abonnenten vorhanden.", queued: 0 });
    }

    // Für jeden Abonnenten einen Queue-Eintrag erstellen
    const queueCol = await getNewsletterQueueCollection();
    const now = new Date();
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const queueEntries = activeSubscribers.map((sub) => ({
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
      message: `Newsletter für ${queueEntries.length} Abonnenten in die Warteschlange aufgenommen.`,
      queued: queueEntries.length,
      batchId,
    });
  } catch (err) {
    console.error("[Newsletter API] Fehler:", err);
    return NextResponse.json({ message: "Interner Serverfehler." }, { status: 500 });
  }
}
