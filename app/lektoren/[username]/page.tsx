"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getStoredAccount } from "@/lib/client-account";
import { createDefaultLektorenProfile, type LektorenProfileData } from "@/lib/profile";
import { LinkifyText } from "@/app/components/linkify-text";

const monthLabels = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

const socialIcons: Record<string, React.ReactNode> = {
  Instagram: (<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5A4.25 4.25 0 0 0 20.5 16.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm5.25-2a.88.88 0 1 1 0 1.75.88.88 0 0 1 0-1.75Z"/></svg>),
  Facebook: (<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99h-2.54V12h2.54V9.8c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z"/></svg>),
  LinkedIn: (<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z"/></svg>),
  TikTok: (<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6a2.6 2.6 0 0 1 2.6-2.6c.27 0 .53.04.78.12V9.6a5.82 5.82 0 0 0-.78-.05 5.73 5.73 0 0 0-5.73 5.73 5.73 5.73 0 0 0 5.73 5.72c3.16 0 5.73-2.56 5.73-5.72V9.4a7.33 7.33 0 0 0 4.28 1.37V7.68a4.28 4.28 0 0 1-3.27-1.86Z"/></svg>),
  YouTube: (<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.87.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81ZM9.75 15.02V8.98L15.5 12l-5.75 3.02Z"/></svg>),
  Pinterest: (<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2a10 10 0 0 0-3.64 19.32c-.1-.87-.18-2.2.04-3.15l1.6-6.76s-.4-.82-.4-2.03c0-1.9 1.1-3.32 2.48-3.32 1.17 0 1.73.88 1.73 1.93 0 1.17-.75 2.93-1.13 4.56-.32 1.36.68 2.47 2.02 2.47 2.42 0 4.28-2.55 4.28-6.24 0-3.26-2.35-5.54-5.7-5.54-3.88 0-6.16 2.91-6.16 5.92 0 1.17.45 2.43 1.02 3.12.11.14.13.26.09.4l-.38 1.55c-.06.25-.2.3-.46.18-1.72-.8-2.8-3.32-2.8-5.34C4.57 5.9 7.66 3 12.36 3c4.95 0 8.8 3.53 8.8 8.24 0 4.91-3.1 8.87-7.4 8.87-1.44 0-2.8-.75-3.27-1.64l-.89 3.39c-.32 1.24-1.19 2.79-1.78 3.74A10 10 0 1 0 12 2Z"/></svg>),
  Reddit: (<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M14.24 15.6c.16.16.16.42 0 .58a4.78 4.78 0 0 1-2.72.76 4.78 4.78 0 0 1-2.72-.76.41.41 0 0 1 0-.58.41.41 0 0 1 .58 0c.5.37 1.3.6 2.14.6s1.64-.23 2.14-.6a.41.41 0 0 1 .58 0ZM9.5 12.8a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Zm5 0a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4ZM12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm5.91 11.37c.03.17.04.34.04.52 0 2.67-3.1 4.83-6.93 4.83S4.1 16.56 4.1 13.89c0-.18.01-.35.04-.52a1.75 1.75 0 0 1-.68-1.37 1.75 1.75 0 0 1 2.93-1.29 8.58 8.58 0 0 1 4.67-1.5l.88-4.14a.3.3 0 0 1 .36-.24l2.93.62a1.23 1.23 0 0 1 2.28.6 1.23 1.23 0 0 1-1.23 1.23 1.23 1.23 0 0 1-1.21-1.05l-2.6-.55-.79 3.72a8.55 8.55 0 0 1 4.6 1.5 1.75 1.75 0 0 1 2.93 1.29 1.75 1.75 0 0 1-.68 1.37Z"/></svg>),
  Website: (<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1 17.93A8 8 0 0 1 4 12c0-.61.07-1.2.2-1.76L8 14v1a2 2 0 0 0 2 2v2.93ZM17.9 17A2 2 0 0 0 16 16h-1v-3a1 1 0 0 0-1-1H8v-2h2a1 1 0 0 0 1-1V7h2a2 2 0 0 0 2-2v-.41A8 8 0 0 1 20 12a7.97 7.97 0 0 1-2.1 5Z"/></svg>),
  Linktree: (<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M7.53 9.64l3.4-3.3L7.2 2.6l1.9-1.89 3.77 3.76L16.64.71l1.89 1.89-3.73 3.74 3.4 3.3-1.93 1.88-3.4-3.38-3.4 3.38ZM11.07 13.2h1.86v8.33h-1.86z"/></svg>),
  Newsletter: (<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2Zm0 4-8 5-8-5V6l8 5 8-5v2Z"/></svg>),
  "WhatsApp-Kanal": (<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M17.47 2.01A11.93 11.93 0 0 0 12.05 1 10.99 10.99 0 0 0 2.68 17.47L1 23l5.72-1.5A11 11 0 0 0 12.06 23 11 11 0 0 0 17.47 2Zm-5.42 16.93a9.12 9.12 0 0 1-4.65-1.28l-.33-.2-3.46.91.92-3.39-.22-.34A9.07 9.07 0 1 1 21.1 12a9.09 9.09 0 0 1-9.05 6.94Zm5-6.78c-.28-.14-1.63-.8-1.88-.9-.25-.09-.44-.14-.63.14s-.72.9-.88 1.08-.33.21-.6.07a7.55 7.55 0 0 1-3.75-3.27c-.28-.49.28-.45.81-1.51a.52.52 0 0 0-.02-.49c-.07-.14-.63-1.51-.86-2.07-.23-.55-.46-.47-.63-.47h-.54a1.03 1.03 0 0 0-.75.35A3.15 3.15 0 0 0 6.33 8a5.47 5.47 0 0 0 1.15 2.91 12.52 12.52 0 0 0 4.8 4.24c1.76.76 2.45.83 3.33.7a2.87 2.87 0 0 0 1.89-1.34 2.34 2.34 0 0 0 .16-1.34c-.07-.12-.25-.19-.53-.33Z"/></svg>),
  Mailadresse: (<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2Zm-.4 4.25-7.07 4.42a1 1 0 0 1-1.06 0L4.4 8.25a.85.85 0 1 1 .9-1.44L12 11l6.7-4.19a.85.85 0 1 1 .9 1.44Z"/></svg>),
};

function toSocialUrl(platform: string, raw: string): string {
  const v = raw.trim();
  if (platform === "Mailadresse") return `mailto:${v}`;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^(www\.)?[a-z0-9-]+\.[a-z]{2,}/i.test(v)) return `https://${v}`;
  const handle = v.replace(/^@/, "");
  switch (platform) {
    case "Instagram": return `https://www.instagram.com/${encodeURIComponent(handle)}`;
    case "Facebook": return `https://www.facebook.com/${encodeURIComponent(handle)}`;
    case "TikTok": return `https://www.tiktok.com/@${encodeURIComponent(handle)}`;
    case "YouTube": return `https://www.youtube.com/@${encodeURIComponent(handle)}`;
    case "LinkedIn": return `https://www.linkedin.com/in/${encodeURIComponent(handle)}`;
    case "Pinterest": return `https://www.pinterest.com/${encodeURIComponent(handle)}`;
    case "Reddit": return `https://www.reddit.com/user/${encodeURIComponent(handle)}`;
    default: return v;
  }
}

type LektorenProfilePayload = {
  lektor: {
    username: string;
    profileImageUrl: string;
    profileImageCrop?: { x: number; y: number; zoom: number };
    lektorenProfile: LektorenProfileData;
  };
};
type PageProps = { params: Promise<{ username: string }> };

export default function LektorenProfilePage({ params }: PageProps) {
  const [username, setUsername] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [profileImageCrop, setProfileImageCrop] = useState<{ x: number; y: number; zoom: number } | undefined>();
  const [lektorenProfile, setLektorenProfile] = useState<LektorenProfileData>(createDefaultLektorenProfile());
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [loggedInUsername, setLoggedInUsername] = useState("");

  const [showCompose, setShowCompose] = useState(false);
  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [composeMsg, setComposeMsg] = useState("");

  useEffect(() => {
    const account = getStoredAccount();
    if (account) setLoggedInUsername(account.username);
  }, []);

  useEffect(() => { params.then((r) => setUsername(decodeURIComponent(r.username))); }, [params]);

  useEffect(() => {
    async function loadProfile() {
      if (!username) return;
      setIsLoading(true);
      setMessage("");
      try {
        const res = await fetch(`/api/lektoren/profile?username=${encodeURIComponent(username)}`, { method: "GET" });
        const data = (await res.json()) as LektorenProfilePayload & { message?: string };
        if (!res.ok) throw new Error(data.message ?? "Lektorenprofil konnte nicht geladen werden.");
        setProfileImageUrl(data.lektor.profileImageUrl ?? "");
        setProfileImageCrop(data.lektor.profileImageCrop);
        setLektorenProfile({ ...createDefaultLektorenProfile(), ...data.lektor.lektorenProfile });
      } catch {
        setMessage("Lektorenprofil konnte nicht geladen werden.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadProfile();
  }, [username]);

  const visibleName = useMemo(() =>
    lektorenProfile.name.visibility === "public" && lektorenProfile.name.value
      ? lektorenProfile.name.value
      : username,
  [lektorenProfile.name, username]);

  const kapazitaeten = useMemo(() =>
    Array.isArray(lektorenProfile.kapazitaeten) ? lektorenProfile.kapazitaeten : [],
  [lektorenProfile.kapazitaeten]);

  const socialLinks = useMemo(() => {
    return [
      { label: "Website", field: lektorenProfile.socialWebsite },
      { label: "Instagram", field: lektorenProfile.socialInstagram },
      { label: "Facebook", field: lektorenProfile.socialFacebook },
      { label: "LinkedIn", field: lektorenProfile.socialLinkedin },
      { label: "TikTok", field: lektorenProfile.socialTiktok },
      { label: "YouTube", field: lektorenProfile.socialYoutube },
      { label: "Pinterest", field: lektorenProfile.socialPinterest },
      { label: "Reddit", field: lektorenProfile.socialReddit },
      { label: "Linktree", field: lektorenProfile.socialLinktree },
      { label: "Newsletter", field: lektorenProfile.socialNewsletter },
      { label: "WhatsApp-Kanal", field: lektorenProfile.socialWhatsapp },
      { label: "Mailadresse", field: lektorenProfile.socialEmail },
    ].filter((e) => e.field?.visibility === "public" && e.field?.value);
  }, [lektorenProfile]);

  async function handleSendMessage() {
    setIsSending(true);
    setComposeMsg("");
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientUsername: username, subject: msgSubject, body: msgBody }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Senden fehlgeschlagen.");
      setComposeMsg("Nachricht gesendet!");
      setMsgSubject("");
      setMsgBody("");
      setTimeout(() => { setShowCompose(false); setComposeMsg(""); }, 1200);
    } catch (err) {
      setComposeMsg(err instanceof Error ? err.message : "Fehler beim Senden.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="top-centered-main">
      <section className="card">
        {isLoading ? (
          <p>Lade Lektorenprofil ...</p>
        ) : message ? (
          <p className="text-red-700">{message}</p>
        ) : (
          <>
            <div className="grid grid-cols-[96px_1fr] items-center gap-3 max-[400px]:grid-cols-1 max-[400px]:justify-items-center max-[400px]:text-center">
              <div
                className="grid h-24 w-24 place-items-center overflow-hidden rounded-full border border-arena-border bg-arena-bg text-xs text-arena-muted"
                style={profileImageUrl ? {
                  backgroundImage: `url(${profileImageUrl})`,
                  backgroundPosition: `${profileImageCrop?.x ?? 50}% ${profileImageCrop?.y ?? 50}%`,
                  backgroundSize: `${(profileImageCrop?.zoom ?? 1) * 100}%`,
                  backgroundRepeat: "no-repeat",
                } : undefined}
              >
                {!profileImageUrl && <span>Kein Bild</span>}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl">{visibleName}</h1>
                {lektorenProfile.motto && <p className="mt-0.5 italic">„{lektorenProfile.motto}“</p>}
              </div>
            </div>

            {kapazitaeten.length > 0 && (
              <div className="my-2">
                <h2 className="text-lg">Kapazitäten</h2>
                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
                    const hasCapacity = kapazitaeten.includes(m);
                    return (
                      <span
                        key={m}
                        className={`inline-block rounded-full text-xs font-medium px-2.5 py-1 ${hasCapacity ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}
                      >
                        {monthLabels[m - 1]}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {lektorenProfile.zuMir && (
              <div className="my-2">
                <h2 className="text-lg">Zu mir</h2>
                <p className="text-sm whitespace-pre-wrap"><LinkifyText text={lektorenProfile.zuMir} /></p>
              </div>
            )}

            {socialLinks.length > 0 && (
              <div className="my-3 flex flex-wrap gap-3">
                {socialLinks.map((entry) => (
                  <a key={entry.label} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3.5 py-2 text-sm font-medium no-underline text-arena-text transition-colors hover:bg-gray-200 min-h-[44px] sm:min-h-0" href={toSocialUrl(entry.label, entry.field.value)} target="_blank" rel="noreferrer" title={entry.label}>
                    {socialIcons[entry.label]}
                    <span>{entry.label}</span>
                  </a>
                ))}
              </div>
            )}

            {loggedInUsername && loggedInUsername !== username && (
              <div className="my-3">
                <button className="btn" onClick={() => { setShowCompose(true); setComposeMsg(""); }}>
                  Nachricht senden
                </button>
              </div>
            )}

            {showCompose && (
              <div className="overlay-backdrop" onClick={() => setShowCompose(false)}>
                <div className="card" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg m-0">Nachricht an {visibleName}</h2>
                    <button className="btn btn-sm" onClick={() => setShowCompose(false)}>✕</button>
                  </div>
                  <label className="block mt-2">
                    <span className="text-sm font-semibold">Betreff</span>
                    <input className="input-base w-full mt-1" value={msgSubject} onChange={(e) => setMsgSubject(e.target.value)} placeholder="Betreff eingeben" maxLength={200} />
                  </label>
                  <label className="block mt-2">
                    <span className="text-sm font-semibold">Nachricht</span>
                    <textarea className="input-base w-full mt-1" rows={6} value={msgBody} onChange={(e) => setMsgBody(e.target.value)} placeholder="Deine Nachricht ..." maxLength={5000} />
                  </label>
                  {composeMsg && (
                    <p className={`text-sm mt-1 ${composeMsg.includes("gesendet") ? "text-green-700" : "text-red-700"}`}>{composeMsg}</p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <button className="btn btn-primary" disabled={isSending} onClick={handleSendMessage}>{isSending ? "Wird gesendet ..." : "Senden"}</button>
                    <button className="btn" onClick={() => setShowCompose(false)}>Abbrechen</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <Link href="/lektoren" className="btn">Zurück zu Lektoren entdecken</Link>
      </section>
    </main>
  );
}
