import { createClient, type WebDAVClient } from "webdav";

const webdavUploadDir = process.env.WEBDAV_UPLOAD_DIR ?? "bucharena-profile-images";
const webdavPublicBaseUrl = process.env.WEBDAV_PUBLIC_BASE_URL ?? process.env.WEBDAV_URL ?? "";

let _client: WebDAVClient | null = null;

function getClient(): WebDAVClient {
  if (_client) return _client;
  const url = process.env.WEBDAV_URL ?? "";
  const username = process.env.WEBDAV_USERNAME ?? "";
  const password = process.env.WEBDAV_PASSWORD ?? "";
  if (!url || !username || !password) {
    throw new Error("WEBDAV_URL, WEBDAV_USERNAME oder WEBDAV_PASSWORD fehlt.");
  }
  _client = createClient(url, { username, password });
  return _client;
}

export function getWebdavClient() {
  return getClient();
}

export function getWebdavUploadDir() {
  return webdavUploadDir.replace(/^\/+/, "").replace(/\/+$/, "");
}

export function toPublicImageUrl(remotePath: string) {
  const base = webdavPublicBaseUrl.replace(/\/+$/, "");
  return `${base}${remotePath}`;
}

export function toInternalImageUrl(remotePath: string, width?: number) {
  let url = `/api/profile/image?path=${encodeURIComponent(remotePath)}`;
  if (width) url += `&w=${width}`;
  return url;
}

export function isAllowedRemotePath(remotePath: string) {
  const normalized = remotePath.replace(/\\/g, "/");
  const prefix = `/${getWebdavUploadDir()}/`;
  return normalized.startsWith(prefix);
}
