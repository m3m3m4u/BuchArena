import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getBucharenaSprecherCollection } from "@/lib/bucharena-db";
import { requireSuperAdmin } from "@/lib/server-auth";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const col = await getBucharenaSprecherCollection();
    const text = await col.findOne({ _id: new ObjectId(id) });
    if (!text) return NextResponse.json({ success: false, error: "Text nicht gefunden" }, { status: 404 });
    return NextResponse.json({ success: true, text });
  } catch (error) {
    console.error("Fehler beim Laden:", error);
    return NextResponse.json({ success: false, error: "Fehler beim Laden" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const col = await getBucharenaSprecherCollection();
    const text = await col.findOne({ _id: new ObjectId(id) });
    if (!text) return NextResponse.json({ success: false, error: "Text nicht gefunden" }, { status: 404 });

    const updateDoc: Record<string, unknown> = { updatedAt: new Date() };

    if (body.sprecherName !== undefined) {
      updateDoc.sprecherName = body.sprecherName;
      if (body.sprecherName && !text.bookedAt) {
        updateDoc.bookedAt = new Date();
        updateDoc.status = "gebucht";
      } else if (!body.sprecherName) {
        updateDoc.bookedAt = null;
        if (text.mp3Files.length === 0) {
          updateDoc.status = "offen";
        }
      }
    }

    if (body.status !== undefined) {
      const admin = await requireSuperAdmin();
      if (!admin) return NextResponse.json({ success: false, error: "Nur Administratoren können den Status ändern" }, { status: 403 });
      if (["offen", "gebucht", "erledigt"].includes(body.status)) {
        updateDoc.status = body.status;
        if (body.status === "offen") {
          updateDoc.sprecherName = null;
          updateDoc.bookedAt = null;
        }
      }
    }

    if (body.title !== undefined) {
      const admin = await requireSuperAdmin();
      if (!admin) return NextResponse.json({ success: false, error: "Nur Administratoren können den Titel ändern" }, { status: 403 });
      updateDoc.title = body.title;
    }

    const result = await col.findOneAndUpdate({ _id: new ObjectId(id) }, { $set: updateDoc }, { returnDocument: "after" });
    return NextResponse.json({ success: true, text: result });
  } catch (error) {
    console.error("Fehler beim Aktualisieren:", error);
    return NextResponse.json({ success: false, error: "Fehler beim Aktualisieren" }, { status: 500 });
  }
}
