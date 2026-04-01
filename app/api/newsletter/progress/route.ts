import { NextResponse } from "next/server";
import { getServerAccount } from "@/lib/server-auth";
import { getNewsletterQueueCollection } from "@/lib/newsletter";

export async function GET(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account || (account.role !== "ADMIN" && account.role !== "SUPERADMIN")) {
      return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batchId");
    if (!batchId) {
      return NextResponse.json({ message: "batchId fehlt." }, { status: 400 });
    }

    const queue = await getNewsletterQueueCollection();
    const [total, sent, failed, pending] = await Promise.all([
      queue.countDocuments({ batchId }),
      queue.countDocuments({ batchId, status: "sent" }),
      queue.countDocuments({ batchId, status: "failed" }),
      queue.countDocuments({ batchId, status: { $in: ["pending", "processing"] } }),
    ]);

    return NextResponse.json({ total, sent, failed, pending });
  } catch (err) {
    console.error("[Newsletter Progress] Fehler:", err);
    return NextResponse.json({ message: "Interner Serverfehler." }, { status: 500 });
  }
}
