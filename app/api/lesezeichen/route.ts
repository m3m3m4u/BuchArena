import { NextResponse } from "next/server";
import { getServerAccount } from "@/lib/server-auth";
import {
  getLesezeichenTotal,
  getOrCreateDoc,
} from "@/lib/lesezeichen";

/** GET /api/lesezeichen – Eigenen Stand abrufen */
export async function GET() {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json(
        { message: "Nicht angemeldet." },
        { status: 401 },
      );
    }

    const doc = await getOrCreateDoc(account.username);

    return NextResponse.json({
      total: doc.total,
      loginDays: doc.loginDays.length,
      quizDays: doc.quizDays.length,
      treffpunktDays: doc.treffpunktDays.length,
    });
  } catch (err) {
    console.error("GET /api/lesezeichen error:", err);
    return NextResponse.json(
      { message: "Interner Fehler." },
      { status: 500 },
    );
  }
}
