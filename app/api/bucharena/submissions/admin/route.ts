import { NextResponse } from "next/server";
import { getBucharenaSubmissionsCollection, getBucharenaReelVorlagenCollection } from "@/lib/bucharena-db";
import { requireAdmin } from "@/lib/server-auth";
import { getUsersCollection } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
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

    // Look up Instagram accounts from author profiles (check both username and email)
    const usernames = [...new Set(submissions.map((s) => s.submittedBy as string).filter(Boolean))];
    const igMap = new Map<string, string>();
    if (usernames.length > 0) {
      const users = await getUsersCollection();
      const docs = await users
        .find({
          $or: [{ username: { $in: usernames } }, { email: { $in: usernames } }],
        })
        .project({ username: 1, email: 1, "profile.socialInstagram.value": 1 })
        .toArray();
      for (const u of docs) {
        const ig = (u.profile as Record<string, { value?: string }> | undefined)?.socialInstagram?.value?.trim();
        if (ig) {
          if (u.username) igMap.set(u.username as string, ig);
          if (u.email) igMap.set(u.email as string, ig);
        }
      }
    }

    // For reel submissions, look up associated vorlagen metadata (without large images)
    let vorlageMap = new Map<string, Record<string, unknown>>();
    if (type === "reel" || submissions.some((s) => s.type === "reel")) {
      const subIds = submissions.map((s) => s._id.toString());
      const vorlagenCol = await getBucharenaReelVorlagenCollection();
      const vorlagen = await vorlagenCol
        .find({ submissionId: { $in: subIds } })
        .project({
          submissionId: 1,
          thema: 1,
          hauptfigur: 1,
          inhalte: 1,
          autorHerkunft: 1,
          autorBeruf: 1,
          autorStil: 1,
          erscheinungsjahr: 1,
          verlag: 1,
          coverDesign: 1,
          hintergrund: 1,
          geschlecht: 1,
          notiz: 1,
          beschreibung: 1,
        })
        .toArray();
      vorlageMap = new Map(vorlagen.map((v) => [v.submissionId as string, v as Record<string, unknown>]));
    }

    const enriched = submissions.map((s) => {
      const sid = s._id.toString();
      const v = vorlageMap.get(sid);
      return {
        ...s,
        authorInstagram: igMap.get(s.submittedBy as string) || null,
        vorlage: v
          ? {
              thema: v.thema,
              hauptfigur: v.hauptfigur,
              inhalte: v.inhalte,
              autorHerkunft: v.autorHerkunft,
              autorBeruf: v.autorBeruf,
              autorStil: v.autorStil,
              erscheinungsjahr: v.erscheinungsjahr,
              verlag: v.verlag,
              coverDesign: v.coverDesign,
              hintergrund: v.hintergrund,
            }
          : null,
      };
    });

    return NextResponse.json({ success: true, submissions: enriched });
  } catch (error) {
    console.error("Fehler:", error);
    return NextResponse.json({ success: false, error: "Interner Serverfehler" }, { status: 500 });
  }
}
