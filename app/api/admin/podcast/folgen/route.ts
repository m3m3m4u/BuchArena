import { NextResponse } from "next/server";
import { getServerAccount } from "@/lib/server-auth";
import {
  getPodcastFolgenCollection,
  mapResolvedLinkedProfiles,
  resolvePodcastLinkedProfiles,
} from "@/lib/podcast";

function isAdmin(role: string) {
  return role === "ADMIN" || role === "SUPERADMIN";
}

/** GET /api/admin/podcast/folgen – alle Folgen inkl. unveröffentlichte */
export async function GET() {
  const account = await getServerAccount();
  if (!account || !isAdmin(account.role)) {
    return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
  }

  try {
    const col = await getPodcastFolgenCollection();
    const folgen = await col
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    const resolvedMap = await resolvePodcastLinkedProfiles(folgen);
    return NextResponse.json({
      folgen: folgen.map((f) => ({
        _id: f._id!.toString(),
        title: f.title,
        text: f.text,
        youtubeUrl: f.youtubeUrl,
        audioUrl: f.audioUrl ?? "",
        audioFileName: f.audioFileName ?? "",
        audioFileSize: f.audioFileSize ?? 0,
        coverUrl: f.coverUrl ?? "",
        linkedProfiles: mapResolvedLinkedProfiles(f.linkedProfiles, resolvedMap),
        published: f.published,
        views: f.views ?? 0,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
    });
  } catch {
    return NextResponse.json({ folgen: [] });
  }
}
