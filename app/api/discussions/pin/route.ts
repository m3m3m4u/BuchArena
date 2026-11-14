import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDiscussionsCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as {
      id?: string;
      pinned?: boolean;
    };

    const id = body.id?.trim();
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Ungültige Diskussions-ID." },
        { status: 400 }
      );
    }

    const discussions = await getDiscussionsCollection();
    const doc = await discussions.findOne({ _id: new ObjectId(id) });
    if (!doc) {
      return NextResponse.json(
        { message: "Diskussion nicht gefunden." },
        { status: 404 }
      );
    }

    const isAdmin = account.role === "ADMIN" || account.role === "SUPERADMIN";
    const isAuthor =
      doc.authorUsername.toLowerCase() === account.username.toLowerCase();

    if (!isAdmin && !isAuthor) {
      return NextResponse.json(
        { message: "Keine Berechtigung zum Anpinnen dieser Diskussion." },
        { status: 403 }
      );
    }

    const targetPinned =
      typeof body.pinned === "boolean" ? body.pinned : !Boolean(doc.isPinned);

    if (targetPinned) {
      await discussions.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            isPinned: true,
            pinnedAt: new Date(),
            pinnedBy: account.username,
          },
        }
      );
    } else {
      await discussions.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            isPinned: false,
          },
          $unset: {
            pinnedAt: "",
            pinnedBy: "",
          },
        }
      );
    }

    return NextResponse.json({
      success: true,
      isPinned: targetPinned,
      message: targetPinned
        ? "Thema erfolgreich oben angepinnt."
        : "Thema erfolgreich oben gelöst.",
    });
  } catch {
    return NextResponse.json(
      { message: "Fehler beim Anpinnen/Lösen des Themas." },
      { status: 500 }
    );
  }
}
