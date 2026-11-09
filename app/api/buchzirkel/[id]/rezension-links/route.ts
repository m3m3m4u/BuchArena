import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import {
  getBuchzirkelTeilnahmenCollection,
} from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

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

    const teilnahmen = await getBuchzirkelTeilnahmenCollection();
    const teilnahme = await teilnahmen.findOne({
      buchzirkelId: new ObjectId(id),
      teilnehmerUsername: account.username,
    });

    if (!teilnahme) {
      return NextResponse.json({ message: "Du nimmst nicht an diesem Zirkel teil." }, { status: 403 });
    }

    const body = (await request.json()) as {
      plattform?: string;
      url?: string;
    };

    const plattform = body.plattform?.trim();
    const url = body.url?.trim();

    if (!plattform || !url) {
      return NextResponse.json({ message: "Plattform und URL sind erforderlich." }, { status: 400 });
    }

    // Einfache URL-Validierung
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ message: "Ungültige URL." }, { status: 400 });
    }

    await teilnahmen.updateOne(
      { buchzirkelId: new ObjectId(id), teilnehmerUsername: account.username },
      {
        $push: {
          rezensionsLinks: { plattform, url, eingetragen: new Date() },
        },
      }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("buchzirkel/[id]/rezension-links POST:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}

export async function DELETE(
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

    const body = (await request.json()) as { url?: string };
    const url = body.url?.trim();
    if (!url) {
      return NextResponse.json({ message: "URL fehlt." }, { status: 400 });
    }

    const teilnahmen = await getBuchzirkelTeilnahmenCollection();
    await teilnahmen.updateOne(
      { buchzirkelId: new ObjectId(id), teilnehmerUsername: account.username },
      {
        $pull: {
          rezensionsLinks: { url },
        },
      }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("buchzirkel/[id]/rezension-links DELETE:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
