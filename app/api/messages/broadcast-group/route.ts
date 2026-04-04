import { NextResponse } from "next/server";
import { getUsersCollection, getMessagesCollection } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/server-auth";

export type BroadcastGroup =
  | "all"
  | "autoren"
  | "sprecher"
  | "blogger"
  | "testleser"
  | "lektoren"
  | "verlage";

type Payload = {
  group?: BroadcastGroup;
  subject?: string;
  body?: string;
};

function hasName(profile: unknown): boolean {
  if (!profile || typeof profile !== "object") return false;
  const p = profile as Record<string, unknown>;
  const name = p.name as { value?: string } | undefined;
  return !!(name?.value?.trim());
}

/**
 * POST /api/messages/broadcast-group
 * Sendet eine Nachricht an alle aktiven Nutzer einer Gruppe (nur Admin/SuperAdmin).
 */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json(
        { message: "Nur Admins dürfen Gruppen-Nachrichten senden." },
        { status: 403 },
      );
    }

    const payload = (await request.json()) as Payload;
    const group: BroadcastGroup = payload.group ?? "all";
    const subject = (payload.subject ?? "").trim();
    const body = (payload.body ?? "").trim();

    if (!subject) return NextResponse.json({ message: "Betreff fehlt." }, { status: 400 });
    if (!body) return NextResponse.json({ message: "Nachricht fehlt." }, { status: 400 });
    if (subject.length > 200) return NextResponse.json({ message: "Betreff zu lang (max. 200 Zeichen)." }, { status: 400 });
    if (body.length > 5000) return NextResponse.json({ message: "Nachricht zu lang (max. 5000 Zeichen)." }, { status: 400 });

    const users = await getUsersCollection();

    // Basis-Filter: aktiv, nicht der Admin selbst
    const baseFilter: Record<string, unknown> = {
      username: { $ne: admin.username },
      status: { $ne: "deactivated" },
    };

    // Gruppen-spezifischer Filter
    const groupFilter: Record<string, unknown> =
      group === "autoren"
        ? { "profile.name.value": { $exists: true, $ne: "" } }
        : group === "sprecher"
        ? { "speakerProfile.name.value": { $exists: true, $ne: "" } }
        : group === "blogger"
        ? { "bloggerProfile.name.value": { $exists: true, $ne: "" } }
        : group === "testleser"
        ? { "testleserProfile.name.value": { $exists: true, $ne: "" } }
        : group === "lektoren"
        ? { "lektorenProfile.name.value": { $exists: true, $ne: "" } }
        : group === "verlage"
        ? { "verlageProfile.name.value": { $exists: true, $ne: "" } }
        : {}; // "all"

    const allUsers = await users
      .find(
        { ...baseFilter, ...groupFilter },
        { projection: { username: 1 } },
      )
      .toArray();

    if (allUsers.length === 0) {
      return NextResponse.json({ message: "Keine Empfänger in dieser Gruppe." }, { status: 400 });
    }

    const messages = await getMessagesCollection();
    const now = new Date();

    const docs = allUsers.map((u) => ({
      senderUsername: admin.username,
      recipientUsername: u.username,
      subject,
      body,
      read: false,
      deletedBySender: false,
      deletedByRecipient: false,
      broadcast: true,
      createdAt: now,
    }));

    await messages.insertMany(docs);

    return NextResponse.json({
      message: `Nachricht an ${allUsers.length} Empfänger gesendet.`,
      count: allUsers.length,
    });
  } catch (err) {
    console.error("POST /api/messages/broadcast-group error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
