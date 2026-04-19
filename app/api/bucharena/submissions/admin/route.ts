import { NextResponse } from "next/server";
import { getBucharenaSubmissionsCollection } from "@/lib/bucharena-db";
import { requireSuperAdmin } from "@/lib/server-auth";
import { getUsersCollection } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Keine Berechtigung" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const query: Record<string, unknown> = { status: { $ne: "withdrawn" } };
    if (status && ["pending", "approved", "rejected", "done"].includes(status)) query.status = status;
    if (type === "reel") query.type = "reel";
    else if (type === "standard") query.type = { $ne: "reel" };
    else if (!type) query.type = { $ne: "reel" }; // default: exclude reels from main list

    const col = await getBucharenaSubmissionsCollection();
    const submissions = await col.find(query).sort({ createdAt: -1 }).toArray();

    // Look up Instagram accounts from author profiles
    const usernames = [...new Set(submissions.map((s) => s.submittedBy as string).filter(Boolean))];
    const igMap = new Map<string, string>();
    if (usernames.length > 0) {
      const users = await getUsersCollection();
      const docs = await users
        .find({ username: { $in: usernames } })
        .project({ username: 1, "profile.socialInstagram.value": 1 })
        .toArray();
      for (const u of docs) {
        const ig = (u.profile as Record<string, { value?: string }> | undefined)?.socialInstagram?.value?.trim();
        if (ig) igMap.set(u.username as string, ig);
      }
    }

    const enriched = submissions.map((s) => ({
      ...s,
      authorInstagram: igMap.get(s.submittedBy as string) || null,
    }));

    return NextResponse.json({ success: true, submissions: enriched });
  } catch (error) {
    console.error("Fehler:", error);
    return NextResponse.json({ success: false, error: "Interner Serverfehler" }, { status: 500 });
  }
}
