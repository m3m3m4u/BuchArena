import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getTauschBewerbungenCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

export async function GET(request: NextRequest) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const tauschId = request.nextUrl.searchParams.get("tauschId")?.trim();
    const meine = request.nextUrl.searchParams.get("meine") === "1";

    const col = await getTauschBewerbungenCollection();

    if (meine) {
      // Eigene Bewerbungen des eingeloggten Users
      const docs = await col
        .find({ bewerberUsername: account.username })
        .sort({ createdAt: -1 })
        .toArray();

      return NextResponse.json({
        bewerbungen: docs.map((d) => ({
          id: d._id!.toString(),
          tauschId: d.tauschId.toString(),
          tauschAuthorUsername: d.tauschAuthorUsername,
          nachricht: d.nachricht,
          status: d.status,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        })),
      });
    }

    if (tauschId) {
      if (!ObjectId.isValid(tauschId)) {
        return NextResponse.json({ message: "Ungueltige Tausch-ID." }, { status: 400 });
      }

      // Nur der Inserent oder Admin darf alle Bewerbungen sehen
      const docs = await col
        .find({ tauschId: new ObjectId(tauschId) })
        .sort({ createdAt: -1 })
        .toArray();

      // Sicherheitscheck: Nur Inserent oder Admin
      const isOwnerOrAdmin =
        account.role === "SUPERADMIN" ||
        account.role === "ADMIN" ||
        docs.some((d) => d.tauschAuthorUsername === account.username);

      if (!isOwnerOrAdmin && docs.length > 0) {
        return NextResponse.json({ message: "Keine Berechtigung." }, { status: 403 });
      }

      return NextResponse.json({
        bewerbungen: docs.map((d) => ({
          id: d._id!.toString(),
          tauschId: d.tauschId.toString(),
          bewerberUsername: d.bewerberUsername,
          nachricht: d.nachricht,
          status: d.status,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        })),
      });
    }

    return NextResponse.json({ message: "Parameter fehlt." }, { status: 400 });
  } catch {
    return NextResponse.json({ message: "Bewerbungen konnten nicht geladen werden." }, { status: 500 });
  }
}
