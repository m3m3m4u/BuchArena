import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getServerAccount } from "@/lib/server-auth";
import { getSocialMediaGalleryCollection } from "@/lib/mongodb";
import { getWebdavClient, getWebdavUploadDir, toInternalImageUrl } from "@/lib/webdav-storage";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

function isAdmin(role?: string) {
  return role === "ADMIN" || role === "SUPERADMIN";
}

/** GET /api/admin/social-media/gallery – alle Items für Admin-Ansicht */
export async function GET() {
  const account = await getServerAccount();
  if (!account || !isAdmin(account.role)) {
    return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
  }
  const col = await getSocialMediaGalleryCollection();
  const docs = await col.find({}).sort({ order: 1, createdAt: 1 }).toArray();
  return NextResponse.json(docs.map((d) => ({
    id:        d._id!.toString(),
    label:     d.label,
    src:       d.src,
    order:     d.order,
    createdAt: d.createdAt,
  })));
}

/** POST /api/admin/social-media/gallery – neues Bild hinzufügen (multipart/form-data) */
export async function POST(req: NextRequest) {
  const account = await getServerAccount();
  if (!account || !isAdmin(account.role)) {
    return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
  }

  const formData = await req.formData();
  const label = ((formData.get("label") as string) ?? "").trim();
  const file  = formData.get("file");

  if (!label)                 return NextResponse.json({ message: "Label fehlt." }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ message: "Bild fehlt." }, { status: 400 });

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ message: "Nur Bilddateien erlaubt." }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ message: "Bild darf maximal 10 MB groß sein." }, { status: 400 });
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());

  // Magic-Bytes prüfen
  const mb = fileBuffer.subarray(0, 12);
  const isJpeg = mb[0] === 0xFF && mb[1] === 0xD8;
  const isPng  = mb[0] === 0x89 && mb[1] === 0x50 && mb[2] === 0x4E && mb[3] === 0x47;
  const isWebp = mb[0] === 0x52 && mb[1] === 0x49 && mb[2] === 0x46 && mb[3] === 0x46
              && mb[8] === 0x57 && mb[9] === 0x45 && mb[10] === 0x42 && mb[11] === 0x50;
  if (!isJpeg && !isPng && !isWebp) {
    return NextResponse.json({ message: "Ungültiges Bildformat. Erlaubt: JPEG, PNG, WebP." }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? (isJpeg ? "jpg" : isPng ? "png" : "webp");
  const uploadDir = getWebdavUploadDir();
  const remoteDirPath  = `/${uploadDir}/social-media-gallery`;
  const remoteFilePath = `${remoteDirPath}/${Date.now()}-${randomUUID()}.${ext}`;

  const client = getWebdavClient();
  await client.createDirectory(remoteDirPath, { recursive: true });
  await client.putFileContents(remoteFilePath, fileBuffer, { overwrite: true });

  const src = toInternalImageUrl(remoteFilePath);

  const col = await getSocialMediaGalleryCollection();
  const maxOrder = await col.find({}).sort({ order: -1 }).limit(1).toArray();
  const order = maxOrder.length > 0 ? maxOrder[0].order + 1 : 0;

  const result = await col.insertOne({ label, src, order, createdAt: new Date() });
  return NextResponse.json({ id: result.insertedId.toString(), label, src, order });
}

/** PATCH /api/admin/social-media/gallery – Label oder Reihenfolge aktualisieren */
export async function PATCH(req: NextRequest) {
  const account = await getServerAccount();
  if (!account || !isAdmin(account.role)) {
    return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
  }

  const body = await req.json() as { id?: string; label?: string; order?: number };
  if (!body.id) return NextResponse.json({ message: "ID fehlt." }, { status: 400 });

  const col = await getSocialMediaGalleryCollection();
  const update: Record<string, unknown> = {};
  if (body.label !== undefined) update.label = body.label.trim();
  if (body.order !== undefined) update.order = body.order;

  await col.updateOne({ _id: new ObjectId(body.id) }, { $set: update });
  return NextResponse.json({ ok: true });
}

/** DELETE /api/admin/social-media/gallery?id=xxx */
export async function DELETE(req: NextRequest) {
  const account = await getServerAccount();
  if (!account || !isAdmin(account.role)) {
    return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ message: "ID fehlt." }, { status: 400 });

  const col = await getSocialMediaGalleryCollection();
  await col.deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ ok: true });
}
