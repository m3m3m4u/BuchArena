/**
 * WebDAV-Client für BuchArena (node:http / node:https mit begrenztem Connection-Pool)
 * Verwendet die gleichen Env-Variablen wie webdav-storage.ts
 */

import http from "node:http";
import https from "node:https";

export const runtime = "nodejs";

const WEBDAV_CONNECT_TIMEOUT_MS = 30_000; // > 15s Keep-Alive der Storage Box
const WEBDAV_TIMEOUT_MS = 45_000;
const WEBDAV_UPLOAD_TIMEOUT_MS = 5 * 60_000; // 5 Minuten für große Uploads
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [2_000, 5_000];
const MAX_ERROR_SNIPPET_BYTES = 4096;

// Hetzner Storage Box erlaubt max. 10 gleichzeitige Verbindungen und hält Keep-Alive 15s offen.
// Connection: close + maxSockets: 3 gibt Slots sofort frei und lässt Reserven für webdav-storage.ts.
const davHttpAgent = new http.Agent({
  keepAlive: false,
  maxSockets: 3,
  autoSelectFamily: true,
  autoSelectFamilyAttemptTimeout: 1_000,
});
const davHttpsAgent = new https.Agent({
  keepAlive: false,
  maxSockets: 3,
  autoSelectFamily: true,
  autoSelectFamilyAttemptTimeout: 1_000,
});

const REDIRECT_STATUSES = new Set([301, 302, 307, 308]);
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const NON_AMBIGUOUS_PUT_FAILURES = new Set([401, 403, 405, 413, 423, 507]);

export class WebDavError extends Error {
  status?: number;
  code?: string;
  responseSnippet?: string;
  retryable: boolean;

  constructor(
    message: string,
    opts?: {
      status?: number;
      code?: string;
      responseSnippet?: string;
      retryable?: boolean;
    }
  ) {
    super(message);
    this.name = "WebDavError";
    this.status = opts?.status;
    this.code = opts?.code;
    this.responseSnippet = opts?.responseSnippet;
    this.retryable = opts?.retryable ?? false;
  }
}

interface DavRequestOptions {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: Buffer;
  timeoutMs?: number;
  connectTimeoutMs?: number;
  collectBody?: boolean;
  maxRedirects?: number;
}

interface DavResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}

function b64(str: string) {
  try {
    return Buffer.from(str, "utf8").toString("base64");
  } catch {
    return str;
  }
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

function encodeKey(key: string): string {
  const clean = key.replace(/^\/+/, "");
  return encodeURIComponent(clean).replace(/%2F/g, "/");
}

function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUSES.has(status);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatNetworkError(err: unknown): { message: string; code: string } {
  if (err instanceof AggregateError) {
    const subMessages = err.errors
      .map((sub) => {
        const subErr = sub as NodeJS.ErrnoException | undefined;
        if (!subErr) return "";
        if (subErr.message) return subErr.message;
        return subErr.code ? String(subErr.code) : String(sub);
      })
      .filter(Boolean);
    const firstCode = err.errors
      .map((sub) => (sub as NodeJS.ErrnoException | undefined)?.code)
      .find((c): c is string => Boolean(c));
    const aggCode = (err as NodeJS.ErrnoException).code;
    return {
      message: subMessages.join("; ") || err.message || "WebDAV network error",
      code: aggCode || firstCode || "NETWORK_ERROR",
    };
  }
  const e = err as NodeJS.ErrnoException | undefined;
  return {
    message: e?.message || "WebDAV network error",
    code: e?.code || "NETWORK_ERROR",
  };
}

async function toBuffer(body: Uint8Array | ArrayBuffer | Blob): Promise<Buffer> {
  if (body instanceof Blob) {
    return Buffer.from(await body.arrayBuffer());
  }
  if (Buffer.isBuffer(body)) {
    return body;
  }
  if (body instanceof Uint8Array) {
    return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  }
  return Buffer.from(body);
}

function davRequestOnce(options: DavRequestOptions): Promise<DavResponse> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(options.url);
    const isHttps = parsedUrl.protocol === "https:";
    const transport = isHttps ? https : http;
    const agent = isHttps ? davHttpsAgent : davHttpAgent;

    const connectTimeoutMs = options.connectTimeoutMs ?? WEBDAV_CONNECT_TIMEOUT_MS;
    const timeoutMs = options.timeoutMs ?? WEBDAV_TIMEOUT_MS;

    const headers: Record<string, string> = {
      ...(options.headers ?? {}),
      Connection: "close",
    };
    if (options.body !== undefined) {
      headers["Content-Length"] = String(options.body.byteLength);
    }

    let settled = false;
    let connectTimer: ReturnType<typeof setTimeout> | undefined;
    let totalTimer: ReturnType<typeof setTimeout> | undefined;

    const clearConnectTimer = () => {
      if (connectTimer !== undefined) {
        clearTimeout(connectTimer);
        connectTimer = undefined;
      }
    };

    const clearTimers = () => {
      clearConnectTimer();
      if (totalTimer !== undefined) {
        clearTimeout(totalTimer);
        totalTimer = undefined;
      }
    };

    const fail = (err: WebDavError) => {
      if (settled) return;
      settled = true;
      clearTimers();
      reject(err);
    };

    const succeed = (res: DavResponse) => {
      if (settled) return;
      settled = true;
      clearTimers();
      resolve(res);
    };

    const req = transport.request(
      parsedUrl,
      {
        method: options.method,
        headers,
        agent,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const isRedirect = REDIRECT_STATUSES.has(status);
        const isSuccess = status >= 200 && status < 300;
        const shouldCollectAll = Boolean(options.collectBody) && !isRedirect;
        const shouldCollectSnippet = !isSuccess && !isRedirect;

        const chunks: Buffer[] = [];
        let collectedBytes = 0;
        let ended = false;

        if (shouldCollectAll || shouldCollectSnippet) {
          res.on("data", (chunk: Buffer) => {
            if (shouldCollectAll) {
              chunks.push(chunk);
              collectedBytes += chunk.byteLength;
              return;
            }
            if (collectedBytes < MAX_ERROR_SNIPPET_BYTES) {
              const remaining = MAX_ERROR_SNIPPET_BYTES - collectedBytes;
              const slice = chunk.byteLength > remaining ? chunk.subarray(0, remaining) : chunk;
              chunks.push(slice);
              collectedBytes += slice.byteLength;
            }
          });
        } else {
          // Body vollständig verbrauchen, damit der Socket sauber geschlossen wird
          res.resume();
        }

        res.on("error", (err) => {
          const { message, code } = formatNetworkError(err);
          fail(
            new WebDavError(message || "WebDAV response error", {
              code: code === "NETWORK_ERROR" ? "RESPONSE_ERROR" : code,
              retryable: true,
            })
          );
        });

        res.on("end", () => {
          ended = true;
          succeed({
            status,
            headers: res.headers,
            body: chunks.length > 0 ? Buffer.concat(chunks, collectedBytes) : Buffer.alloc(0),
          });
        });

        res.on("close", () => {
          if (!ended && !settled) {
            fail(
              new WebDavError("WebDAV connection closed before response ended", {
                code: "ECONNRESET",
                retryable: true,
              })
            );
          }
        });
      }
    );

    req.on("socket", (socket) => {
      // Bei HTTPS muss der Timer erst nach dem TLS-Handshake enden, nicht schon nach TCP-Connect.
      const readyEvent = isHttps ? "secureConnect" : "connect";
      socket.once(readyEvent, clearConnectTimer);
    });

    connectTimer = setTimeout(() => {
      const err = new WebDavError("WebDAV connect/TLS timeout", {
        code: "CONNECT_TIMEOUT",
        retryable: true,
      });
      fail(err);
      req.destroy(err);
    }, connectTimeoutMs);

    totalTimer = setTimeout(() => {
      const err = new WebDavError("WebDAV request timeout", {
        code: "TIMEOUT",
        retryable: true,
      });
      fail(err);
      req.destroy(err);
    }, timeoutMs);

    req.on("error", (err) => {
      if (err instanceof WebDavError) {
        fail(err);
        return;
      }
      const { message, code } = formatNetworkError(err);
      fail(
        new WebDavError(message, {
          code,
          retryable: true,
        })
      );
    });

    req.on("close", () => {
      clearTimers();
    });

    if (options.body !== undefined) {
      req.end(options.body);
    } else {
      req.end();
    }
  });
}

async function davRequest(options: DavRequestOptions): Promise<DavResponse> {
  const maxRedirects = options.maxRedirects ?? 3;
  let currentUrl = options.url;

  for (let redirectCount = 0; ; redirectCount++) {
    const res = await davRequestOnce({ ...options, url: currentUrl });
    const location = typeof res.headers.location === "string" ? res.headers.location : undefined;
    if (location && REDIRECT_STATUSES.has(res.status) && redirectCount < maxRedirects) {
      const cur = new URL(currentUrl);
      const next = new URL(location, cur);
      // Authorization niemals an andere Origins weiterleiten
      if (next.origin === cur.origin) {
        currentUrl = next.toString();
        continue;
      }
    }
    return res;
  }
}

async function davRequestWithRetry(options: DavRequestOptions, label: string): Promise<DavResponse> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await davRequest(options);
      if (isRetryableStatus(res.status) && attempt < MAX_RETRIES) {
        console.warn("[webdav] retry", {
          label,
          attempt,
          status: res.status,
          code: `HTTP_${res.status}`,
          message: `Retryable HTTP status ${res.status}`,
        });
        await sleep(RETRY_DELAYS_MS[attempt - 1] ?? 5_000);
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      const davErr = err instanceof WebDavError ? err : null;
      if (davErr?.retryable && attempt < MAX_RETRIES) {
        console.warn("[webdav] retry", {
          label,
          attempt,
          status: davErr.status,
          code: davErr.code,
          message: davErr.message,
        });
        await sleep(RETRY_DELAYS_MS[attempt - 1] ?? 5_000);
        continue;
      }
      throw err;
    }
  }

  throw lastError instanceof Error ? lastError : new WebDavError("WebDAV request failed");
}

async function ensureParentDir(
  key: string,
  baseUrl: string,
  auth: string,
  force?: boolean
) {
  const idx = key.lastIndexOf("/");
  if (idx <= 0) return;
  const dirPath = key.substring(0, idx).replace(/^\/+/, "");
  if (!dirPath) return;

  // Fast Path: Zielverzeichnis direkt mit Trailing Slash prüfen (spart Redirects & Einzelchecks)
  if (!force) {
    const dirUri = `${baseUrl}/${encodeKey(dirPath)}/`;
    const check = await davRequestWithRetry(
      {
        url: dirUri,
        method: "PROPFIND",
        headers: { Authorization: auth, Depth: "0" },
      },
      `ensureParentDir:fast:${dirPath}`
    );
    if (check.status >= 200 && check.status < 300) {
      return;
    }
  }

  const parts = dirPath.split("/").filter(Boolean);
  let acc = "";
  for (const part of parts) {
    acc += (acc ? "/" : "") + part;
    const uri = `${baseUrl}/${encodeKey(acc)}/`;
    let exists = false;
    if (!force) {
      const pf = await davRequestWithRetry(
        {
          url: uri,
          method: "PROPFIND",
          headers: { Authorization: auth, Depth: "0" },
        },
        `ensureParentDir:propfind:${acc}`
      );
      exists = pf.status >= 200 && pf.status < 300;
    }
    if (force || !exists) {
      await davRequestWithRetry(
        {
          url: uri,
          method: "MKCOL",
          headers: { Authorization: auth },
        },
        `ensureParentDir:mkcol:${acc}`
      ).catch(() => undefined);
    }
  }
}

export async function davList(prefix: string) {
  const c = conf();
  if (!c) return [] as Array<{ name: string; url: string; size: number; mtime: number; key: string }>;

  const encoded = encodeKey(prefix);
  const suffix = encoded ? (encoded.endsWith("/") ? encoded : `${encoded}/`) : "";
  const target = `${c.url}/${suffix}`;
  const body = `<?xml version="1.0" encoding="utf-8"?>\n<d:propfind xmlns:d="DAV:">\n  <d:prop>\n    <d:getlastmodified/>\n    <d:getcontentlength/>\n    <d:resourcetype/>\n  </d:prop>\n</d:propfind>`;
  const res = await davRequestWithRetry(
    {
      url: target,
      method: "PROPFIND",
      headers: { Authorization: c.auth, Depth: "1", "Content-Type": "text/xml" },
      body: Buffer.from(body, "utf8"),
      collectBody: true,
    },
    `davList:${prefix}`
  );
  if (res.status === 404 || res.status < 200 || res.status >= 300) {
    return [];
  }

  const xml = res.body.toString("utf8");
  const items: Array<{ name: string; url: string; size: number; mtime: number; key: string }> = [];
  let basePath = "/";
  try {
    const u = new URL(c.url);
    basePath = u.pathname || "/";
  } catch { /* ignore */ }
  basePath = basePath.replace(/\/$/, "");
  const normPrefix = prefix.replace(/^\/+/, "");
  const prefixPath = `${basePath}/${normPrefix}`.replace(/\/+/g, "/");
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
  const target = `${c.url}/${encodeKey(key)}`;
  const buf = await toBuffer(body);
  const headers: Record<string, string> = {
    Authorization: c.auth,
    "Content-Type": contentType || "application/octet-stream",
  };

  await ensureParentDir(key, c.url, c.auth);

  let res = await davRequestWithRetry(
    {
      url: target,
      method: "PUT",
      headers,
      body: buf,
      timeoutMs: WEBDAV_UPLOAD_TIMEOUT_MS,
      connectTimeoutMs: WEBDAV_CONNECT_TIMEOUT_MS,
      collectBody: false,
    },
    `davPut:${key}`
  );

  if (res.status === 409) {
    await ensureParentDir(key, c.url, c.auth, true);
    res = await davRequestWithRetry(
      {
        url: target,
        method: "PUT",
        headers,
        body: buf,
        timeoutMs: WEBDAV_UPLOAD_TIMEOUT_MS,
        connectTimeoutMs: WEBDAV_CONNECT_TIMEOUT_MS,
        collectBody: false,
      },
      `davPut:409-retry:${key}`
    );
  }

  if (res.status < 200 || res.status >= 300) {
    if (!NON_AMBIGUOUS_PUT_FAILURES.has(res.status)) {
      const head = await davRequestWithRetry(
        {
          url: target,
          method: "HEAD",
          headers: { Authorization: c.auth },
        },
        `davPut:head-verify:${key}`
      ).catch(() => null);
      if (head && head.status >= 200 && head.status < 300) {
        const lenHeader = head.headers["content-length"];
        const remoteLen = typeof lenHeader === "string" ? Number(lenHeader) : NaN;
        if (remoteLen === buf.byteLength) {
          return { url: webdavPublicUrl(key), key };
        }
      }
    }

    const responseSnippet = res.body.toString("utf8").replace(/\s+/g, " ").trim().slice(0, 500) || undefined;
    throw new WebDavError(`PUT failed: ${res.status}`, {
      status: res.status,
      code: `HTTP_${res.status}`,
      responseSnippet,
      retryable: isRetryableStatus(res.status),
    });
  }

  return { url: webdavPublicUrl(key), key };
}

export async function davDelete(key: string) {
  const c = conf();
  if (!c) return;
  const target = `${c.url}/${encodeKey(key)}`;
  const res = await davRequestWithRetry(
    {
      url: target,
      method: "DELETE",
      headers: { Authorization: c.auth },
    },
    `davDelete:${key}`
  );
  if ((res.status < 200 || res.status >= 300) && res.status !== 404) {
    const responseSnippet = res.body.toString("utf8").replace(/\s+/g, " ").trim().slice(0, 500) || undefined;
    throw new WebDavError("DELETE failed: " + res.status, {
      status: res.status,
      code: `HTTP_${res.status}`,
      responseSnippet,
      retryable: isRetryableStatus(res.status),
    });
  }
}

export async function davGet(key: string): Promise<Uint8Array | null> {
  const c = conf();
  if (!c) return null;
  const target = `${c.url}/${encodeKey(key)}`;
  let res: DavResponse;
  try {
    res = await davRequestWithRetry(
      {
        url: target,
        method: "GET",
        headers: { Authorization: c.auth },
        collectBody: true,
      },
      `davGet:${key}`
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[davGet] Fetch Fehler", { target, err: msg });
    return null;
  }
  if (res.status < 200 || res.status >= 300) {
    console.warn("[davGet] nicht ok", { status: res.status, target });
    return null;
  }
  return new Uint8Array(
    res.body.buffer.slice(res.body.byteOffset, res.body.byteOffset + res.body.byteLength)
  );
}

export async function davExists(key: string) {
  const c = conf();
  if (!c) return false;
  const target = `${c.url}/${encodeKey(key)}`;
  const head = await davRequestWithRetry(
    {
      url: target,
      method: "HEAD",
      headers: { Authorization: c.auth },
    },
    `davExists:head:${key}`
  );
  if (head.status === 200) return true;
  const pf = await davRequestWithRetry(
    {
      url: target,
      method: "PROPFIND",
      headers: { Authorization: c.auth, Depth: "0" },
    },
    `davExists:pf:${key}`
  );
  return pf.status >= 200 && pf.status < 300;
}

export function webdavPublicUrl(pathname: string) {
  const cdn = process.env.WEBDAV_PUBLIC_BASE_URL;
  if (cdn)
    return `${cdn.replace(/\/$/, "")}/${encodeKey(pathname)}`;
  const clean = pathname.replace(/^\/+/, "");
  return `/medien/${encodeKey(clean)}`;
}
