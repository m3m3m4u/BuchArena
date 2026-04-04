import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getKalenderCollection } from "@/lib/mongodb";
import { getServerAccount, requireAdmin } from "@/lib/server-auth";
import { type KalenderCategory, VALID_COUNTRIES } from "@/lib/kalender";

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as {
      id?: string;
      title?: string;
      description?: string;
      category?: string;
      date?: string;
      dateTo?: string;
      timeFrom?: string;
      timeTo?: string;
      locationStreet?: string;
      locationCity?: string;
      locationZipCode?: string;
      locationCountry?: string;
      link?: string;
    };

    if (!body.id || !ObjectId.isValid(body.id)) {
      return NextResponse.json({ message: "Ungültige Termin-ID." }, { status: 400 });
    }

    const col = await getKalenderCollection();
    const existing = await col.findOne({ _id: new ObjectId(body.id) });

    if (!existing) {
      return NextResponse.json({ message: "Termin nicht gefunden." }, { status: 404 });
    }

    // Only creator or admin may edit
    const isAdmin = !!(await requireAdmin());
    if (existing.createdBy !== account.username && !isAdmin) {
      return NextResponse.json({ message: "Keine Berechtigung." }, { status: 403 });
    }

    const title = body.title?.trim();
    const description = body.description?.trim();
    const category = body.category?.trim();
    const date = body.date?.trim();
    const dateTo = body.dateTo?.trim() || undefined;
    const timeFrom = body.timeFrom?.trim() || undefined;
    const timeTo = body.timeTo?.trim() || undefined;

    if (!title || !description || !date || !category) {
      return NextResponse.json(
        { message: "Titel, Beschreibung, Kategorie und Datum sind erforderlich." },
        { status: 400 }
      );
    }

    const validCategories: KalenderCategory[] = ["Buchmesse", "Lesung", "Release", "Sonstiges"];
    if (!validCategories.includes(category as KalenderCategory)) {
      return NextResponse.json(
        { message: "Ungültige Kategorie." },
        { status: 400 }
      );
    }

    if (title.length > 200) {
      return NextResponse.json({ message: "Titel darf maximal 200 Zeichen lang sein." }, { status: 400 });
    }

    if (description.length > 3000) {
      return NextResponse.json({ message: "Beschreibung darf maximal 3000 Zeichen lang sein." }, { status: 400 });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ message: "Ungültiges Datumsformat." }, { status: 400 });
    }

    if (dateTo && !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
      return NextResponse.json({ message: "Ungültiges Enddatumsformat." }, { status: 400 });
    }

    if (dateTo && dateTo < date) {
      return NextResponse.json({ message: "Das Enddatum darf nicht vor dem Startdatum liegen." }, { status: 400 });
    }

    if (timeFrom && !/^\d{2}:\d{2}$/.test(timeFrom)) {
      return NextResponse.json({ message: "Ungültiges Zeitformat für 'von'." }, { status: 400 });
    }

    if (timeTo && !/^\d{2}:\d{2}$/.test(timeTo)) {
      return NextResponse.json({ message: "Ungültiges Zeitformat für 'bis'." }, { status: 400 });
    }

    const link = body.link?.trim() || undefined;
    if (link && link.length > 500) {
      return NextResponse.json({ message: "Link darf maximal 500 Zeichen lang sein." }, { status: 400 });
    }
    if (link && !/^https?:\/\//i.test(link)) {
      return NextResponse.json({ message: "Link muss mit http:// oder https:// beginnen." }, { status: 400 });
    }

    const location = {
      street: body.locationStreet?.trim() || undefined,
      city: body.locationCity?.trim() || undefined,
      zipCode: body.locationZipCode?.trim() || undefined,
      country: body.locationCountry?.trim() || undefined,
    };

    if (location.country && !(VALID_COUNTRIES as readonly string[]).includes(location.country)) {
      return NextResponse.json({ message: "Ungültiges Land." }, { status: 400 });
    }

    // Remove undefined values
    if (!location.street) delete location.street;
    if (!location.city) delete location.city;
    if (!location.zipCode) delete location.zipCode;
    if (!location.country) delete location.country;

    const $set: Record<string, unknown> = {
      title,
      description,
      category: category as KalenderCategory,
      date,
      timeFrom,
      timeTo,
      location: Object.keys(location).length > 0 ? location : undefined,
      updatedAt: new Date(),
    };
    if (dateTo) $set.dateTo = dateTo;
    if (link) $set.link = link;

    const update: Record<string, unknown> = { $set };
    const $unset: Record<string, string> = {};
    if (!link) $unset.link = "";
    if (!dateTo) $unset.dateTo = "";
    if (Object.keys($unset).length > 0) update.$unset = $unset;

    await col.updateOne({ _id: new ObjectId(body.id) }, update);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Kalender update error:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
