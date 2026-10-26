import { NextResponse } from "next/server";
import { getServerAccount } from "@/lib/server-auth";
import { awardQuizTag } from "@/lib/lesezeichen";

/* POST – Quiztag vergeben (1x pro Tag), sobald ein Quiz gestartet wird */
export async function POST() {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }
    const lesezeichen = await awardQuizTag(account.username);
    return NextResponse.json({ lesezeichen });
  } catch (err) {
    console.error("POST /api/quiz/tag error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
