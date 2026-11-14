import { NextResponse } from "next/server";
import { lookupBookByIsbn } from "@/lib/book-fetcher";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isbn = searchParams.get("isbn");

    if (!isbn) {
      return NextResponse.json({ message: "Parameter 'isbn' fehlt." }, { status: 400 });
    }

    const data = await lookupBookByIsbn(isbn);
    if (!data) {
      return NextResponse.json({ message: "Keine Buchdaten für diese ISBN gefunden." }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("API /api/books/lookup-isbn Fehler:", error);
    return NextResponse.json({ message: "Serverfehler beim Abrufen der Buchdaten." }, { status: 500 });
  }
}
