import { NextResponse } from "next/server";
import { getUsersCollection, getBooksCollection, getMessagesCollection } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/server-auth";

function hasFilledProfile(profile: Record<string, unknown> | undefined | null): boolean {
  if (!profile) return false;
  const name = profile.name as { value?: string } | undefined;
  return !!(name?.value?.trim());
}

function hasFilledSpeakerProfile(sp: Record<string, unknown> | undefined | null): boolean {
  if (!sp) return false;
  const name = sp.name as { value?: string } | undefined;
  return !!(name?.value?.trim());
}

function hasFilledBloggerProfile(bp: Record<string, unknown> | undefined | null): boolean {
  if (!bp) return false;
  const name = bp.name as { value?: string } | undefined;
  return !!(name?.value?.trim());
}

function hasFilledTestleserProfile(tp: Record<string, unknown> | undefined | null): boolean {
  if (!tp) return false;
  const name = tp.name as { value?: string } | undefined;
  return !!(name?.value?.trim());
}

function hasFilledLektorenProfile(lp: Record<string, unknown> | undefined | null): boolean {
  if (!lp) return false;
  const name = lp.name as { value?: string } | undefined;
  return !!(name?.value?.trim());
}

export async function POST() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json(
        { message: "Kein Zugriff auf die User-Übersicht." },
        { status: 403 }
      );
    }

    const users = await getUsersCollection();

    const list = await users
      .find(
        {},
        {
          projection: {
            _id: 0,
            username: 1,
            email: 1,
            role: 1,
            status: 1,
            createdAt: 1,
            lastOnline: 1,
            profile: 1,
            speakerProfile: 1,
            bloggerProfile: 1,
            testleserProfile: 1,
            lektorenProfile: 1,
            newsletterOptIn: 1,
            spamFlagged: 1,
            spamReportCount: 1,
            spamWhitelisted: 1,
          },
        }
      )
      .sort({ username: 1 })
      .limit(2000)
      .toArray();

    // Bücher pro User zählen
    const booksCol = await getBooksCollection();
    const bookCounts = await booksCol
      .aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$ownerUsername", count: { $sum: 1 } } },
      ])
      .toArray();
    const bookCountMap = new Map(bookCounts.map((b) => [b._id, b.count]));

    // Nachrichten-Aktivität pro Absender aggregieren (Anzahl unterschiedlicher Empfänger)
    const messagesCol = await getMessagesCollection();
    const messageStats = await messagesCol
      .aggregate<{ _id: string; distinctRecipients: number }>([
        { $match: { broadcast: { $ne: true } } },
        {
          $group: {
            _id: { sender: "$senderUsername", recipient: "$recipientUsername" },
          },
        },
        {
          $group: {
            _id: "$_id.sender",
            distinctRecipients: { $sum: 1 },
          },
        },
      ])
      .toArray();
    const recipientCountMap = new Map(messageStats.map((s) => [s._id, s.distinctRecipients]));

    const result = list.map((u) => {
      const profile = u.profile as Record<string, unknown> | undefined;
      const profileName = (profile?.name as { value?: string } | undefined)?.value?.trim() ?? "";
      const speakerProfile = u.speakerProfile as Record<string, unknown> | undefined;
      const speakerName = (speakerProfile?.name as { value?: string } | undefined)?.value?.trim() ?? "";

      const hasProf = hasFilledProfile(profile);
      const hasSpk = hasFilledSpeakerProfile(speakerProfile);
      const hasBlog = hasFilledBloggerProfile(u.bloggerProfile as Record<string, unknown> | undefined);
      const hasTest = hasFilledTestleserProfile(u.testleserProfile as Record<string, unknown> | undefined);
      const hasLekt = hasFilledLektorenProfile(u.lektorenProfile as Record<string, unknown> | undefined);
      const hasAnyProfile = hasProf || hasSpk || hasBlog || hasTest || hasLekt;

      const bookCount = bookCountMap.get(u.username) ?? 0;
      const distinctRecipients = recipientCountMap.get(u.username) ?? 0;
      const spamReportCount = ((u as Record<string, unknown>).spamReportCount as number | undefined) ?? 0;
      const spamFlagged = !!(u as Record<string, unknown>).spamFlagged;
      const spamWhitelisted = !!(u as Record<string, unknown>).spamWhitelisted;

      // Verdachtskriterien:
      // - Nicht bereits freigesprochen
      // - Bereist als Spammer markiert
      // - Oder von Nutzern gemeldet
      // - Oder kein einziges Profil & keine Bücher, aber hat >= 2 unterschiedliche Nutzer angeschrieben
      const isSpamSuspect =
        !spamWhitelisted &&
        (spamFlagged ||
          spamReportCount > 0 ||
          (!hasAnyProfile && bookCount === 0 && distinctRecipients >= 2));

      return {
        username: u.username,
        email: u.email,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt ?? null,
        lastOnline: u.lastOnline ?? null,
        profileName: profileName || speakerName || "",
        hasProfile: hasProf,
        hasSpeakerProfile: hasSpk,
        hasBloggerProfile: hasBlog,
        hasTestleserProfile: hasTest,
        hasLektorenProfile: hasLekt,
        bookCount,
        distinctRecipients,
        spamReportCount,
        spamFlagged,
        spamWhitelisted,
        isSpamSuspect,
        newsletterOptIn: !!(u as Record<string, unknown>).newsletterOptIn,
      };
    });

    return NextResponse.json({ users: result });
  } catch {
    return NextResponse.json(
      { message: "User-Übersicht konnte nicht geladen werden." },
      { status: 500 }
    );
  }
}
