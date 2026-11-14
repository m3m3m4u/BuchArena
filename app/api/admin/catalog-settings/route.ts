import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { getCatalogSettings, updateCatalogSettings, getCatalogStats } from "@/lib/catalog-settings";

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ message: "Nicht autorisiert." }, { status: 403 });
    }

    const [settings, stats] = await Promise.all([
      getCatalogSettings(),
      getCatalogStats(),
    ]);

    return NextResponse.json({ settings, stats });
  } catch (error) {
    console.error("GET /api/admin/catalog-settings Fehler:", error);
    return NextResponse.json({ message: "Fehler beim Laden der Einstellungen." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ message: "Nicht autorisiert." }, { status: 403 });
    }

    const body = await request.json();
    const updated = await updateCatalogSettings({
      hideUnclaimedBooks: typeof body.hideUnclaimedBooks === "boolean" ? body.hideUnclaimedBooks : undefined,
      hideUnclaimedAuthors: typeof body.hideUnclaimedAuthors === "boolean" ? body.hideUnclaimedAuthors : undefined,
    });

    const stats = await getCatalogStats();

    return NextResponse.json({
      message: "Katalog-Einstellungen erfolgreich gespeichert.",
      settings: updated,
      stats,
    });
  } catch (error) {
    console.error("PUT /api/admin/catalog-settings Fehler:", error);
    return NextResponse.json({ message: "Fehler beim Speichern der Einstellungen." }, { status: 500 });
  }
}
