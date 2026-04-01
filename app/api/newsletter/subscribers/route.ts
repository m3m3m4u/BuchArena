import { NextResponse } from "next/server";
import { getServerAccount } from "@/lib/server-auth";
import { getSubscribersCollection } from "@/lib/newsletter";

/** GET /api/newsletter/subscribers – Liste aller Abonnenten (nur Admin) */
export async function GET() {
  try {
    const account = await getServerAccount();
    if (!account || (account.role !== "ADMIN" && account.role !== "SUPERADMIN")) {
      return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
    }

    const col = await getSubscribersCollection();
    const subscribers = await col
      .find({}, { projection: { email: 1, status: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ subscribers });
  } catch (err) {
    console.error("[Newsletter API] GET /subscribers Fehler:", err);
    return NextResponse.json({ message: "Interner Serverfehler." }, { status: 500 });
  }
}

/** POST /api/newsletter/subscribers – Neuen Abonnenten hinzufügen */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: "Gültige E-Mail-Adresse erforderlich." }, { status: 400 });
    }

    const col = await getSubscribersCollection();

    const existing = await col.findOne({ email });
    if (existing) {
      if (existing.status === "active") {
        return NextResponse.json({ message: "Diese E-Mail ist bereits abonniert." }, { status: 409 });
      }
      // Reaktivieren
      await col.updateOne({ email }, { $set: { status: "active" }, $unset: { unsubscribedAt: "" } });
      return NextResponse.json({ message: "Abonnement reaktiviert." });
    }

    await col.insertOne({ email, status: "active", createdAt: new Date() });
    return NextResponse.json({ message: "Erfolgreich abonniert." }, { status: 201 });
  } catch (err) {
    console.error("[Newsletter API] POST /subscribers Fehler:", err);
    return NextResponse.json({ message: "Interner Serverfehler." }, { status: 500 });
  }
}
