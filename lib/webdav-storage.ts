import { createClient } from "webdav";

const webdavUrl = process.env.WEBDAV_URL ?? "";
const webdavUsername = process.env.WEBDAV_USERNAME ?? "";
const webdavPassword = process.env.WEBDAV_PASSWORD ?? "";
const webdavUploadDir = process.env.WEBDAV_UPLOAD_DIR ?? "bucharena-profile-images";
const webdavPublicBaseUrl = process.env.WEBDAV_PUBLIC_BASE_URL ?? webdavUrl;

if (!webdavUrl || !webdavUsername || !webdavPassword) {
  throw new Error("WEBDAV_URL, WEBDAV_USERNAME oder WEBDAV_PASSWORD fehlt.");
}

const client = createClient(webdavUrl, {
  username: webdavUsername,
  password: webdavPassword,
});

export function getWebdavClient() {
  return client;
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
