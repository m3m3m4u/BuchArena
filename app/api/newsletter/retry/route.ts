import { NextResponse } from "next/server";
import { getServerAccount } from "@/lib/server-auth";
import { getNewsletterQueueCollection } from "@/lib/newsletter";

/**
 * POST /api/newsletter/retry
 * Setzt alle "failed" und "processing" Einträge einer batchId (oder alle) auf "pending" zurück.
 * Optional: { batchId: "..." } im Body. Ohne batchId werden ALLE failed/processing Einträge zurückgesetzt.
 */
export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account || (account.role !== "ADMIN" && account.role !== "SUPERADMIN")) {
      return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as { batchId?: string };
    const queue = await getNewsletterQueueCollection();

    const filter: Record<string, unknown> = { status: { $in: ["failed", "processing"] } };
    if (body.batchId) {
      filter.batchId = body.batchId;
    }

    const result = await queue.updateMany(filter, {
      $set: { status: "pending" },
      $unset: { failedAt: "", errorMessage: "", sentAt: "" },
    });

    return NextResponse.json({
      message: `${result.modifiedCount} Einträge zurückgesetzt und werden erneut versendet.`,
      retried: result.modifiedCount,
    });
  } catch (err) {
    console.error("[Newsletter Retry] Fehler:", err);
    return NextResponse.json({ message: "Interner Serverfehler." }, { status: 500 });
  }
}

/**
 * GET /api/newsletter/retry
 * Gibt die Anzahl der failed/processing Einträge zurück (optional gefiltert nach batchId).
 */
export async function GET(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account || (account.role !== "ADMIN" && account.role !== "SUPERADMIN")) {
      return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batchId");
    const queue = await getNewsletterQueueCollection();

    const filter: Record<string, unknown> = { status: { $in: ["failed", "processing"] } };
    if (batchId) filter.batchId = batchId;

    const count = await queue.countDocuments(filter);
    return NextResponse.json({ count });
  } catch (err) {
    console.error("[Newsletter Retry] Fehler:", err);
    return NextResponse.json({ message: "Interner Serverfehler." }, { status: 500 });
  }
}
