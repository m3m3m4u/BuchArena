/**
 * WebDAV-Client für BuchArena (raw fetch, kein npm webdav-Paket nötig)
 * Verwendet die gleichen Env-Variablen wie webdav-storage.ts
 */

export const runtime = "nodejs";

function b64(str: string) {
  try {
    const g = globalThis as Record<string, unknown>;
    if (g.Buffer && typeof (g.Buffer as { from?: unknown }).from === "function")
      return (g.Buffer as { from: (s: string) => { toString: (e: string) => string } }).from(str).toString("base64");
    if (typeof g.btoa === "function")
      return (g.btoa as (s: string) => string)(unescape(encodeURIComponent(str)));
  } catch { /* ignore */ }
  return str;
}

function conf() {
  const baseURL = process.env.WEBDAV_URL;
  const username = process.env.WEBDAV_USERNAME;
  const password = process.env.WEBDAV_PASSWORD;
  if (!baseURL || !username || !password) return null;
  const url = baseURL.replace(/\/$/, "");
  const auth = "Basic " + b64(`${username}:${password}`);
  return { url, auth };
}

export function isWebdavEnabled() {
  return !!conf();
}

async function ensureParentDir(
  key: string,
  baseUrl: string,
  auth: string,
  force?: boolean
) {
  const idx = key.lastIndexOf("/");
  if (idx <= 0) return;
  const dirPath = key.substring(0, idx);
  const parts = dirPath.split("/").filter(Boolean);
  let acc = "";
  for (const part of parts) {
    acc += (acc ? "/" : "") + part;
    const uri = `${baseUrl}/${encodeURIComponent(acc).replace(/%2F/g, "/")}`;
    const pf = await fetch(uri, {
      method: "PROPFIND",
      headers: { Authorization: auth, Depth: "0" },
    });
    if (force || !pf.ok) {
      await fetch(uri, {
        method: "MKCOL",
        headers: { Authorization: auth },
      }).catch(() => undefined);
    }
  }
}

export async function davList(prefix: string) {
  const c = conf();
  if (!c) return [] as Array<{ name: string; url: string; size: number; mtime: number; key: string }>;

  const encoded = encodeURIComponent(prefix).replace(/%2F/g, "/");
  const target = `${c.url}/${encoded.endsWith("/") ? encoded : encoded + "/"}`;
  const body = `<?xml version="1.0" encoding="utf-8"?>\n<d:propfind xmlns:d="DAV:">\n  <d:prop>\n    <d:getlastmodified/>\n    <d:getcontentlength/>\n    <d:resourcetype/>\n  </d:prop>\n</d:propfind>`;
  const res = await fetch(target, {
    method: "PROPFIND",
    headers: { Authorization: c.auth, Depth: "1", "Content-Type": "text/xml" },
    body,
  });
  if (res.status === 404) {
    return [];
  }
  if (!res.ok) return [];

  const xml = await res.text();
  const items: Array<{ name: string; url: string; size: number; mtime: number; key: string }> = [];
  let basePath = "/";
  try {
    const u = new URL(c.url);
    basePath = u.pathname || "/";
  } catch { /* ignore */ }
  basePath = basePath.replace(/\/$/, "");
  const normPrefix = prefix.replace(/^\/+/, "");
  const prefixPath = `${basePath}/${normPrefix}`.replace(/\/+/, "/");
  const responses = xml.split(/<[^>]*response[^>]*>/i).slice(1);
  for (const seg of responses) {
    const hrefMatch = seg.match(/<[^>]*href[^>]*>([\s\S]*?)<\/[\s\S]*?href[^>]*>/i);
    if (!hrefMatch) continue;
    let href = hrefMatch[1].trim();
    try {
      if (/^https?:\/\//i.test(href)) href = new URL(href).pathname;
    } catch { /* ignore */ }
    href = decodeURIComponent(href);
    const isCollection = /<[^>]*resourcetype[^>]*>[\s\S]*?<[^>]*collection[^>]*\/>?[\s\S]*?<\/[\s\S]*?resourcetype>/i.test(seg);
    if (isCollection) continue;
    if (!href.startsWith(prefixPath)) continue;
    let rel = href.substring(prefixPath.length);
    rel = rel.replace(/^\/+/, "");
    if (!rel) continue;
    const name = rel.split("/").pop() || rel;
    const key = `${normPrefix}${normPrefix.endsWith("/") ? "" : "/"}${rel}`;
    const sizeMatch = seg.match(/<[^>]*getcontentlength[^>]*>(\d+)<\/[\s\S]*?getcontentlength[^>]*>/i);
    const dateMatch = seg.match(/<[^>]*getlastmodified[^>]*>([\s\S]*?)<\/[\s\S]*?getlastmodified[^>]*>/i);
    const size = sizeMatch ? Number(sizeMatch[1]) : 0;
    const mtime = dateMatch ? new Date(dateMatch[1]).getTime() : Date.now();
    items.push({ name, url: webdavPublicUrl(key), size, mtime, key });
  }
  items.sort((a, b) => b.mtime - a.mtime);
  return items;
}

export async function davPut(
  key: string,
  body: Uint8Array | ArrayBuffer | Blob,
  contentType?: string
) {
  const c = conf();
  if (!c) return null;
  const target = `${c.url}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
  const blobBody =
    body instanceof Blob
      ? body
      : new Blob([body as ArrayBuffer], {
          type: contentType || "application/octet-stream",
        });
  await ensureParentDir(key, c.url, c.auth);
  let res = await fetch(target, {
    method: "PUT",
    headers: {
      Authorization: c.auth,
      ...(contentType ? { "Content-Type": contentType } : {}),
    },
    body: blobBody,
  });
  if (res.status === 409) {
    await ensureParentDir(key, c.url, c.auth, true);
    res = await fetch(target, {
      method: "PUT",
      headers: {
        Authorization: c.auth,
        ...(contentType ? { "Content-Type": contentType } : {}),
      },
      body: blobBody,
    });
  }
  if (!res.ok) {
    const exists = await davExists(key).catch(() => false);
    if (exists) throw new Error("PUT failed: 409");
    throw new Error("PUT failed: " + res.status);
  }
  return { url: webdavPublicUrl(key), key };
}

export async function davDelete(key: string) {
  const c = conf();
  if (!c) return;
  const target = `${c.url}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
  const res = await fetch(target, {
    method: "DELETE",
    headers: { Authorization: c.auth },
  });
  if (!res.ok && res.status !== 404)
    throw new Error("DELETE failed: " + res.status);
}

export async function davGet(key: string): Promise<Uint8Array | null> {
  const c = conf();
  if (!c) return null;
  const target = `${c.url}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
  let res: Response | null = null;
  try {
    res = await fetch(target, { headers: { Authorization: c.auth } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[davGet] Fetch Fehler", { target, err: msg });
    return null;
  }
  if (!res.ok) {
    console.warn("[davGet] nicht ok", { status: res.status, target });
    return null;
  }
  return new Uint8Array(await res.arrayBuffer());
}

export async function davExists(key: string) {
  const c = conf();
  if (!c) return false;
  const target = `${c.url}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
  const head = await fetch(target, {
    method: "HEAD",
    headers: { Authorization: c.auth },
  });
  if (head.status === 200) return true;
  const pf = await fetch(target, {
    method: "PROPFIND",
    headers: { Authorization: c.auth, Depth: "0" },
  });
  return pf.ok;
}

export function webdavPublicUrl(pathname: string) {
  const cdn = process.env.WEBDAV_PUBLIC_BASE_URL;
  if (cdn)
    return `${cdn.replace(/\/$/, "")}/${encodeURIComponent(pathname).replace(/%2F/g, "/")}`;
  const clean = pathname.replace(/^\/+/, "");
  return `/medien/${encodeURIComponent(clean).replace(/%2F/g, "/")}`;
}
