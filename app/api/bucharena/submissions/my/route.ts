import { NextResponse } from "next/server";
import { getBucharenaSubmissionsCollection } from "@/lib/bucharena-db";
import { getServerAccount } from "@/lib/server-auth";

export const runtime = "nodejs";

/**
 * GET /api/bucharena/submissions/my
 * Returns all submissions for the currently logged-in user.
 */
export async function GET() {
  try {
    const account = await getServerAccount();
    if (!account?.username) {
      return NextResponse.json(
        { success: false, error: "Nicht eingeloggt" },
        { status: 401 },
      );
    }

    const col = await getBucharenaSubmissionsCollection();
    const submissions = await col
      .find({ submittedBy: account.username })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ success: true, submissions });
  } catch (error) {
    console.error("Fehler:", error);
    return NextResponse.json(
      { success: false, error: "Interner Serverfehler" },
      { status: 500 },
    );
  }
}
