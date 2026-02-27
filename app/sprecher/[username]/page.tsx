"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getStoredAccount } from "@/lib/client-account";
import { createDefaultSpeakerProfile, type SpeakerProfileData, type Sprechprobe } from "@/lib/profile";

type SpeakerProfilePayload = {
  speaker: {
    username: string;
    profileImageUrl: string;
    speakerProfile: SpeakerProfileData;
  };
};
type PageProps = { params: Promise<{ username: string }> };

export default function SpeakerProfilePage({ params }: PageProps) {
  const [username, setUsername] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
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

  useEffect(() => { params.then((r) => setUsername(r.username)); }, [params]);

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
              <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full border border-arena-border bg-arena-bg text-xs text-arena-muted">
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt={`Profilbild von ${visibleName}`} className="h-full w-full object-cover" />
                ) : (
                  <span>Kein Bild</span>
                )}
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
                  className="text-arena-link hover:underline"
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
