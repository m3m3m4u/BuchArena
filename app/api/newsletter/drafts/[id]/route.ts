import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { getNewsletterDraftsCollection } from "@/lib/newsletter";

type RouteProps = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteProps) {
  const account = await getServerAccount();
  if (!account || (account.role !== "ADMIN" && account.role !== "SUPERADMIN")) {
    return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
  }

  const { id } = await params;
  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
  }

  const col = await getNewsletterDraftsCollection();
  const draft = await col.findOne({ _id: new ObjectId(id) });

  if (!draft) {
    return NextResponse.json({ message: "Entwurf nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({
    draft: {
      _id: draft._id!.toString(),
      subject: draft.subject,
      htmlContent: draft.htmlContent,
      note: draft.note ?? "",
      savedBy: draft.savedBy,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
    },
  });
}
