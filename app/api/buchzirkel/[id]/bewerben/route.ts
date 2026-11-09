import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import {
  getBuchzirkelCollection,
  getBuchzirkelBewerbungenCollection,
  getUsersCollection,
} from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { sendMail } from "@/lib/mail";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
    }

    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const collection = await getBuchzirkelCollection();
    const zirkel = await collection.findOne(
      { _id: new ObjectId(id) },
      { projection: { titel: 1, status: 1, veranstalterUsername: 1, agbPflicht: 1, bewerbungsFragen: 1 } }
    );

    if (!zirkel) {
      return NextResponse.json({ message: "Buchzirkel nicht gefunden." }, { status: 404 });
    }
    if (zirkel.status !== "bewerbung") {
      return NextResponse.json({ message: "Bewerbungsphase ist nicht aktiv." }, { status: 400 });
    }
    if (zirkel.veranstalterUsername === account.username) {
      return NextResponse.json({ message: "Du kannst dich nicht selbst für deinen Zirkel bewerben." }, { status: 400 });
    }

    // Testleser-Profil Pflicht
    const users = await getUsersCollection();
    const user = await users.findOne(
      { username: account.username },
      { projection: { testleserProfile: 1 } }
    );
    if (!user?.testleserProfile) {
      return NextResponse.json(
        { message: "Bitte fülle zuerst dein Testleser-Profil aus, um dich zu bewerben." },
        { status: 400 }
      );
    }

    const bewerbungen = await getBuchzirkelBewerbungenCollection();

    // Doppelte Bewerbung verhindern
    const existing = await bewerbungen.findOne({
      buchzirkelId: new ObjectId(id),
      bewerberUsername: account.username,
    });
    if (existing) {
      return NextResponse.json({ message: "Du hast dich bereits beworben." }, { status: 409 });
    }

    const body = (await request.json()) as {
      antworten?: { frageIndex: number; antwort: string }[];
      agbAkzeptiert?: boolean;
      kontaktHandynummer?: string;
      kontaktEmail?: string;
    };

    if (zirkel.agbPflicht && !body.agbAkzeptiert) {
      return NextResponse.json(
        { message: "Du musst die Verschwiegenheitserklärung akzeptieren." },
        { status: 400 }
      );
    }

    const now = new Date();
    // Kontaktdaten sanitieren (optional, nur alphanumerisch/übliche Zeichen, max. Länge)
    const rawHandy = typeof body.kontaktHandynummer === "string" ? body.kontaktHandynummer.trim().slice(0, 30) : undefined;
    const rawEmail = typeof body.kontaktEmail === "string" ? body.kontaktEmail.trim().slice(0, 200) : undefined;
    await bewerbungen.insertOne({
      buchzirkelId: new ObjectId(id),
      bewerberUsername: account.username,
      status: "ausstehend",
      antworten: body.antworten ?? [],
      agbAkzeptiert: body.agbAkzeptiert ?? false,
      agbAkzeptiertAt: body.agbAkzeptiert ? now : undefined,
      kontaktHandynummer: rawHandy || undefined,
      kontaktEmail: rawEmail || undefined,
      bewirbtSichAm: now,
    });

    // E-Mail-Benachrichtigung an den Veranstalter
    const veranstalter = await users.findOne(
      { username: zirkel.veranstalterUsername },
      { projection: { email: 1 } }
    );
    if (veranstalter?.email) {
      const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://bucharena.org").replace(/\/+$/, "");
      sendMail(
        veranstalter.email,
        `📬 Neue Bewerbung für deinen Buchzirkel „${zirkel.titel}"`,
        `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
          <h2 style="color: #1d4ed8;">📬 Neue Bewerbung eingegangen</h2>
          <p>Hallo ${zirkel.veranstalterUsername},</p>
          <p><strong>${account.username}</strong> hat sich soeben für deinen Buchzirkel <strong>„${zirkel.titel}"</strong> beworben.</p>
          <p>Im Dashboard kannst du die Antworten auf deine Bewerbungsfragen einsehen und entscheiden, wer teilnehmen darf.</p>
          <p style="margin-top: 24px;">
            <a href="${baseUrl}/buchzirkel/${id}/dashboard"
               style="background: #1d4ed8; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Zum Dashboard →
            </a>
          </p>
          <p style="font-size: 12px; color: #666; margin-top: 32px;">
            Diese E-Mail wurde automatisch von BuchArena gesendet.
          </p>
        </div>
        `
      ).catch((mailErr) => {
        console.error("Fehler beim Senden der Bewerbungs-Benachrichtigung:", mailErr);
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("buchzirkel/[id]/bewerben:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
