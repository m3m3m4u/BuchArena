"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  ACCOUNT_CHANGED_EVENT,
  clearStoredAccount,
  getStoredAccount,
  type LoggedInAccount,
} from "@/lib/client-account";
import { createDefaultProfile, createDefaultSpeakerProfile, type ProfileData, type SpeakerProfileData, type Visibility } from "@/lib/profile";
import MeineBuecherTab from "@/app/components/meine-buecher-tab";

type ProfileTab = "autor" | "sprecher" | "buecher";

type GetProfileResponse = {
  profile: ProfileData;
  speakerProfile?: SpeakerProfileData;

};

const visibilityOptions: Array<{ value: Visibility; label: string }> = [
  { value: "internal", label: "intern" },
  { value: "public", label: "öffentlich" },
  { value: "hidden", label: "nicht" },
];

export default function ProfilPage() {
  const [account, setAccount] = useState<LoggedInAccount | null>(null);
  const [requestedUser, setRequestedUser] = useState("");
  const [activeTab, setActiveTab] = useState<ProfileTab>("autor");
  const [profile, setProfile] = useState<ProfileData>(createDefaultProfile());
  const [speakerProfile, setSpeakerProfile] = useState<SpeakerProfileData>(createDefaultSpeakerProfile());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingSpeaker, setIsSavingSpeaker] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingSample, setIsUploadingSample] = useState(false);
  const [isImageOverlayOpen, setIsImageOverlayOpen] = useState(false);
  const [isSpeakerImageOverlayOpen, setIsSpeakerImageOverlayOpen] = useState(false);
  const [isUploadingSpeakerImage, setIsUploadingSpeakerImage] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startCropX: number;
    startCropY: number;
  } | null>(null);
  const speakerDragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startCropX: number;
    startCropY: number;
  } | null>(null);

  const targetUsername =
    account?.role === "SUPERADMIN" && requestedUser ? requestedUser : account?.username ?? "";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const user = params.get("user")?.trim() ?? "";
    setRequestedUser(user);

    const tab = params.get("tab")?.trim();
    if (tab === "buecher" || tab === "sprecher" || tab === "autor") {
      setActiveTab(tab);
    }
  }, []);

  useEffect(() => {
    function syncAccount() {
      setAccount(getStoredAccount());
    }

    syncAccount();
    window.addEventListener(ACCOUNT_CHANGED_EVENT, syncAccount);
    window.addEventListener("storage", syncAccount);

    return () => {
      window.removeEventListener(ACCOUNT_CHANGED_EVENT, syncAccount);
      window.removeEventListener("storage", syncAccount);
    };
  }, []);

  useEffect(() => {
    async function loadProfile() {
      if (!account || !targetUsername) {
        setIsLoading(false);
        setProfile(createDefaultProfile());
        return;
      }

      setIsLoading(true);
      setMessage("");
      setIsError(false);

      try {
        const response = await fetch("/api/profile/get", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: targetUsername }),
        });

        const data = (await response.json()) as GetProfileResponse;
        if (!response.ok) {
          throw new Error("Profil konnte nicht geladen werden.");
        }

        setProfile(data.profile ?? createDefaultProfile());
        setSpeakerProfile(data.speakerProfile ?? createDefaultSpeakerProfile());
      } catch {
        setIsError(true);
        setMessage("Profil konnte nicht geladen werden.");
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [account, targetUsername]);

  async function saveProfile() {
    if (!account || !targetUsername) {
      return;
    }

    setIsSaving(true);
    setMessage("");
    setIsError(false);

    try {
      const response = await fetch("/api/profile/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: targetUsername,
          profile,
        }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message ?? "Profil konnte nicht gespeichert werden.");
      }

      setMessage(data.message ?? "Profil gespeichert.");
    } catch {
      setIsError(true);
      setMessage("Profil konnte nicht gespeichert werden.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveSpeakerProfile() {
    if (!account || !targetUsername) return;

    setIsSavingSpeaker(true);
    setMessage("");
    setIsError(false);

    try {
      const response = await fetch("/api/speakers/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: targetUsername,
          speakerProfile,
        }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message ?? "Sprecherprofil konnte nicht gespeichert werden.");
      }

      setMessage(data.message ?? "Sprecherprofil gespeichert.");
    } catch {
      setIsError(true);
      setMessage("Sprecherprofil konnte nicht gespeichert werden.");
    } finally {
      setIsSavingSpeaker(false);
    }
  }

  async function uploadSample(file: File) {
    if (!targetUsername) return;

    setIsUploadingSample(true);
    setMessage("");
    setIsError(false);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("username", targetUsername);

      const response = await fetch("/api/speakers/upload-sample", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as { message?: string; sample?: { id: string; filename: string; url: string; uploadedAt: string } };
      if (!response.ok || !data.sample) {
        throw new Error(data.message ?? "Upload fehlgeschlagen.");
      }

      setSpeakerProfile((current) => ({
        ...current,
        sprechproben: [...current.sprechproben, data.sample!],
      }));
      setMessage("Sprechprobe hochgeladen.");
    } catch {
      setIsError(true);
      setMessage("Upload fehlgeschlagen.");
    } finally {
      setIsUploadingSample(false);
    }
  }

  async function deleteSample(sampleId: string) {
    if (!targetUsername) return;

    try {
      const res = await fetch("/api/speakers/delete-sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: targetUsername, sampleId }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Löschen fehlgeschlagen.");

      setSpeakerProfile((current) => ({
        ...current,
        sprechproben: current.sprechproben.filter((s) => s.id !== sampleId),
      }));
      setMessage("Sprechprobe gelöscht.");
    } catch {
      setIsError(true);
      setMessage("Löschen fehlgeschlagen.");
    }
  }

  async function uploadImage(file: File) {
    if (!targetUsername) {
      return;
    }

    setIsUploadingImage(true);
    setMessage("");
    setIsError(false);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("username", targetUsername);

      const response = await fetch("/api/profile/upload-image", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as { message?: string; imageUrl?: string };
      if (!response.ok || !data.imageUrl) {
        throw new Error(data.message ?? "Upload fehlgeschlagen.");
      }

      setProfile((current) => ({
        ...current,
        profileImage: {
          ...current.profileImage,
          value: data.imageUrl as string,
        },
      }));
      setMessage("Bild erfolgreich hochgeladen.");
    } catch {
      setIsError(true);
      setMessage("Bild-Upload fehlgeschlagen.");
    } finally {
      setIsUploadingImage(false);
    }
  }

  async function uploadSpeakerImage(file: File) {
    if (!targetUsername) return;

    setIsUploadingSpeakerImage(true);
    setMessage("");
    setIsError(false);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("username", targetUsername);

      const response = await fetch("/api/profile/upload-image", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as { message?: string; imageUrl?: string };
      if (!response.ok || !data.imageUrl) {
        throw new Error(data.message ?? "Upload fehlgeschlagen.");
      }

      setSpeakerProfile((current) => ({
        ...current,
        profileImage: {
          ...current.profileImage,
          value: data.imageUrl as string,
        },
      }));
      setMessage("Sprecher-Bild erfolgreich hochgeladen.");
    } catch {
      setIsError(true);
      setMessage("Sprecher-Bild-Upload fehlgeschlagen.");
    } finally {
      setIsUploadingSpeakerImage(false);
    }
  }

  const imagePreviewStyle = useMemo(() => {
    const imageUrl = profile.profileImage.value;
    if (!imageUrl) {
      return undefined;
    }

    return {
      backgroundImage: `url(${imageUrl})`,
      backgroundPosition: `${profile.profileImage.crop.x}% ${profile.profileImage.crop.y}%`,
      backgroundSize: `${profile.profileImage.crop.zoom * 100}%`,
      backgroundRepeat: "no-repeat",
    };
  }, [profile.profileImage]);

  const speakerImagePreviewStyle = useMemo(() => {
    const imageUrl = speakerProfile.profileImage?.value;
    if (!imageUrl) return undefined;

    return {
      backgroundImage: `url(${imageUrl})`,
      backgroundPosition: `${speakerProfile.profileImage.crop.x}% ${speakerProfile.profileImage.crop.y}%`,
      backgroundSize: `${speakerProfile.profileImage.crop.zoom * 100}%`,
      backgroundRepeat: "no-repeat",
    };
  }, [speakerProfile.profileImage]);

  function updateVisibility(field: keyof ProfileData, visibility: Visibility) {
    setProfile((current) => ({
      ...current,
      [field]: {
        ...current[field],
        visibility,
      },
    }));
  }

  function clampPercent(value: number) {
    return Math.max(0, Math.min(100, value));
  }

  function onImagePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startCropX: profile.profileImage.crop.x,
      startCropY: profile.profileImage.crop.y,
    };
  }

  function onImagePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const previewSize = event.currentTarget.clientWidth || 160;
    const zoom = profile.profileImage.crop.zoom || 1;
    const factor = (100 / previewSize) / zoom;
    const deltaX = (event.clientX - dragState.startX) * factor;
    const deltaY = (event.clientY - dragState.startY) * factor;

    setProfile((current) => ({
      ...current,
      profileImage: {
        ...current.profileImage,
        crop: {
          ...current.profileImage.crop,
              x: clampPercent(dragState.startCropX - deltaX),
              y: clampPercent(dragState.startCropY - deltaY),
        },
      },
    }));
  }

  function onImagePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function onSpeakerImagePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    speakerDragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startCropX: speakerProfile.profileImage.crop.x,
      startCropY: speakerProfile.profileImage.crop.y,
    };
  }

  function onSpeakerImagePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const dragState = speakerDragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const previewSize = event.currentTarget.clientWidth || 160;
    const zoom = speakerProfile.profileImage.crop.zoom || 1;
    const factor = (100 / previewSize) / zoom;
    const deltaX = (event.clientX - dragState.startX) * factor;
    const deltaY = (event.clientY - dragState.startY) * factor;

    setSpeakerProfile((current) => ({
      ...current,
      profileImage: {
        ...current.profileImage,
        crop: {
          ...current.profileImage.crop,
          x: clampPercent(dragState.startCropX - deltaX),
          y: clampPercent(dragState.startCropY - deltaY),
        },
      },
    }));
  }

  function onSpeakerImagePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (speakerDragStateRef.current?.pointerId === event.pointerId) {
      speakerDragStateRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  if (!account) {
    return (
      <main className="centered-main">
        <section className="card">
          <h1>Profil</h1>
          <p>Bitte zuerst anmelden, um dein Profil auszufüllen.</p>
          <Link href="/auth" className="btn">
            Zur Anmeldung
          </Link>
        </section>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="centered-main">
        <section className="card">
          <p>Profil wird geladen ...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="centered-main">
      <section className="card">
        <h1>Profil ausfüllen</h1>
        {account.role === "SUPERADMIN" && requestedUser && (
          <p>
            Profil von <strong>{targetUsername}</strong>
          </p>
        )}

        {/* Tab-Auswahl */}
        <div className="flex gap-1.5 border-b border-arena-border pb-2">
          <button
            type="button"
            className={`px-4 py-2 rounded-t-lg text-sm font-medium cursor-pointer border-none min-h-[44px] sm:min-h-0 ${activeTab === "autor" ? "bg-arena-blue text-white" : "bg-gray-100 text-arena-text"}`}
            onClick={() => { setActiveTab("autor"); setMessage(""); }}
          >
            Autorenprofil
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-t-lg text-sm font-medium cursor-pointer border-none min-h-[44px] sm:min-h-0 ${activeTab === "sprecher" ? "bg-arena-blue text-white" : "bg-gray-100 text-arena-text"}`}
            onClick={() => { setActiveTab("sprecher"); setMessage(""); }}
          >
            Sprecherprofil
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-t-lg text-sm font-medium cursor-pointer border-none min-h-[44px] sm:min-h-0 ${activeTab === "buecher" ? "bg-arena-blue text-white" : "bg-gray-100 text-arena-text"}`}
            onClick={() => { setActiveTab("buecher"); setMessage(""); }}
          >
            Meine Bücher
          </button>
        </div>

        {activeTab === "autor" && (
        <>
        <h2 className="text-lg mt-0">Autorenprofil</h2>
        <p className="text-arena-muted text-[0.95rem]">
          Fülle dein Autorenprofil aus. Öffentlich sichtbare Felder werden auf deiner Autorenseite angezeigt.
        </p>

        <div className="grid justify-center items-start gap-4" style={{ gridTemplateColumns: "180px" }}>
          <button
            type="button"
            className="border-0 bg-transparent p-0 m-0 cursor-pointer"
            onClick={() => setIsImageOverlayOpen(true)}
          >
            <div className="w-[160px] h-[160px] border border-arena-border rounded-full bg-arena-bg overflow-hidden grid place-items-center text-xs text-center p-2 box-border" style={imagePreviewStyle}>
              {!profile.profileImage.value && <span>Kein Bild gewählt</span>}
            </div>
          </button>
        </div>

        <FieldWithVisibility
          label="Name"
          value={profile.name.value}
          visibility={profile.name.visibility}
          onValueChange={(value) =>
            setProfile((current) => ({
              ...current,
              name: { ...current.name, value },
            }))
          }
          onVisibilityChange={(visibility) => updateVisibility("name", visibility)}
        />

        <FieldWithVisibility
          label="Motto"
          value={profile.motto.value}
          visibility={profile.motto.visibility}
          onValueChange={(value) =>
            setProfile((current) => ({
              ...current,
              motto: { ...current.motto, value },
            }))
          }
          onVisibilityChange={(visibility) => updateVisibility("motto", visibility)}
        />

        <FieldWithVisibility
          label="Beruf"
          value={profile.beruf.value}
          visibility={profile.beruf.visibility}
          onValueChange={(value) =>
            setProfile((current) => ({
              ...current,
              beruf: { ...current.beruf, value },
            }))
          }
          onVisibilityChange={(visibility) => updateVisibility("beruf", visibility)}
        />

        <FieldWithVisibility
          label="Ort"
          value={profile.city.value}
          visibility={profile.city.visibility}
          onValueChange={(value) =>
            setProfile((current) => ({
              ...current,
              city: { ...current.city, value },
            }))
          }
          onVisibilityChange={(visibility) => updateVisibility("city", visibility)}
        />

        <FieldWithVisibility
          label="Land"
          value={profile.country.value}
          visibility={profile.country.visibility}
          onValueChange={(value) =>
            setProfile((current) => ({
              ...current,
              country: { ...current.country, value },
            }))
          }
          onVisibilityChange={(visibility) => updateVisibility("country", visibility)}
        />

        <FieldWithVisibility
          label="Social Media: Instagram"
          value={profile.socialInstagram.value}
          visibility={profile.socialInstagram.visibility}
          onValueChange={(value) =>
            setProfile((current) => ({
              ...current,
              socialInstagram: { ...current.socialInstagram, value },
            }))
          }
          onVisibilityChange={(visibility) =>
            updateVisibility("socialInstagram", visibility)
          }
        />

        <FieldWithVisibility
          label="Social Media: Facebook"
          value={profile.socialFacebook.value}
          visibility={profile.socialFacebook.visibility}
          onValueChange={(value) =>
            setProfile((current) => ({
              ...current,
              socialFacebook: { ...current.socialFacebook, value },
            }))
          }
          onVisibilityChange={(visibility) => updateVisibility("socialFacebook", visibility)}
        />

        <FieldWithVisibility
          label="Social Media: LinkedIn"
          value={profile.socialLinkedin.value}
          visibility={profile.socialLinkedin.visibility}
          onValueChange={(value) =>
            setProfile((current) => ({
              ...current,
              socialLinkedin: { ...current.socialLinkedin, value },
            }))
          }
          onVisibilityChange={(visibility) => updateVisibility("socialLinkedin", visibility)}
        />

        <FieldWithVisibility
          label="Social Media: TikTok"
          value={profile.socialTiktok.value}
          visibility={profile.socialTiktok.visibility}
          onValueChange={(value) =>
            setProfile((current) => ({
              ...current,
              socialTiktok: { ...current.socialTiktok, value },
            }))
          }
          onVisibilityChange={(visibility) => updateVisibility("socialTiktok", visibility)}
        />

        <FieldWithVisibility
          label="Social Media: YouTube"
          value={profile.socialYoutube.value}
          visibility={profile.socialYoutube.visibility}
          onValueChange={(value) =>
            setProfile((current) => ({
              ...current,
              socialYoutube: { ...current.socialYoutube, value },
            }))
          }
          onVisibilityChange={(visibility) => updateVisibility("socialYoutube", visibility)}
        />

        <FieldWithVisibility
          label="Social Media: Pinterest"
          value={profile.socialPinterest.value}
          visibility={profile.socialPinterest.visibility}
          onValueChange={(value) =>
            setProfile((current) => ({
              ...current,
              socialPinterest: { ...current.socialPinterest, value },
            }))
          }
          onVisibilityChange={(visibility) => updateVisibility("socialPinterest", visibility)}
        />

        <FieldWithVisibility
          label="Social Media: Reddit"
          value={profile.socialReddit.value}
          visibility={profile.socialReddit.visibility}
          onValueChange={(value) =>
            setProfile((current) => ({
              ...current,
              socialReddit: { ...current.socialReddit, value },
            }))
          }
          onVisibilityChange={(visibility) => updateVisibility("socialReddit", visibility)}
        />

        <div className="flex gap-2 flex-wrap">
          {profile.socialInstagram.value && (
            <a className="btn" href={profile.socialInstagram.value} target="_blank" rel="noreferrer">
              Instagram
            </a>
          )}
          {profile.socialFacebook.value && (
            <a className="btn" href={profile.socialFacebook.value} target="_blank" rel="noreferrer">
              Facebook
            </a>
          )}
          {profile.socialLinkedin.value && (
            <a className="btn" href={profile.socialLinkedin.value} target="_blank" rel="noreferrer">
              LinkedIn
            </a>
          )}
          {profile.socialTiktok.value && (
            <a className="btn" href={profile.socialTiktok.value} target="_blank" rel="noreferrer">
              TikTok
            </a>
          )}
          {profile.socialYoutube.value && (
            <a className="btn" href={profile.socialYoutube.value} target="_blank" rel="noreferrer">
              YouTube
            </a>
          )}
          {profile.socialPinterest.value && (
            <a className="btn" href={profile.socialPinterest.value} target="_blank" rel="noreferrer">
              Pinterest
            </a>
          )}
          {profile.socialReddit.value && (
            <a className="btn" href={profile.socialReddit.value} target="_blank" rel="noreferrer">
              Reddit
            </a>
          )}
        </div>

        <button type="button" className="btn" onClick={saveProfile} disabled={isSaving}>
          {isSaving ? "Speichern ..." : "Profil speichern"}
        </button>
        </>
        )}

        {activeTab === "sprecher" && (
        <>
        <h2 className="text-lg mt-0">Sprecherprofil</h2>
        <p className="text-arena-muted text-[0.95rem]">
          Fülle dein Profil als Hörbuchsprecher aus. Öffentlich sichtbare Felder werden auf deiner Sprecherseite angezeigt.
        </p>

        <div className="grid justify-center items-start gap-4" style={{ gridTemplateColumns: "180px" }}>
          <button
            type="button"
            className="border-0 bg-transparent p-0 m-0 cursor-pointer"
            onClick={() => setIsSpeakerImageOverlayOpen(true)}
          >
            <div className="w-[160px] h-[160px] border border-arena-border rounded-full bg-arena-bg overflow-hidden grid place-items-center text-xs text-center p-2 box-border" style={speakerImagePreviewStyle}>
              {!speakerProfile.profileImage?.value && <span>Kein Bild gewählt</span>}
            </div>
          </button>
        </div>

        <FieldWithVisibility
          label="Name"
          value={speakerProfile.name.value}
          visibility={speakerProfile.name.visibility}
          onValueChange={(value) =>
            setSpeakerProfile((c) => ({ ...c, name: { ...c.name, value } }))
          }
          onVisibilityChange={(visibility) =>
            setSpeakerProfile((c) => ({ ...c, name: { ...c.name, visibility } }))
          }
        />

        <FieldWithVisibility
          label="Ort"
          value={speakerProfile.ort.value}
          visibility={speakerProfile.ort.visibility}
          onValueChange={(value) =>
            setSpeakerProfile((c) => ({ ...c, ort: { ...c.ort, value } }))
          }
          onVisibilityChange={(visibility) =>
            setSpeakerProfile((c) => ({ ...c, ort: { ...c.ort, visibility } }))
          }
        />

        <FieldWithVisibility
          label="Motto"
          value={speakerProfile.motto.value}
          visibility={speakerProfile.motto.visibility}
          onValueChange={(value) =>
            setSpeakerProfile((c) => ({ ...c, motto: { ...c.motto, value } }))
          }
          onVisibilityChange={(visibility) =>
            setSpeakerProfile((c) => ({ ...c, motto: { ...c.motto, visibility } }))
          }
        />

        <FieldWithVisibility
          label="Webseite"
          value={speakerProfile.webseite.value}
          visibility={speakerProfile.webseite.visibility}
          onValueChange={(value) =>
            setSpeakerProfile((c) => ({ ...c, webseite: { ...c.webseite, value } }))
          }
          onVisibilityChange={(visibility) =>
            setSpeakerProfile((c) => ({ ...c, webseite: { ...c.webseite, visibility } }))
          }
        />

        <FieldWithVisibility
          label="Infovideo (YouTube / Vimeo URL)"
          value={speakerProfile.infovideo.value}
          visibility={speakerProfile.infovideo.visibility}
          onValueChange={(value) =>
            setSpeakerProfile((c) => ({ ...c, infovideo: { ...c.infovideo, value } }))
          }
          onVisibilityChange={(visibility) =>
            setSpeakerProfile((c) => ({ ...c, infovideo: { ...c.infovideo, visibility } }))
          }
        />

        <div className="mt-2">
          <h3 className="text-[0.95rem] font-semibold mb-2">Sprechproben (MP3)</h3>

          {speakerProfile.sprechproben.length > 0 && (
            <div className="grid gap-2 mb-3">
              {speakerProfile.sprechproben.map((sample) => (
                <div key={sample.id} className="flex items-center gap-3 rounded-lg border border-arena-border p-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium break-all">{sample.filename}</p>
                    <audio controls className="mt-1 w-full max-w-[350px]">
                      <source src={sample.url} type="audio/mpeg" />
                    </audio>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => deleteSample(sample.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <label className="grid gap-1 text-[0.95rem]">
            MP3-Datei hochladen
            <input
              type="file"
              accept=".mp3,audio/mpeg"
              onChange={(event) => {
                const selectedFile = event.target.files?.[0];
                if (selectedFile) void uploadSample(selectedFile);
                event.currentTarget.value = "";
              }}
            />
            {isUploadingSample && <span className="text-xs text-arena-muted">Wird hochgeladen ...</span>}
          </label>
        </div>

        <button type="button" className="btn" onClick={saveSpeakerProfile} disabled={isSavingSpeaker}>
          {isSavingSpeaker ? "Speichern ..." : "Sprecherprofil speichern"}
        </button>
        </>
        )}

        {activeTab === "buecher" && (
          <>
          <h2 className="text-lg mt-0">Meine Bücher</h2>
          <p className="text-arena-muted text-[0.95rem]">
            Lege hier deine Bücher an und verwalte sie. Die Bücher werden auf deiner Autorenseite und in der Bücherübersicht angezeigt.
          </p>
          <MeineBuecherTab username={targetUsername} />
          </>
        )}

        <p className={isError ? "min-h-[1.3rem] mt-3.5 text-red-700" : "min-h-[1.3rem] mt-3.5"}>{message}</p>

        {/* Konto deaktivieren – nur für den eigenen Account (nicht als Admin für andere) */}
        {account && (!requestedUser || requestedUser === account.username) && account.role !== "SUPERADMIN" && (
          <div className="mt-6">
            <hr />
            <h2>Konto deaktivieren</h2>
            <p className="text-sm text-arena-muted mb-3">
              Wenn du dein Konto deaktivierst, werden dein Profil und deine Bücher
              nicht mehr öffentlich angezeigt. Du kannst dich nicht mehr einloggen,
              bis ein Admin dein Konto wieder aktiviert.
            </p>
            <button
              type="button"
              className="btn btn-danger"
              disabled={isDeactivating}
              onClick={async () => {
                if (!confirm("Möchtest du dein Konto wirklich deaktivieren?")) {
                  return;
                }
                setIsDeactivating(true);
                setMessage("");
                setIsError(false);
                try {
                  const res = await fetch("/api/profile/deactivate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username: account.username }),
                  });
                  const data = (await res.json()) as { message?: string };
                  if (!res.ok) {
                    throw new Error(data.message ?? "Deaktivierung fehlgeschlagen.");
                  }
                  clearStoredAccount();
                  setMessage(data.message ?? "Konto deaktiviert.");
                } catch (err) {
                  setIsError(true);
                  setMessage(
                    err instanceof Error ? err.message : "Deaktivierung fehlgeschlagen."
                  );
                } finally {
                  setIsDeactivating(false);
                }
              }}
            >
              {isDeactivating ? "Wird deaktiviert ..." : "Konto deaktivieren"}
            </button>
          </div>
        )}
      </section>

      {isImageOverlayOpen && (
        <div className="overlay-backdrop" onClick={() => setIsImageOverlayOpen(false)}>
          <section className="w-[min(560px,100%)] bg-white rounded-xl p-4 box-border grid gap-3 justify-items-center" onClick={(event) => event.stopPropagation()}>
            <h2>Bildeinstellungen</h2>

            <label>
              Datei auswählen
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const selectedFile = event.target.files?.[0];
                  if (selectedFile) {
                    void uploadImage(selectedFile);
                  }
                  event.currentTarget.value = "";
                }}
              />
              {isUploadingImage && <span className="text-xs text-arena-muted">Bild wird hochgeladen ...</span>}
            </label>

            <div>
              <span className="block text-xs mb-1">Sichtbarkeit</span>
              <VisibilityToggle
                value={profile.profileImage.visibility}
                onChange={(visibility) => updateVisibility("profileImage", visibility)}
              />
            </div>

            <div
              className="w-[160px] h-[160px] border border-arena-border rounded-full bg-arena-bg overflow-hidden grid place-items-center text-xs text-center p-2 box-border cursor-grab"
              style={imagePreviewStyle}
              onPointerDown={onImagePointerDown}
              onPointerMove={onImagePointerMove}
              onPointerUp={onImagePointerUp}
              onPointerCancel={onImagePointerUp}
            >
              {!profile.profileImage.value && <span>Kein Bild gewählt</span>}
            </div>

            <div className="grid gap-2.5">
              <label>
                Zoom
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={profile.profileImage.crop.zoom}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      profileImage: {
                        ...current.profileImage,
                        crop: {
                          ...current.profileImage.crop,
                          zoom: Number(event.target.value),
                        },
                      },
                    }))
                  }
                />
              </label>
            </div>

            <button
              type="button"
              className="btn"
              onClick={() => setIsImageOverlayOpen(false)}
            >
              Fertig
            </button>
          </section>
        </div>
      )}

      {isSpeakerImageOverlayOpen && (
        <div className="overlay-backdrop" onClick={() => setIsSpeakerImageOverlayOpen(false)}>
          <section className="w-[min(560px,100%)] bg-white rounded-xl p-4 box-border grid gap-3 justify-items-center" onClick={(event) => event.stopPropagation()}>
            <h2>Sprecher-Bildeinstellungen</h2>

            <label>
              Datei auswählen
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const selectedFile = event.target.files?.[0];
                  if (selectedFile) {
                    void uploadSpeakerImage(selectedFile);
                  }
                  event.currentTarget.value = "";
                }}
              />
              {isUploadingSpeakerImage && <span className="text-xs text-arena-muted">Bild wird hochgeladen ...</span>}
            </label>

            <div>
              <span className="block text-xs mb-1">Sichtbarkeit</span>
              <VisibilityToggle
                value={speakerProfile.profileImage.visibility}
                onChange={(visibility) =>
                  setSpeakerProfile((current) => ({
                    ...current,
                    profileImage: { ...current.profileImage, visibility },
                  }))
                }
              />
            </div>

            <div
              className="w-[160px] h-[160px] border border-arena-border rounded-full bg-arena-bg overflow-hidden grid place-items-center text-xs text-center p-2 box-border cursor-grab"
              style={speakerImagePreviewStyle}
              onPointerDown={onSpeakerImagePointerDown}
              onPointerMove={onSpeakerImagePointerMove}
              onPointerUp={onSpeakerImagePointerUp}
              onPointerCancel={onSpeakerImagePointerUp}
            >
              {!speakerProfile.profileImage?.value && <span>Kein Bild gewählt</span>}
            </div>

            <div className="grid gap-2.5">
              <label>
                Zoom
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={speakerProfile.profileImage.crop.zoom}
                  onChange={(event) =>
                    setSpeakerProfile((current) => ({
                      ...current,
                      profileImage: {
                        ...current.profileImage,
                        crop: {
                          ...current.profileImage.crop,
                          zoom: Number(event.target.value),
                        },
                      },
                    }))
                  }
                />
              </label>
            </div>

            <button
              type="button"
              className="btn"
              onClick={() => setIsSpeakerImageOverlayOpen(false)}
            >
              Fertig
            </button>
          </section>
        </div>
      )}
    </main>
  );
}

type FieldWithVisibilityProps = {
  label: string;
  value: string;
  visibility: Visibility;
  onValueChange: (value: string) => void;
  onVisibilityChange: (visibility: Visibility) => void;
};

function FieldWithVisibility({
  label,
  value,
  visibility,
  onValueChange,
  onVisibilityChange,
}: FieldWithVisibilityProps) {
  return (
    <div className="grid grid-cols-[2fr_1fr] gap-3 max-[780px]:grid-cols-1">
      <label className="grid gap-1 text-[0.95rem]">
        {label}
        <input className="input-base" value={value} onChange={(event) => onValueChange(event.target.value)} />
      </label>

      <div>
        <span className="block text-xs mb-1">Sichtbarkeit</span>
        <VisibilityToggle value={visibility} onChange={onVisibilityChange} />
      </div>
    </div>
  );
}

type VisibilityToggleProps = {
  value: Visibility;
  onChange: (visibility: Visibility) => void;
};

function VisibilityToggle({ value, onChange }: VisibilityToggleProps) {
  return (
    <div className="flex gap-1 flex-wrap" role="group" aria-label="Sichtbarkeit auswählen">
      {visibilityOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          className={option.value === value ? "border border-arena-border rounded-full bg-gray-200 text-gray-600 px-3 py-2 sm:px-2 sm:py-1 text-xs cursor-pointer min-h-[44px] sm:min-h-0" : "border border-arena-border rounded-full bg-white px-3 py-2 sm:px-2 sm:py-1 text-xs cursor-pointer min-h-[44px] sm:min-h-0"}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
