import { NextResponse } from "next/server";
import { getServerAccount } from "@/lib/server-auth";
import {
  getLesezeichenTotal,
  getOrCreateDoc,
  getLesezeichenCollection,
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
      hideFromHighscores: !!doc.hideFromHighscores,
    });
  } catch (err) {
    console.error("GET /api/lesezeichen error:", err);
    return NextResponse.json(
      { message: "Interner Fehler." },
      { status: 500 },
    );
  }
}

/** POST /api/lesezeichen – hideFromHighscores setzen */
export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json(
        { message: "Nicht angemeldet." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as { hideFromHighscores?: boolean };
    const hide = !!body.hideFromHighscores;

    const col = await getLesezeichenCollection();
    await col.updateOne(
      { username: account.username },
      { $set: { hideFromHighscores: hide, updatedAt: new Date() } },
      { upsert: true },
    );

    return NextResponse.json({ success: true, hideFromHighscores: hide });
  } catch (err) {
    console.error("POST /api/lesezeichen error:", err);
    return NextResponse.json(
      { message: "Interner Fehler." },
      { status: 500 },
    );
  }
}
