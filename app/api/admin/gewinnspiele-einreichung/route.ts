import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

async function getCol() {
  const db = await getDatabase();
  return db.collection<{ _id: string; value: boolean }>("site_settings");
}

export async function GET() {
  const col = await getCol();
  const doc = await col.findOne({ _id: "gewinnspiele_einreichung_aktiv" });
  return NextResponse.json({ aktiv: doc?.value ?? true });
}

export async function PUT(req: Request) {
  const session = await getServerAccount();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ message: "Kein Zugriff" }, { status: 403 });
  }
  const { aktiv } = await req.json() as { aktiv: boolean };
  const col = await getCol();
  await col.updateOne(
    { _id: "gewinnspiele_einreichung_aktiv" },
    { $set: { value: !!aktiv } },
    { upsert: true }
  );
  return NextResponse.json({ ok: true });
}
