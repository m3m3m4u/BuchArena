import JSZip from "jszip";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { getSocialMediaPixabayLicenseSafesCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { getWebdavClient } from "@/lib/webdav-storage";

export const runtime = "nodejs";

function sanitizeFileName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "bildquellen";
}

function fileNameFromPath(remotePath: string) {
  const segments = remotePath.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? "file";
}

async function readRemoteFile(remotePath: string) {
  const client = getWebdavClient();
  const content = await client.getFileContents(remotePath, { format: "binary" });
  return Buffer.from(content as Buffer);
}

export async function POST(req: NextRequest) {
  const account = await getServerAccount();
  if (!account) {
    return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await req.json() as { evidenceIds?: string[]; projectName?: string };
  const evidenceIds = Array.from(new Set((body.evidenceIds ?? []).filter((id): id is string => ObjectId.isValid(id))));
  if (evidenceIds.length === 0) {
    return NextResponse.json({ message: "Keine Bildquellen im Projekt gefunden." }, { status: 400 });
  }

  const collection = await getSocialMediaPixabayLicenseSafesCollection();
  const evidences = await collection.find({ _id: { $in: evidenceIds.map((id) => new ObjectId(id)) } }).toArray();
  const isAdmin = account.role === "ADMIN" || account.role === "SUPERADMIN";
  const unauthorized = evidences.find((entry) => entry.username !== account.username && !isAdmin);
  if (unauthorized) {
    return NextResponse.json({ message: "Kein Zugriff auf mindestens eine Bildquelle." }, { status: 403 });
  }

  const zip = new JSZip();
  const summary = [] as Array<Record<string, unknown>>;

  for (const evidence of evidences) {
    const folderName = `${evidence.imageId}-${sanitizeFileName(evidence.uploaderName)}`;
    const folder = zip.folder(folderName);
    if (!folder) continue;

    const [imageBuffer, apiResponseBuffer, detailHtmlBuffer, profileHtmlBuffer, manifestBuffer] = await Promise.all([
      readRemoteFile(evidence.imagePath),
      readRemoteFile(evidence.apiResponsePath),
      readRemoteFile(evidence.htmlSnapshotPath),
      readRemoteFile(evidence.profileSnapshotPath),
      readRemoteFile(evidence.manifestPath),
    ]);

    folder.file(fileNameFromPath(evidence.imagePath), imageBuffer);
    folder.file(fileNameFromPath(evidence.apiResponsePath), apiResponseBuffer);
    folder.file(fileNameFromPath(evidence.htmlSnapshotPath), detailHtmlBuffer);
    folder.file(fileNameFromPath(evidence.profileSnapshotPath), profileHtmlBuffer);
    folder.file(fileNameFromPath(evidence.manifestPath), manifestBuffer);

    summary.push({
      evidenceId: evidence._id?.toString(),
      imageId: evidence.imageId,
      uploader: evidence.uploaderName,
      pageUrl: evidence.pageUrl,
      packageHash: evidence.packageHash,
      checks: {
        lizenz: evidence.licenseVerification.status === "verified" ? "Bestätigt (API + Seite)" : "Bestätigt (API)",
        uploader: evidence.uploaderVerification.status === "verified" ? "Bestätigt (API + Profil)" : "Eingeschränkt (Profil nicht abrufbar)",
        blacklist: "Gegen interne Sperrliste geprüft",
        copyfraud: evidence.reverseImageCheck.status === "passed"
          ? "Unauffällig"
          : evidence.reverseImageCheck.status === "skipped"
            ? "Nicht durchgeführt"
            : "Hinweis vorhanden",
      },
      createdAt: evidence.createdAt.toISOString(),
    });
  }

  // HTML-Bericht
  const htmlRows = summary.map((item) => {
    const checks = item.checks as Record<string, string>;
    const showCheck = (s: string) => !s.includes("Eingeschränkt") && !s.includes("Nicht durchgeführt") && !s.includes("Hinweis");
    const cell = (s: string) => showCheck(s) ? `<span style="color:#22c55e">${s}</span>` : `<span style="color:#94a3b8">–</span>`;
    return `
    <tr>
      <td><a href="${String(item.pageUrl)}" target="_blank">${String(item.imageId)}</a></td>
      <td>${String(item.uploader)}</td>
      <td>${cell(checks.lizenz)}</td>
      <td>${cell(checks.uploader)}</td>
      <td>${cell(checks.copyfraud)}</td>
      <td><code style="font-size:0.7em">${String(item.packageHash).substring(0, 16)}…</code></td>
      <td>${new Date(String(item.createdAt)).toLocaleString("de-DE")}</td>
    </tr>`;
  }).join("\n");

  const reportHtml = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bildquellen-Nachweis – ${body.projectName ?? "Beitrag"}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; color: #1e293b; background: #f8fafc; }
  h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
  .meta { color: #64748b; font-size: 0.875rem; margin-bottom: 2rem; }
  table { border-collapse: collapse; width: 100%; font-size: 0.85rem; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
  th { background: #1e40af; color: #fff; padding: 0.6rem 0.8rem; text-align: left; }
  td { padding: 0.55rem 0.8rem; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) { background: #f1f5f9; }
  a { color: #2563eb; }
  code { background: #f1f5f9; padding: 2px 4px; border-radius: 4px; }
  .footer { margin-top: 1.5rem; font-size: 0.78rem; color: #94a3b8; }
</style>
</head>
<body>
<h1>Bildquellen-Nachweis</h1>
<p class="meta">Projekt: <strong>${body.projectName ?? "Beitrag"}</strong> &nbsp;|&nbsp; Erstellt: ${new Date().toLocaleString("de-DE")} &nbsp;|&nbsp; Bilder: ${summary.length}</p>
<table>
  <thead>
    <tr>
      <th>Bild-ID</th>
      <th>Uploader</th>
      <th>Lizenz</th>
      <th>Profil</th>
      <th>Copyfraud</th>
      <th>Hash (Auszug)</th>
      <th>Gespeichert</th>
    </tr>
  </thead>
  <tbody>${htmlRows}</tbody>
</table>
<p class="footer">
  Alle Nachweise wurden automatisch beim Einbinden der Bilder gespeichert.<br>
  Die vollständigen Rohdaten (API-Response, HTML-Snapshots, Manifest) befinden sich in den Unterordnern dieser ZIP-Datei.
</p>
</body>
</html>`;

  zip.file("bericht.html", reportHtml);

  zip.file("bildquellen.json", JSON.stringify({
    projectName: body.projectName ?? "beitrag",
    createdAt: new Date().toISOString(),
    info: [
      "Diese Datei enthält alle gespeicherten Nachweise zu Pixabay-Bildern aus dem aktuellen Projekt.",
      "Gespeichert werden Bild, API-Daten, Seitenkopien und ein Manifest mit Hashwerten.",
      "Wenn Pixabay direkte Seitenabrufe blockiert, wird das im Manifest als eingeschränkte Prüfung vermerkt.",
    ],
    items: summary,
  }, null, 2));

  zip.file("README.txt", [
    "Bildquellen für dieses Projekt",
    "",
    "Enthalten sind alle gespeicherten Nachweise zu Pixabay-Bildern, die im aktuellen Projekt verwendet werden.",
    "",
    "Einfach erklärt:",
    "- Wir speichern das Originalbild und die API-Daten.",
    "- Wir speichern zusätzliche Seitenkopien, wenn Pixabay den Abruf erlaubt.",
    "- Wir speichern Hashwerte, damit spätere Änderungen erkennbar sind.",
    "- Wir prüfen bekannte gesperrte Uploader gegen eine interne Sperrliste.",
    "- Eine zusätzliche Copyfraud-Prüfung kann optional aktiv sein.",
  ].join("\n"));

  const archive = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 9 } });
  const downloadName = `${sanitizeFileName(body.projectName ?? "beitrag")}-bildquellen.zip`;

  return new NextResponse(archive as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${downloadName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}