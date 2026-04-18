import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  getSocialMediaPixabayLicenseSafesCollection,
  getSocialMediaPixabayUploaderBlacklistCollection,
  getSocialMediaPixabayFlaggedImagesCollection,
} from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import {
  getWebdavClient,
  getWebdavUploadDir,
  toInternalImageUrl,
} from "@/lib/webdav-storage";

export const runtime = "nodejs";

const PIXABAY_KEY = process.env.PIXABAY_API_KEY ?? "";
const MIN_UPLOADER_IMAGE_COUNT = 20;
const REVERSE_IMAGE_CHECK_URL = process.env.REVERSE_IMAGE_CHECK_URL ?? "";
const REVERSE_IMAGE_CHECK_API_KEY = process.env.REVERSE_IMAGE_CHECK_API_KEY ?? "";

type PixabayHit = {
  id: number;
  pageURL: string;
  largeImageURL: string;
  webformatURL: string;
  tags: string;
  user: string;
  user_id: number;
};

type ReverseImageCheckResult = {
  status: "passed" | "failed" | "skipped";
  reason?: string;
  provider?: string;
  matchedSource?: string;
  matchedOwner?: string;
};

type VerificationState = {
  status: "verified" | "degraded";
  reason?: string;
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

function sha256Hex(value: Buffer | string) {
  return createHash("sha256").update(value).digest("hex");
}

function parseLooseNumber(raw: string) {
  const normalized = raw.replace(/[^\d]/g, "");
  return normalized ? Number(normalized) : NaN;
}

function sanitizeSegment(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "pixabay";
}

function inferExtension(contentType: string, url: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  const match = /\.([a-z0-9]{3,4})(?:\?|$)/i.exec(url);
  return match?.[1]?.toLowerCase() ?? "jpg";
}

function buildProfileUrls(userName: string, userId: number) {
  const slug = sanitizeSegment(userName);
  return [
    `https://pixabay.com/users/${slug}-${userId}/`,
    `https://pixabay.com/users/${userId}/`,
  ];
}

function extractProfileUrlsFromDetailHtml(html: string, userId: number) {
  const urls = new Set<string>();
  const patterns = [
    new RegExp(`https://pixabay\\.com/users/[^"'\\s>]*-${userId}/`, "gi"),
    new RegExp(`https://pixabay\\.com/users/${userId}/`, "gi"),
    new RegExp(`/users/[^"'\\s>]*-${userId}/`, "gi"),
    new RegExp(`/users/${userId}/`, "gi"),
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const value = match[0];
      urls.add(value.startsWith("http") ? value : `https://pixabay.com${value}`);
    }
  }

  return Array.from(urls);
}

function extractUploadedImageCount(html: string): number | null {
  const allMatch = /All\s*([\d.,]+)/i.exec(html);
  if (allMatch) {
    const parsed = parseLooseNumber(allMatch[1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  const totalResults = /1\s*-\s*\d+\s+of\s+([\d.,]+)\s+results/i.exec(html);
  if (totalResults) {
    const parsed = parseLooseNumber(totalResults[1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  let summed = 0;
  const perTypeMatches = html.matchAll(/([\d.,]+)\s*(Photos|Illustrations|Vectors|Videos)/gi);
  for (const match of perTypeMatches) {
    summed += parseLooseNumber(match[1]);
  }
  return summed > 0 ? summed : null;
}

function ensureLicenseText(html: string) {
  return /Pixabay\s+(?:Content\s+)?License|license-summary|Free\s+for\s+use(?:\s+under\s+the\s+Pixabay\s+Content\s+License)?|Free\s+for\s+commercial\s+use|Keine\s+Namensnennung\s+erforderlich/i.test(html);
}

function createFallbackDetailSnapshot(hit: PixabayHit, reason: string) {
  return [
    "<html><head><meta charset=\"utf-8\"><title>Pixabay Fallback Snapshot</title></head><body>",
    `<h1>Pixabay Fallback Snapshot for image ${hit.id}</h1>`,
    `<p>Original detail page: <a href=\"${hit.pageURL}\">${hit.pageURL}</a></p>`,
    `<p>Reason: ${reason}</p>`,
    `<p>Evidence generated from Pixabay API because direct HTML fetch returned 403 or was blocked.</p>`,
    `<pre>${JSON.stringify(hit, null, 2)}</pre>`,
    "</body></html>",
  ].join("");
}

function createFallbackProfileSnapshot(hit: PixabayHit, reason: string) {
  return [
    "<html><head><meta charset=\"utf-8\"><title>Pixabay Uploader Fallback Snapshot</title></head><body>",
    `<h1>Pixabay Uploader Fallback Snapshot for ${hit.user}</h1>`,
    `<p>Uploader user_id: ${hit.user_id}</p>`,
    `<p>Reason: ${reason}</p>`,
    `<p>Profile could not be fetched directly from Pixabay. The uploader was checked against the internal blacklist only.</p>`,
    "</body></html>",
  ].join("");
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": "BuchArena/1.0 (+https://bucharena.org)" },
  });
  if (!response.ok) {
    throw new HttpError(response.status, `Abruf fehlgeschlagen (${response.status})`);
  }
  return await response.text();
}

async function fetchBinary(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": "BuchArena/1.0 (+https://bucharena.org)" },
  });
  if (!response.ok) {
    throw new HttpError(response.status, `Bildabruf fehlgeschlagen (${response.status})`);
  }
  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  const buffer = Buffer.from(await response.arrayBuffer());
  return { buffer, contentType };
}

async function fetchPixabayHit(imageId: number): Promise<PixabayHit> {
  const url = new URL("https://pixabay.com/api/");
  url.searchParams.set("key", PIXABAY_KEY);
  url.searchParams.set("id", String(imageId));
  url.searchParams.set("lang", "de");

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    throw new HttpError(502, "Pixabay-Anfrage fehlgeschlagen.");
  }

  const data = await response.json() as { hits?: PixabayHit[] };
  const hit = data.hits?.[0];
  if (!hit) {
    throw new HttpError(404, "Bild wurde bei Pixabay nicht mehr gefunden.");
  }
  return hit;
}

async function fetchUploaderImageCountFromApi(userId: number): Promise<number | null> {
  try {
    const url = new URL("https://pixabay.com/api/");
    url.searchParams.set("key", PIXABAY_KEY);
    url.searchParams.set("user_id", String(userId));
    url.searchParams.set("per_page", "3");
    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) return null;
    const data = await response.json() as { totalHits?: number };
    return data.totalHits ?? null;
  } catch {
    return null;
  }
}

async function fetchProfileSnapshot(userName: string, userId: number, detailHtml?: string) {
  const urls = [
    ...(detailHtml ? extractProfileUrlsFromDetailHtml(detailHtml, userId) : []),
    ...buildProfileUrls(userName, userId),
  ].filter((value, index, arr) => arr.indexOf(value) === index);

  let lastError: unknown = null;
  for (const url of urls) {
    try {
      const html = await fetchText(url);
      return { profileUrl: url, html };
    } catch (error) {
      lastError = error;
      continue;
    }
  }

  if (lastError instanceof HttpError && (lastError.status === 403 || lastError.status === 429)) {
    throw new HttpError(502, "Uploader-Profil konnte bei Pixabay nicht abgerufen werden.");
  }
  throw new HttpError(422, "Uploader-Profil konnte nicht verifiziert werden.");
}

async function runReverseImageCheck(imageUrl: string, pageUrl: string, uploaderName: string, imageId: number): Promise<ReverseImageCheckResult> {
  if (!REVERSE_IMAGE_CHECK_URL) {
    return {
      status: "skipped",
      reason: "Kein Reverse-Image-Check-Endpunkt konfiguriert.",
    };
  }

  const response = await fetch(REVERSE_IMAGE_CHECK_URL, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(REVERSE_IMAGE_CHECK_API_KEY ? { "X-API-Key": REVERSE_IMAGE_CHECK_API_KEY } : {}),
    },
    body: JSON.stringify({
      imageUrl,
      pageUrl,
      uploaderName,
      imageId,
      paidDomains: [
        "shutterstock.com",
        "stock.adobe.com",
        "gettyimages.com",
        "istockphoto.com",
        "depositphotos.com",
      ],
    }),
  });

  if (!response.ok) {
    throw new HttpError(502, "Reverse-Image-Check ist fehlgeschlagen.");
  }

  const data = await response.json() as {
    status?: "passed" | "failed" | "skipped";
    reason?: string;
    provider?: string;
    matchedSource?: string;
    matchedOwner?: string;
    conflict?: boolean;
  };

  if (data.conflict || data.status === "failed") {
    return {
      status: "failed",
      reason: data.reason ?? "Kostenpflichtige Quelle oder fremder Rechteinhaber erkannt.",
      provider: data.provider,
      matchedSource: data.matchedSource,
      matchedOwner: data.matchedOwner,
    };
  }

  return {
    status: data.status ?? "passed",
    reason: data.reason,
    provider: data.provider,
    matchedSource: data.matchedSource,
    matchedOwner: data.matchedOwner,
  };
}

export async function POST(req: NextRequest) {
  const account = await getServerAccount();
  if (!account) {
    return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
  }
  if (!PIXABAY_KEY) {
    return NextResponse.json({ message: "Pixabay API nicht konfiguriert." }, { status: 500 });
  }

  const body = await req.json() as { imageId?: number };
  const imageId = Number(body.imageId);
  if (!Number.isInteger(imageId) || imageId <= 0) {
    return NextResponse.json({ message: "Ungültige Bild-ID." }, { status: 400 });
  }

  try {
    const hit = await fetchPixabayHit(imageId);

    const blacklistCollection = await getSocialMediaPixabayUploaderBlacklistCollection();
    const blacklisted = await blacklistCollection.findOne({ userId: hit.user_id });
    if (blacklisted) {
      return NextResponse.json({ message: `Dieser Uploader ist gesperrt: ${blacklisted.reason}` }, { status: 403 });
    }

    let detailHtml: string;
    let licenseVerification: VerificationState = { status: "verified" };
    try {
      detailHtml = await fetchText(hit.pageURL);
      if (!ensureLicenseText(detailHtml)) {
        return NextResponse.json({ message: "Die Pixabay-Lizenz konnte auf der Detailseite nicht verifiziert werden." }, { status: 422 });
      }
    } catch (error) {
      if (error instanceof HttpError && error.status === 403) {
        const reason = "Pixabay blockiert den direkten HTML-Abruf der Detailseite mit 403. Der Nachweis basiert daher auf API-Daten und URL-Referenz.";
        licenseVerification = {
          status: "degraded",
          reason,
        };
        detailHtml = createFallbackDetailSnapshot(hit, reason);
      } else {
        throw error;
      }
    }

    let profileSnapshot: { profileUrl: string; html: string };
    let uploadedImageCount: number | null = null;
    let uploaderVerification: VerificationState = { status: "verified" };
    try {
      profileSnapshot = await fetchProfileSnapshot(hit.user, hit.user_id, detailHtml);
      uploadedImageCount = extractUploadedImageCount(profileSnapshot.html);
      // Bildanzahl via API nachladen falls Scraping nichts liefert
      if (uploadedImageCount == null) {
        uploadedImageCount = await fetchUploaderImageCountFromApi(hit.user_id);
      }
      if (uploadedImageCount != null && uploadedImageCount < MIN_UPLOADER_IMAGE_COUNT) {
        return NextResponse.json({ message: `Uploader gesperrt: Nur ${uploadedImageCount} veröffentlichte Medien gefunden.` }, { status: 422 });
      }
      if (uploadedImageCount == null) {
        uploaderVerification = {
          status: "degraded",
          reason: "Bildanzahl des Uploaders konnte nicht ermittelt werden.",
        };
      }
    } catch (error) {
      if (error instanceof HttpError && (error.status === 403 || error.status === 422 || error.status === 502)) {
        // Profilseite nicht abrufbar – Bildanzahl dennoch via API prüfen
        uploadedImageCount = await fetchUploaderImageCountFromApi(hit.user_id);
        if (uploadedImageCount != null && uploadedImageCount < MIN_UPLOADER_IMAGE_COUNT) {
          return NextResponse.json({ message: `Uploader gesperrt: Nur ${uploadedImageCount} veröffentlichte Medien gefunden.` }, { status: 422 });
        }
        const reason = "Pixabay blockiert den Profilabruf. Bildanzahl wurde über die API geprüft.";
        uploaderVerification = uploadedImageCount != null
          ? { status: "verified" }
          : { status: "degraded", reason: "Bildanzahl konnte weder über Profil noch über API ermittelt werden." };
        profileSnapshot = {
          profileUrl: `https://pixabay.com/users/${hit.user_id}/`,
          html: createFallbackProfileSnapshot(hit, reason),
        };
      } else {
        throw error;
      }
    }

    let reverseImageCheck: ReverseImageCheckResult;
    try {
      reverseImageCheck = await runReverseImageCheck(hit.largeImageURL, hit.pageURL, hit.user, hit.id);
    } catch (error) {
      if (REVERSE_IMAGE_CHECK_URL) {
        return NextResponse.json({
          message: error instanceof Error ? error.message : "Reverse-Image-Check konnte nicht durchgeführt werden.",
        }, { status: 502 });
      }
      reverseImageCheck = { status: "skipped", reason: "Reverse-Image-Check nicht konfiguriert." };
    }

    // Interne Sperrliste für bekannte Problembild-IDs
    if (reverseImageCheck.status === "skipped") {
      const flaggedCollection = await getSocialMediaPixabayFlaggedImagesCollection();
      const flaggedEntry = await flaggedCollection.findOne({ imageId: hit.id });
      if (flaggedEntry) {
        reverseImageCheck = {
          status: "failed",
          reason: `Bild ist intern gesperrt: ${flaggedEntry.reason}`,
        };
      } else {
        reverseImageCheck = { status: "passed", reason: "Interne Sperrliste – kein Treffer." };
      }
    }

    if (reverseImageCheck.status === "failed") {
      return NextResponse.json({ message: reverseImageCheck.reason ?? "Bild wegen Copyfraud-Risiko verworfen." }, { status: 422 });
    }

    const { buffer: imageBuffer, contentType } = await fetchBinary(hit.largeImageURL);
    const imageExtension = inferExtension(contentType, hit.largeImageURL);
    const now = new Date();
    const stamp = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
    const baseDir = `/${getWebdavUploadDir()}/social-media-license-safe/${sanitizeSegment(account.username)}/${stamp}/${hit.id}-${randomUUID()}`;
    const imagePath = `${baseDir}/source-image.${imageExtension}`;
    const apiResponsePath = `${baseDir}/pixabay-response.json`;
    const htmlSnapshotPath = `${baseDir}/pixabay-detail.html`;
    const profileSnapshotPath = `${baseDir}/pixabay-uploader.html`;
    const manifestPath = `${baseDir}/manifest.json`;

    const apiResponseJson = JSON.stringify({
      fetchedAt: now.toISOString(),
      image: hit,
      verification: {
        minUploadedImageCount: MIN_UPLOADER_IMAGE_COUNT,
        uploadedImageCount,
        licenseVerification,
        uploaderVerification,
      },
    }, null, 2);

    const fileHashes = {
      image: sha256Hex(imageBuffer),
      apiResponse: sha256Hex(apiResponseJson),
      detailHtml: sha256Hex(detailHtml),
      profileHtml: sha256Hex(profileSnapshot.html),
    };
    const packageHash = sha256Hex(JSON.stringify(fileHashes));
    const manifest = JSON.stringify({
      version: 1,
      createdAt: now.toISOString(),
      username: account.username,
      imageId: hit.id,
      uploader: {
        userId: hit.user_id,
        name: hit.user,
        profileUrl: profileSnapshot.profileUrl,
        uploadedImageCount,
      },
      source: {
        pageUrl: hit.pageURL,
        tags: hit.tags,
      },
      files: {
        imagePath,
        apiResponsePath,
        htmlSnapshotPath,
        profileSnapshotPath,
      },
      hashes: fileHashes,
      packageHash,
      licenseVerification,
      uploaderVerification,
      reverseImageCheck,
    }, null, 2);

    try {
      const webdav = getWebdavClient();
      await webdav.createDirectory(baseDir, { recursive: true });
      await Promise.all([
        webdav.putFileContents(imagePath, imageBuffer, { overwrite: true }),
        webdav.putFileContents(apiResponsePath, apiResponseJson, { overwrite: true }),
        webdav.putFileContents(htmlSnapshotPath, detailHtml, { overwrite: true }),
        webdav.putFileContents(profileSnapshotPath, profileSnapshot.html, { overwrite: true }),
        webdav.putFileContents(manifestPath, manifest, { overwrite: true }),
      ]);
    } catch (error) {
      console.error("[social-media/pixabay/select] WebDAV", error);
      throw new HttpError(502, "Lizenz-Safe konnte nicht im Dateispeicher archiviert werden.");
    }

    const safesCollection = await getSocialMediaPixabayLicenseSafesCollection();
    const insertResult = await safesCollection.insertOne({
      username: account.username,
      imageId: hit.id,
      uploaderUserId: hit.user_id,
      uploaderName: hit.user,
      pageUrl: hit.pageURL,
      profileUrl: profileSnapshot.profileUrl,
      imagePath,
      apiResponsePath,
      htmlSnapshotPath,
      profileSnapshotPath,
      manifestPath,
      packageHash,
      uploadedImageCount,
      licenseVerification,
      uploaderVerification,
      reverseImageCheck,
      createdAt: now,
    });

    return NextResponse.json({
      ok: true,
      evidenceId: insertResult.insertedId.toString(),
      imageUrl: toInternalImageUrl(imagePath),
      packageHash,
      verification: {
        uploadedImageCount,
        licenseVerification,
        uploaderVerification,
        reverseImageCheck,
      },
    });
  } catch (error) {
    console.error("[social-media/pixabay/select]", error);
    return NextResponse.json({
      message: error instanceof Error ? error.message : "Bild konnte nicht abgesichert werden.",
    }, { status: error instanceof HttpError ? error.status : 500 });
  }
}