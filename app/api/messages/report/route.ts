import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerAccount } from "@/lib/server-auth";
import {
  getUsersCollection,
  getMessageReportsCollection,
} from "@/lib/mongodb";
import { checkRateLimit } from "@/lib/rate-limit";

type ReportPayload = {
  reportedUsername?: string;
  messageId?: string;
  reason?: string;
};

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    // Rate-Limit: max 10 Meldungen pro Minute
    if (!checkRateLimit(`report:${account.username}`, 10, 60_000)) {
      return NextResponse.json(
        { message: "Zu viele Anfragen. Bitte kurz warten." },
        { status: 429 }
      );
    }

    const body = (await request.json()) as ReportPayload;
    const reportedUsername = (body.reportedUsername ?? "").trim();
    const reason = (body.reason ?? "Spam").trim().slice(0, 500);
    const rawMessageId = (body.messageId ?? "").trim();

    if (!reportedUsername) {
      return NextResponse.json({ message: "Zu meldender Benutzer fehlt." }, { status: 400 });
    }

    if (reportedUsername === account.username) {
      return NextResponse.json({ message: "Du kannst dich nicht selbst melden." }, { status: 400 });
    }

    const users = await getUsersCollection();
    const target = await users.findOne({ username: reportedUsername }, { projection: { role: 1 } });
    if (!target) {
      return NextResponse.json({ message: "Benutzer nicht gefunden." }, { status: 404 });
    }

    if (target.role === "SUPERADMIN" || target.role === "ADMIN") {
      return NextResponse.json(
        { message: "Admins können nicht gemeldet werden." },
        { status: 400 }
      );
    }

    const reportsCol = await getMessageReportsCollection();

    let messageId: ObjectId | undefined;
    if (rawMessageId && ObjectId.isValid(rawMessageId)) {
      messageId = new ObjectId(rawMessageId);
    }

    // Prüfen ob dieser Nutzer denselben Account bereits gemeldet hat
    const existing = await reportsCol.findOne({
      reporterUsername: account.username,
      reportedUsername,
    });

    if (existing) {
      return NextResponse.json({
        message: "Du hast diesen Benutzer bereits als Spam gemeldet. Unsere Moderation prüft den Fall.",
      });
    }

    await reportsCol.insertOne({
      reporterUsername: account.username,
      reportedUsername,
      messageId,
      reason,
      createdAt: new Date(),
      status: "pending",
    });

    // Zähle unterschiedliche Reporter für den gemeldeten Benutzer
    const distinctReporters = await reportsCol.distinct("reporterUsername", {
      reportedUsername,
    });

    const isAutoFlagged = distinctReporters.length >= 2;

    await users.updateOne(
      { username: reportedUsername },
      {
        $inc: { spamReportCount: 1 },
        ...(isAutoFlagged ? { $set: { spamFlagged: true } } : {}),
      }
    );

    return NextResponse.json({
      message: isAutoFlagged
        ? "Vielen Dank. Aufgrund mehrerer Meldungen wurde der Account vorsorglich für den Nachrichtenversand gesperrt."
        : "Vielen Dank für deine Meldung. Unser Team wird sie prüfen.",
      autoFlagged: isAutoFlagged,
    });
  } catch (err) {
    console.error("POST /api/messages/report error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
