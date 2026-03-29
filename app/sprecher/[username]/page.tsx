"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getStoredAccount } from "@/lib/client-account";
import { createDefaultSpeakerProfile, type SpeakerProfileData, type Sprechprobe } from "@/lib/profile";

const socialIcons: Record<string, React.ReactNode> = {
  Instagram: (<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5A4.25 4.25 0 0 0 20.5 16.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm5.25-2a.88.88 0 1 1 0 1.75.88.88 0 0 1 0-1.75Z"/></svg>),
  Facebook: (<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99h-2.54V12h2.54V9.8c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z"/></svg>),
  LinkedIn: (<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z"/></svg>),
  TikTok: (<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6a2.6 2.6 0 0 1 2.6-2.6c.27 0 .53.04.78.12V9.6a5.82 5.82 0 0 0-.78-.05 5.73 5.73 0 0 0-5.73 5.73 5.73 5.73 0 0 0 5.73 5.72c3.16 0 5.73-2.56 5.73-5.72V9.4a7.33 7.33 0 0 0 4.28 1.37V7.68a4.28 4.28 0 0 1-3.27-1.86Z"/></svg>),
  YouTube: (<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.87.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81ZM9.75 15.02V8.98L15.5 12l-5.75 3.02Z"/></svg>),
  Pinterest: (<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2a10 10 0 0 0-3.64 19.32c-.1-.87-.18-2.2.04-3.15l1.6-6.76s-.4-.82-.4-2.03c0-1.9 1.1-3.32 2.48-3.32 1.17 0 1.73.88 1.73 1.93 0 1.17-.75 2.93-1.13 4.56-.32 1.36.68 2.47 2.02 2.47 2.42 0 4.28-2.55 4.28-6.24 0-3.26-2.35-5.54-5.7-5.54-3.88 0-6.16 2.91-6.16 5.92 0 1.17.45 2.43 1.02 3.12.11.14.13.26.09.4l-.38 1.55c-.06.25-.2.3-.46.18-1.72-.8-2.8-3.32-2.8-5.34C4.57 5.9 7.66 3 12.36 3c4.95 0 8.8 3.53 8.8 8.24 0 4.91-3.1 8.87-7.4 8.87-1.44 0-2.8-.75-3.27-1.64l-.89 3.39c-.32 1.24-1.19 2.79-1.78 3.74A10 10 0 1 0 12 2Z"/></svg>),
  Reddit: (<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M14.24 15.6c.16.16.16.42 0 .58a4.78 4.78 0 0 1-2.72.76 4.78 4.78 0 0 1-2.72-.76.41.41 0 0 1 0-.58.41.41 0 0 1 .58 0c.5.37 1.3.6 2.14.6s1.64-.23 2.14-.6a.41.41 0 0 1 .58 0ZM9.5 12.8a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Zm5 0a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4ZM12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm5.91 11.37c.03.17.04.34.04.52 0 2.67-3.1 4.83-6.93 4.83S4.1 16.56 4.1 13.89c0-.18.01-.35.04-.52a1.75 1.75 0 0 1-.68-1.37 1.75 1.75 0 0 1 2.93-1.29 8.58 8.58 0 0 1 4.67-1.5l.88-4.14a.3.3 0 0 1 .36-.24l2.93.62a1.23 1.23 0 0 1 2.28.6 1.23 1.23 0 0 1-1.23 1.23 1.23 1.23 0 0 1-1.21-1.05l-2.6-.55-.79 3.72a8.55 8.55 0 0 1 4.6 1.5 1.75 1.75 0 0 1 2.93 1.29 1.75 1.75 0 0 1-.68 1.37Z"/></svg>),
};

/** Wandelt Social-Media-Handles/-Werte in vollständige URLs um. */
function toSocialUrl(platform: string, raw: string): string {
  const v = raw.trim();
  if (/^https?:\/\//i.test(v)) return v;
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

type SpeakerProfilePayload = {
  speaker: {
    username: string;
    profileImageUrl: string;
    profileImageCrop?: { x: number; y: number; zoom: number };
    speakerProfile: SpeakerProfileData;
  };
};
type PageProps = { params: Promise<{ username: string }> };

export default function SpeakerProfilePage({ params }: PageProps) {
  const [username, setUsername] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [profileImageCrop, setProfileImageCrop] = useState<{ x: number; y: number; zoom: number } | undefined>();
  const [speakerProfile, setSpeakerProfile] = useState<SpeakerProfileData>(createDefaultSpeakerProfile());
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [loggedInUsername, setLoggedInUsername] = useState("");

  // Compose message state
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
    async function loadSpeakerProfile() {
      if (!username) return;
      setIsLoading(true);
      setMessage("");
      try {
        const res = await fetch(`/api/speakers/profile?username=${encodeURIComponent(username)}`, { method: "GET" });
        const data = (await res.json()) as SpeakerProfilePayload & { message?: string };
        if (!res.ok) throw new Error(data.message ?? "Sprecherprofil konnte nicht geladen werden.");
        setProfileImageUrl(data.speaker.profileImageUrl ?? "");
        setProfileImageCrop(data.speaker.profileImageCrop);
        setSpeakerProfile(data.speaker.speakerProfile ?? createDefaultSpeakerProfile());
      } catch {
        setMessage("Sprecherprofil konnte nicht geladen werden.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadSpeakerProfile();
  }, [username]);

  const visibleName = useMemo(() =>
    speakerProfile.name.visibility === "public" && speakerProfile.name.value
      ? speakerProfile.name.value
      : username,
  [speakerProfile.name, username]);

  const visibleOrt = useMemo(() =>
    speakerProfile.ort?.visibility === "public" ? speakerProfile.ort.value : "",
  [speakerProfile.ort]);

  const visibleMotto = useMemo(() =>
    speakerProfile.motto?.visibility === "public" ? speakerProfile.motto.value : "",
  [speakerProfile.motto]);

  const visibleWebseite = useMemo(() =>
    speakerProfile.webseite?.visibility === "public" ? speakerProfile.webseite.value : "",
  [speakerProfile.webseite]);

  const visibleInfovideo = useMemo(() =>
    speakerProfile.infovideo?.visibility === "public" ? speakerProfile.infovideo.value : "",
  [speakerProfile.infovideo]);

  const sprechproben: Sprechprobe[] = speakerProfile.sprechproben ?? [];

  const socialLinks = useMemo(() => {
    return [
      { label: "Instagram", field: speakerProfile.socialInstagram },
      { label: "Facebook", field: speakerProfile.socialFacebook },
      { label: "LinkedIn", field: speakerProfile.socialLinkedin },
      { label: "TikTok", field: speakerProfile.socialTiktok },
      { label: "YouTube", field: speakerProfile.socialYoutube },
      { label: "Pinterest", field: speakerProfile.socialPinterest },
      { label: "Reddit", field: speakerProfile.socialReddit },
    ].filter((e) => e.field?.visibility === "public" && e.field?.value);
  }, [speakerProfile]);

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
          <p>Lade Sprecherprofil ...</p>
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
                {visibleOrt && <p className="mt-0.5">{visibleOrt}</p>}
                {visibleMotto && <p className="mt-0.5 italic">„{visibleMotto}"</p>}
              </div>
            </div>

            {visibleWebseite && (
              <div className="my-2">
                <a
                  href={visibleWebseite.startsWith("http") ? visibleWebseite : `https://${visibleWebseite}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-arena-link hover:underline break-all"
                >
                  🌐 {visibleWebseite}
                </a>
              </div>
            )}

            {visibleInfovideo && (
              <div className="my-3">
                <h2 className="text-lg">Infovideo</h2>
                <Link
                  href={`/video?url=${encodeURIComponent(visibleInfovideo)}&title=${encodeURIComponent(`Infovideo – ${visibleName}`)}`}
                  className="btn"
                >
                  Video ansehen
                </Link>
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
                    <input
                      className="input-base w-full mt-1"
                      value={msgSubject}
                      onChange={(e) => setMsgSubject(e.target.value)}
                      placeholder="Betreff eingeben"
                      maxLength={200}
                    />
                  </label>
                  <label className="block mt-2">
                    <span className="text-sm font-semibold">Nachricht</span>
                    <textarea
                      className="input-base w-full mt-1"
                      rows={6}
                      value={msgBody}
                      onChange={(e) => setMsgBody(e.target.value)}
                      placeholder="Deine Nachricht ..."
                      maxLength={5000}
                    />
                  </label>
                  {composeMsg && (
                    <p className={`text-sm mt-1 ${composeMsg.includes("gesendet") ? "text-green-700" : "text-red-700"}`}>
                      {composeMsg}
                    </p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <button className="btn btn-primary" disabled={isSending} onClick={handleSendMessage}>
                      {isSending ? "Wird gesendet ..." : "Senden"}
                    </button>
                    <button className="btn" onClick={() => setShowCompose(false)}>Abbrechen</button>
                  </div>
                </div>
              </div>
            )}

            <h2>Sprechproben</h2>
            {sprechproben.length === 0 ? (
              <p>Noch keine Sprechproben hochgeladen.</p>
            ) : (
              <div className="grid gap-2.5">
                {sprechproben.map((sample) => (
                  <div
                    key={sample.id}
                    className="flex items-center gap-3 rounded-lg border border-arena-border p-3"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-arena-bg text-arena-blue">
                      🎙️
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.95rem] font-medium break-all">{sample.filename}</p>
                      <audio controls className="mt-1.5 w-full max-w-[400px]">
                        <source src={sample.url} type="audio/mpeg" />
                      </audio>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <Link href="/sprecher" className="btn">Zurück zu Sprecher entdecken</Link>
      </section>
    </main>
  );
}
