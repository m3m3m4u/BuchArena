import { NextResponse } from "next/server";
import { getBucharenaSubmissionsCollection } from "@/lib/bucharena-db";
import { getServerAccount } from "@/lib/server-auth";

export const runtime = "nodejs";

/**
 * GET /api/bucharena/submissions/my
 * Returns all submissions for the currently logged-in user.
 */
export async function GET(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account?.username) {
      return NextResponse.json(
        { success: false, error: "Nicht eingeloggt" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get("type");

    const col = await getBucharenaSubmissionsCollection();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = { submittedBy: account.username };
    if (typeFilter === "reel") {
      query.type = "reel";
    } else if (typeFilter === "vorlage") {
      query.$or = [{ type: "vorlage" }, { type: { $exists: false } }];
    }

    const submissions = await col
      .find(query)
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
