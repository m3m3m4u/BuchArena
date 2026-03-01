"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getStoredAccount } from "@/lib/client-account";
import { createDefaultBloggerProfile, type BloggerProfileData } from "@/lib/profile";
import { parseGenres } from "@/app/components/genre-picker";

type BloggerProfilePayload = {
  blogger: {
    username: string;
    profileImageUrl: string;
    bloggerProfile: BloggerProfileData;
  };
};
type PageProps = { params: Promise<{ username: string }> };

export default function BloggerProfilePage({ params }: PageProps) {
  const [username, setUsername] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [bloggerProfile, setBloggerProfile] = useState<BloggerProfileData>(createDefaultBloggerProfile());
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
    async function loadBloggerProfile() {
      if (!username) return;
      setIsLoading(true);
      setMessage("");
      try {
        const res = await fetch(`/api/bloggers/profile?username=${encodeURIComponent(username)}`, { method: "GET" });
        const data = (await res.json()) as BloggerProfilePayload & { message?: string };
        if (!res.ok) throw new Error(data.message ?? "Bloggerprofil konnte nicht geladen werden.");
        setProfileImageUrl(data.blogger.profileImageUrl ?? "");
        setBloggerProfile(data.blogger.bloggerProfile ?? createDefaultBloggerProfile());
      } catch {
        setMessage("Bloggerprofil konnte nicht geladen werden.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadBloggerProfile();
  }, [username]);

  const visibleName = useMemo(() =>
    bloggerProfile.name.visibility === "public" && bloggerProfile.name.value
      ? bloggerProfile.name.value
      : username,
  [bloggerProfile.name, username]);

  const visibleMotto = useMemo(() =>
    bloggerProfile.motto?.visibility === "public" ? bloggerProfile.motto.value : "",
  [bloggerProfile.motto]);

  const visibleBeschreibung = useMemo(() =>
    bloggerProfile.beschreibung?.visibility === "public" ? bloggerProfile.beschreibung.value : "",
  [bloggerProfile.beschreibung]);

  const visibleLieblingsbuch = useMemo(() =>
    bloggerProfile.lieblingsbuch?.visibility === "public" ? bloggerProfile.lieblingsbuch.value : "",
  [bloggerProfile.lieblingsbuch]);

  const genres = useMemo(() =>
    bloggerProfile.genres ? parseGenres(bloggerProfile.genres) : [],
  [bloggerProfile.genres]);

  const socialLinks = useMemo(() => {
    const links: Array<{ label: string; url: string }> = [];
    const fields = [
      { key: "socialInstagram" as const, label: "Instagram" },
      { key: "socialFacebook" as const, label: "Facebook" },
      { key: "socialLinkedin" as const, label: "LinkedIn" },
      { key: "socialTiktok" as const, label: "TikTok" },
      { key: "socialYoutube" as const, label: "YouTube" },
      { key: "socialPinterest" as const, label: "Pinterest" },
      { key: "socialReddit" as const, label: "Reddit" },
    ];
    for (const f of fields) {
      const field = bloggerProfile[f.key];
      if (field?.visibility === "public" && field.value) {
        links.push({ label: f.label, url: field.value });
      }
    }
    return links;
  }, [bloggerProfile]);

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
          <p>Lade Bloggerprofil ...</p>
        ) : message ? (
          <p className="text-red-700">{message}</p>
        ) : (
          <>
            <div className="grid grid-cols-[96px_1fr] items-center gap-3 max-[400px]:grid-cols-1 max-[400px]:justify-items-center max-[400px]:text-center">
              <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full border border-arena-border bg-arena-bg text-xs text-arena-muted">
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt={`Profilbild von ${visibleName}`} className="h-full w-full object-cover" />
                ) : (
                  <span>Kein Bild</span>
                )}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl">{visibleName}</h1>
                {visibleMotto && <p className="mt-0.5 italic">„{visibleMotto}"</p>}
              </div>
            </div>

            {genres.length > 0 && (
              <div className="my-2">
                <h2 className="text-lg">Genres</h2>
                <div className="flex flex-wrap gap-1.5">
                  {genres.map((g) => (
                    <span
                      key={g}
                      className="inline-block rounded-full bg-arena-blue text-white text-xs font-medium px-2.5 py-1"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {visibleLieblingsbuch && (
              <div className="my-2">
                <h2 className="text-lg">Lieblingsbuch</h2>
                <p>❤️ {visibleLieblingsbuch}</p>
              </div>
            )}

            {visibleBeschreibung && (
              <div className="my-2">
                <h2 className="text-lg">Über mich</h2>
                <p className="whitespace-pre-line">{visibleBeschreibung}</p>
              </div>
            )}

            {socialLinks.length > 0 && (
              <div className="my-2">
                <h2 className="text-lg">Social Media</h2>
                <div className="flex gap-2 flex-wrap">
                  {socialLinks.map((link) => (
                    <a
                      key={link.label}
                      className="btn"
                      href={link.url.startsWith("http") ? link.url : `https://${link.url}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
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
          </>
        )}

        <Link href="/blogger" className="btn">Zurück zu Blogger entdecken</Link>
      </section>
    </main>
  );
}
