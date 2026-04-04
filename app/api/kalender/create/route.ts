import { NextResponse } from "next/server";
import { getKalenderCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { type KalenderCategory, VALID_COUNTRIES } from "@/lib/kalender";
import { awardTerminErstellt } from "@/lib/lesezeichen";

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as {
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
      return NextResponse.json(
        { message: "Titel darf maximal 200 Zeichen lang sein." },
        { status: 400 }
      );
    }

    if (description.length > 3000) {
      return NextResponse.json(
        { message: "Beschreibung darf maximal 3000 Zeichen lang sein." },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { message: "Ungültiges Datumsformat (YYYY-MM-DD erwartet)." },
        { status: 400 }
      );
    }

    if (dateTo && !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
      return NextResponse.json(
        { message: "Ungültiges Enddatumsformat (YYYY-MM-DD erwartet)." },
        { status: 400 }
      );
    }

    if (dateTo && dateTo < date) {
      return NextResponse.json(
        { message: "Das Enddatum darf nicht vor dem Startdatum liegen." },
        { status: 400 }
      );
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

    // Stadt + Land sind Pflicht bei Buchmessen und Lesungen
    if ((category === "Buchmesse" || category === "Lesung") && (!location.city || !location.country)) {
      return NextResponse.json(
        { message: "Bei Buchmessen und Lesungen sind Stadt und Land Pflichtfelder." },
        { status: 400 }
      );
    }

    // Remove undefined values
    if (!location.street) delete location.street;
    if (!location.city) delete location.city;
    if (!location.zipCode) delete location.zipCode;
    if (!location.country) delete location.country;

    const now = new Date();
    const col = await getKalenderCollection();

    const doc = {
      title,
      description,
      category: category as KalenderCategory,
      date,
      dateTo,
      timeFrom,
      timeTo,
      location: Object.keys(location).length > 0 ? location : undefined,
      link,
      createdBy: account.username,
      participants: [account.username],
      createdAt: now,
      updatedAt: now,
    };

    const result = await col.insertOne(doc);

    // Lesezeichen vergeben (max. 5 pro Tag)
    await awardTerminErstellt(account.username);

    return NextResponse.json({
      success: true,
      id: result.insertedId.toString(),
    });
  } catch (err) {
    console.error("Kalender create error:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
