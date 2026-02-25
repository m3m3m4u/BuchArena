import { NextResponse } from "next/server";
import { parseBuchArenaCSV } from "@/lib/bucharena-types";
import { headers } from "next/headers";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const headersList = await headers();
    const host = headersList.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const csvUrl = `${protocol}://${host}/data/bucharena.csv`;

    const csvResponse = await fetch(csvUrl, { next: { revalidate: 60 } });
    if (!csvResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            "BuchArena CSV-Datei nicht gefunden. Bitte lege die Datei unter public/data/bucharena.csv ab.",
        },
        { status: 404 }
      );
    }

    const csvContent = await csvResponse.text();
    const books = parseBuchArenaCSV(csvContent);

    const { searchParams } = new URL(request.url);
    const buchId = searchParams.get("id");

    if (buchId) {
      const book = books.find((b) => b.id === buchId);
      if (!book) {
        return NextResponse.json(
          { success: false, error: "Buch nicht gefunden" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, book });
    }

    return NextResponse.json({ success: true, books });
  } catch (error) {
    console.error("Fehler beim Laden der BuchArena:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unbekannter Fehler",
      },
      { status: 500 }
    );
  }
}
