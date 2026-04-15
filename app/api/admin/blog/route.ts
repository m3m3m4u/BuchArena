import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { getBlogCollection, extractExcerpt, type BlogStatus } from "@/lib/blog";

function forbidden() {
  return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
}

function isAdmin(role: string) {
  return role === "ADMIN" || role === "SUPERADMIN";
}

/** GET /api/admin/blog?status=pending|approved|rejected */
export async function GET(request: Request) {
  const account = await getServerAccount();
  if (!account || !isAdmin(account.role)) return forbidden();

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status") ?? "pending";

  const col = await getBlogCollection();
  const posts = await col
    .find({ status: statusFilter as BlogStatus }, { projection: { htmlContent: 0 } })
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({
    posts: posts.map((p) => ({
      _id: p._id!.toString(),
      title: p.title,
      excerpt: p.excerpt ?? "",
      status: p.status,
      authorUsername: p.authorUsername,
      authorDisplayName: p.authorDisplayName ?? p.authorUsername,
      rejectionNote: p.rejectionNote ?? null,
      reviewedBy: p.reviewedBy ?? null,
      reviewedAt: p.reviewedAt ?? null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
  });
}

/** POST /api/admin/blog – Erstellen oder Bearbeiten eines Posts */
export async function POST(request: Request) {
  const account = await getServerAccount();
  if (!account || !isAdmin(account.role)) return forbidden();

  const body = (await request.json()) as {
    id?: string;
    title?: string;
    htmlContent?: string;
    status?: BlogStatus;
    rejectionNote?: string;
  };

  const title = body.title?.trim();
  const htmlContent = body.htmlContent?.trim();

  if (!title) return NextResponse.json({ message: "Titel ist erforderlich." }, { status: 400 });
  if (!htmlContent) return NextResponse.json({ message: "Inhalt ist erforderlich." }, { status: 400 });

  const col = await getBlogCollection();
  const now = new Date();

  if (body.id) {
    if (!ObjectId.isValid(body.id)) {
      return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
    }
    const updateDoc: Record<string, unknown> = {
      title,
      htmlContent,
      excerpt: extractExcerpt(htmlContent),
      updatedAt: now,
    };
    if (body.status) {
      updateDoc.status = body.status;
      updateDoc.reviewedBy = account.username;
      updateDoc.reviewedAt = now;
      if (body.status === "rejected" && body.rejectionNote) {
        updateDoc.rejectionNote = body.rejectionNote.trim();
      } else {
        updateDoc.rejectionNote = null;
      }
    }
    const result = await col.updateOne({ _id: new ObjectId(body.id) }, { $set: updateDoc });
    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "Beitrag nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({ message: "Gespeichert.", id: body.id });
  }

  // Neuer Blog-Post direkt durch Admin (sofort genehmigt)
  const result = await col.insertOne({
    title,
    htmlContent,
    excerpt: extractExcerpt(htmlContent),
    status: "approved",
    authorUsername: account.username,
    authorDisplayName: account.username,
    reviewedBy: account.username,
    reviewedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ message: "Erstellt.", id: result.insertedId.toString() });
}

/** DELETE /api/admin/blog?id=xxx */
export async function DELETE(request: Request) {
  const account = await getServerAccount();
  if (!account || !isAdmin(account.role)) return forbidden();

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
  }

  const col = await getBlogCollection();
  await col.deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ message: "Gelöscht." });
}

/** PATCH /api/admin/blog – nur Status ändern (Freigabe / Ablehnung) */
export async function PATCH(request: Request) {
  const account = await getServerAccount();
  if (!account || !isAdmin(account.role)) return forbidden();

  const body = (await request.json()) as {
    id: string;
    status: BlogStatus;
    rejectionNote?: string;
  };

  if (!body.id || !ObjectId.isValid(body.id)) {
    return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
  }
  if (!["pending", "approved", "rejected"].includes(body.status)) {
    return NextResponse.json({ message: "Ungültiger Status." }, { status: 400 });
  }

  const col = await getBlogCollection();
  const now = new Date();
  await col.updateOne(
    { _id: new ObjectId(body.id) },
    {
      $set: {
        status: body.status,
        reviewedBy: account.username,
        reviewedAt: now,
        rejectionNote: body.status === "rejected" ? (body.rejectionNote?.trim() ?? null) : null,
        updatedAt: now,
      },
    }
  );

  return NextResponse.json({ message: "Status aktualisiert." });
}
