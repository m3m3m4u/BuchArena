/** Extrahiert die YouTube-Video-ID aus verschiedenen URL-Formaten */
export function extractYoutubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0] ?? null;
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      // Shorts / embed / v
      const parts = u.pathname.split("/");
      const idx = parts.findIndex((p) => p === "embed" || p === "shorts" || p === "v");
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    }
    return null;
  } catch {
    return null;
  }
}
