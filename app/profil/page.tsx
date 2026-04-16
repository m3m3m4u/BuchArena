"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  ACCOUNT_CHANGED_EVENT,
  clearStoredAccount,
  getStoredAccount,
  setStoredAccount,
  type LoggedInAccount,
} from "@/lib/client-account";
import { createDefaultProfile, createDefaultSpeakerProfile, createDefaultBloggerProfile, createDefaultTestleserProfile, createDefaultLektorenProfile, createDefaultVerlageProfile, type ProfileData, type SpeakerProfileData, type BloggerProfileData, type TestleserProfileData, type LektorenProfileData, type VerlageProfileData, type Visibility } from "@/lib/profile";
import MeineBuecherTab from "@/app/components/meine-buecher-tab";
import GenrePicker from "@/app/components/genre-picker";
import KooperationenTab from "@/app/components/kooperationen-tab";
import { showLesezeichenToast } from "@/app/components/lesezeichen-toast";

type ProfileTab = "autor" | "sprecher" | "blogger" | "testleser" | "lektoren" | "verlage" | "buecher" | "kooperationen" | "konto";

type GetProfileResponse = {
  profile: ProfileData;
  speakerProfile?: SpeakerProfileData;
  bloggerProfile?: BloggerProfileData;
  testleserProfile?: TestleserProfileData;
  lektorenProfile?: LektorenProfileData;
  verlageProfile?: VerlageProfileData;
  newsletterOptIn?: boolean;
  emailOnUnreadMessages?: boolean;
  displayName?: string;
  profileSlug?: string;
};

const visibilityOptions: Array<{ value: Visibility; label: string }> = [
  { value: "internal", label: "intern" },
  { value: "public", label: "öffentlich" },
  { value: "hidden", label: "nicht" },
];

export default function ProfilPage() {
  return (
    <Suspense fallback={<main className="centered-main"><section className="card"><p>Lade Profil …</p></section></main>}>
      <ProfilPageInner />
    </Suspense>
  );
}

function ProfilPageInner() {
  const searchParams = useSearchParams();
  const [account, setAccount] = useState<LoggedInAccount | null>(null);
  const [requestedUser, setRequestedUser] = useState("");
  const [activeTab, setActiveTab] = useState<ProfileTab>("autor");
  const [profile, setProfile] = useState<ProfileData>(createDefaultProfile());
  const [speakerProfile, setSpeakerProfile] = useState<SpeakerProfileData>(createDefaultSpeakerProfile());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingSpeaker, setIsSavingSpeaker] = useState(false);
  const [isSavingBlogger, setIsSavingBlogger] = useState(false);
  const [bloggerProfile, setBloggerProfile] = useState<BloggerProfileData>(createDefaultBloggerProfile());
  const [testleserProfile, setTestleserProfile] = useState<TestleserProfileData>(createDefaultTestleserProfile());
  const [lektorenProfile, setLektorenProfile] = useState<LektorenProfileData>(createDefaultLektorenProfile());
  const [isSavingTestleser, setIsSavingTestleser] = useState(false);
  const [isSavingLektoren, setIsSavingLektoren] = useState(false);
  const [verlageProfile, setVerlageProfile] = useState<VerlageProfileData>(createDefaultVerlageProfile());
  const [isSavingVerlage, setIsSavingVerlage] = useState(false);
  const [isTestleserImageOverlayOpen, setIsTestleserImageOverlayOpen] = useState(false);
  const [isUploadingTestleserImage, setIsUploadingTestleserImage] = useState(false);
  const testleserDragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startCropX: number;
    startCropY: number;
  } | null>(null);
  const [isLektorenImageOverlayOpen, setIsLektorenImageOverlayOpen] = useState(false);
  const [isUploadingLektorenImage, setIsUploadingLektorenImage] = useState(false);
  const lektorenDragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startCropX: number;
    startCropY: number;
  } | null>(null);
  const [isVerlageImageOverlayOpen, setIsVerlageImageOverlayOpen] = useState(false);
  const [isUploadingVerlageImage, setIsUploadingVerlageImage] = useState(false);
  const verlageDragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startCropX: number;
    startCropY: number;
  } | null>(null);
  const [isBloggerImageOverlayOpen, setIsBloggerImageOverlayOpen] = useState(false);
  const [isUploadingBloggerImage, setIsUploadingBloggerImage] = useState(false);
  const bloggerDragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startCropX: number;
    startCropY: number;
  } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingSample, setIsUploadingSample] = useState(false);
  const [isImageOverlayOpen, setIsImageOverlayOpen] = useState(false);
  const [isSpeakerImageOverlayOpen, setIsSpeakerImageOverlayOpen] = useState(false);
  const [isUploadingSpeakerImage, setIsUploadingSpeakerImage] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [accountNewUsername, setAccountNewUsername] = useState("");
  const [accountNewEmail, setAccountNewEmail] = useState("");
  const [accountNewPassword, setAccountNewPassword] = useState("");
  const [accountNewPasswordConfirm, setAccountNewPasswordConfirm] = useState("");
  const [accountCurrentPassword, setAccountCurrentPassword] = useState("");
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [isSavingNewsletter, setIsSavingNewsletter] = useState(false);
  const [emailOnUnreadMessages, setEmailOnUnreadMessages] = useState(false);
  const [isSavingUnreadMail, setIsSavingUnreadMail] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);
  const [profileSlug, setProfileSlug] = useState("");
  const [isSavingSlug, setIsSavingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
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
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const speakerImageFileInputRef = useRef<HTMLInputElement>(null);
  const bloggerImageFileInputRef = useRef<HTMLInputElement>(null);
  const testleserImageFileInputRef = useRef<HTMLInputElement>(null);
  const lektorenImageFileInputRef = useRef<HTMLInputElement>(null);
  const verlageImageFileInputRef = useRef<HTMLInputElement>(null);

  /* ── Dirty-Tracking: Snapshots nach Laden/Speichern ── */
  const savedProfileSnap = useRef("");
  const savedSpeakerSnap = useRef("");
  const savedBloggerSnap = useRef("");
  const savedTestleserSnap = useRef("");
  const savedLektorenSnap = useRef("");
  const savedVerlageSnap = useRef("");

  function isCurrentTabDirty(): boolean {
    switch (activeTab) {
      case "autor":    return JSON.stringify(profile) !== savedProfileSnap.current;
      case "sprecher": return JSON.stringify(speakerProfile) !== savedSpeakerSnap.current;
      case "blogger":  return JSON.stringify(bloggerProfile) !== savedBloggerSnap.current;
      case "testleser":return JSON.stringify(testleserProfile) !== savedTestleserSnap.current;
      case "lektoren": return JSON.stringify(lektorenProfile) !== savedLektorenSnap.current;
      case "verlage":  return JSON.stringify(verlageProfile) !== savedVerlageSnap.current;
      default:         return false;
    }
  }

  function isAnyTabDirty(): boolean {
    return (
      JSON.stringify(profile) !== savedProfileSnap.current ||
      JSON.stringify(speakerProfile) !== savedSpeakerSnap.current ||
      JSON.stringify(bloggerProfile) !== savedBloggerSnap.current ||
      JSON.stringify(testleserProfile) !== savedTestleserSnap.current ||
      JSON.stringify(lektorenProfile) !== savedLektorenSnap.current ||
      JSON.stringify(verlageProfile) !== savedVerlageSnap.current
    );
  }

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isAnyTabDirty()) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  });

  function handleTabSwitch(tab: ProfileTab) {
    if (tab === activeTab) return;
    if (isCurrentTabDirty()) {
      if (!confirm("Du hast ungespeicherte Änderungen. Trotzdem wechseln?")) return;
    }
    setActiveTab(tab);
    setMessage("");
  }

  const targetUsername =
    account?.role === "SUPERADMIN" && requestedUser ? requestedUser : account?.username ?? "";

  useEffect(() => {
    const user = searchParams.get("user")?.trim() ?? "";
    setRequestedUser(user);

    const tab = searchParams.get("tab")?.trim();
    if (tab === "buecher" || tab === "sprecher" || tab === "autor" || tab === "blogger" || tab === "testleser" || tab === "lektoren" || tab === "verlage" || tab === "kooperationen" || tab === "konto") {
      setActiveTab(tab);
    }
  }, [searchParams]);

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

        const loadedProfile = { ...createDefaultProfile(), ...data.profile };
        const loadedSpeaker = { ...createDefaultSpeakerProfile(), ...data.speakerProfile };
        const loadedBlogger = { ...createDefaultBloggerProfile(), ...data.bloggerProfile };
        const loadedTestleser = { ...createDefaultTestleserProfile(), ...data.testleserProfile };
        const loadedLektoren = { ...createDefaultLektorenProfile(), ...data.lektorenProfile };
        const loadedVerlage = { ...createDefaultVerlageProfile(), ...data.verlageProfile };
        setProfile(loadedProfile);
        setSpeakerProfile(loadedSpeaker);
        setBloggerProfile(loadedBlogger);
        setTestleserProfile(loadedTestleser);
        setLektorenProfile(loadedLektoren);
        setVerlageProfile(loadedVerlage);
        savedProfileSnap.current = JSON.stringify(loadedProfile);
        savedSpeakerSnap.current = JSON.stringify(loadedSpeaker);
        savedBloggerSnap.current = JSON.stringify(loadedBlogger);
        savedTestleserSnap.current = JSON.stringify(loadedTestleser);
        savedLektorenSnap.current = JSON.stringify(loadedLektoren);
        savedVerlageSnap.current = JSON.stringify(loadedVerlage);
        setNewsletterOptIn(!!data.newsletterOptIn);
        setEmailOnUnreadMessages(!!data.emailOnUnreadMessages);
        setDisplayName(data.displayName ?? "");
        setProfileSlug(data.profileSlug ?? "");
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

      const data = (await response.json()) as { message?: string; lesezeichen?: number };
      if (!response.ok) {
        throw new Error(data.message ?? "Profil konnte nicht gespeichert werden.");
      }

      if (data.lesezeichen) showLesezeichenToast(data.lesezeichen);
      setMessage(data.message ?? "Profil gespeichert.");
      savedProfileSnap.current = JSON.stringify(profile);
    } catch {
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
      savedSpeakerSnap.current = JSON.stringify(speakerProfile);
    } catch {
      setIsError(true);
      setMessage("Sprecherprofil konnte nicht gespeichert werden.");
    } finally {
      setIsSavingSpeaker(false);
    }
  }

  async function saveBloggerProfile() {
    if (!account || !targetUsername) return;

    setIsSavingBlogger(true);
    setMessage("");
    setIsError(false);

    try {
      const response = await fetch("/api/bloggers/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: targetUsername,
          bloggerProfile,
        }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message ?? "Bloggerprofil konnte nicht gespeichert werden.");
      }

      setMessage(data.message ?? "Bloggerprofil gespeichert.");
      savedBloggerSnap.current = JSON.stringify(bloggerProfile);
    } catch {
      setIsError(true);
      setMessage("Bloggerprofil konnte nicht gespeichert werden.");
    } finally {
      setIsSavingBlogger(false);
    }
  }

  async function saveTestleserProfile() {
    if (!account || !targetUsername) return;

    setIsSavingTestleser(true);
    setMessage("");
    setIsError(false);

    try {
      const response = await fetch("/api/testleser/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: targetUsername,
          testleserProfile,
        }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message ?? "Testleserprofil konnte nicht gespeichert werden.");
      }

      setMessage(data.message ?? "Testleserprofil gespeichert.");
      savedTestleserSnap.current = JSON.stringify(testleserProfile);
    } catch {
      setIsError(true);
      setMessage("Testleserprofil konnte nicht gespeichert werden.");
    } finally {
      setIsSavingTestleser(false);
    }
  }

  async function saveLektorenProfile() {
    if (!account || !targetUsername) {
      setIsError(true);
      setMessage("Nicht angemeldet oder Benutzername fehlt.");
      return;
    }

    setIsSavingLektoren(true);
    setMessage("");
    setIsError(false);

    try {
      const response = await fetch("/api/lektoren/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: targetUsername,
          lektorenProfile,
        }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message ?? "Lektorenprofil konnte nicht gespeichert werden.");
      }

      setMessage(data.message ?? "Lektorenprofil gespeichert.");
      savedLektorenSnap.current = JSON.stringify(lektorenProfile);
    } catch (err) {
      console.error("Lektorenprofil speichern fehlgeschlagen:", err);
      setIsError(true);
      setMessage(err instanceof Error ? err.message : "Lektorenprofil konnte nicht gespeichert werden.");
    } finally {
      setIsSavingLektoren(false);
    }
  }

  async function saveVerlageProfile() {
    if (!account || !targetUsername) {
      setIsError(true);
      setMessage("Nicht angemeldet oder Benutzername fehlt.");
      return;
    }

    setIsSavingVerlage(true);
    setMessage("");
    setIsError(false);

    try {
      const response = await fetch("/api/verlage/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: targetUsername,
          verlageProfile,
        }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message ?? "Verlagsprofil konnte nicht gespeichert werden.");
      }

      setMessage(data.message ?? "Verlagsprofil gespeichert.");
      savedVerlageSnap.current = JSON.stringify(verlageProfile);
    } catch (err) {
      console.error("Verlagsprofil speichern fehlgeschlagen:", err);
      setIsError(true);
      setMessage(err instanceof Error ? err.message : "Verlagsprofil konnte nicht gespeichert werden.");
    } finally {
      setIsSavingVerlage(false);
    }
  }

  async function uploadSample(file: File) {
    if (!targetUsername) return;

    if (file.size > 50 * 1024 * 1024) {
      setIsError(true);
      setMessage("Die Datei darf maximal 50 MB groß sein.");
      return;
    }

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

      if (response.status === 413) {
        throw new Error("Die Datei ist zu groß. Bitte eine kleinere Datei wählen.");
      }

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

    if (file.size > 5 * 1024 * 1024) {
      setIsError(true);
      setMessage("Das Bild darf maximal 5 MB groß sein.");
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

      if (response.status === 413) {
        throw new Error("Das Bild ist zu groß. Bitte ein kleineres Bild wählen (max. 5 MB).");
      }

      const data = (await response.json()) as { message?: string; imageUrl?: string };
      if (!response.ok || !data.imageUrl) {
        throw new Error(data.message ?? "Upload fehlgeschlagen.");
      }

      setProfile((current) => ({
        ...current,
        profileImage: {
          ...current.profileImage,
          value: data.imageUrl as string,
          visibility: current.profileImage.visibility === "hidden" ? "public" : current.profileImage.visibility,
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

    if (file.size > 5 * 1024 * 1024) {
      setIsError(true);
      setMessage("Das Bild darf maximal 5 MB groß sein.");
      return;
    }

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

      if (response.status === 413) {
        throw new Error("Das Bild ist zu groß. Bitte ein kleineres Bild wählen (max. 5 MB).");
      }

      const data = (await response.json()) as { message?: string; imageUrl?: string };
      if (!response.ok || !data.imageUrl) {
        throw new Error(data.message ?? "Upload fehlgeschlagen.");
      }

      setSpeakerProfile((current) => ({
        ...current,
        profileImage: {
          ...current.profileImage,
          value: data.imageUrl as string,
          visibility: current.profileImage.visibility === "hidden" ? "public" : current.profileImage.visibility,
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

  const bloggerImagePreviewStyle = useMemo(() => {
    const imageUrl = bloggerProfile.profileImage?.value;
    if (!imageUrl) return undefined;

    return {
      backgroundImage: `url(${imageUrl})`,
      backgroundPosition: `${bloggerProfile.profileImage.crop.x}% ${bloggerProfile.profileImage.crop.y}%`,
      backgroundSize: `${bloggerProfile.profileImage.crop.zoom * 100}%`,
      backgroundRepeat: "no-repeat",
    };
  }, [bloggerProfile.profileImage]);

  async function uploadBloggerImage(file: File) {
    if (!targetUsername) return;

    if (file.size > 5 * 1024 * 1024) {
      setIsError(true);
      setMessage("Das Bild darf maximal 5 MB groß sein.");
      return;
    }

    setIsUploadingBloggerImage(true);
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

      if (response.status === 413) {
        throw new Error("Das Bild ist zu groß. Bitte ein kleineres Bild wählen (max. 5 MB).");
      }

      const data = (await response.json()) as { message?: string; imageUrl?: string };
      if (!response.ok || !data.imageUrl) {
        throw new Error(data.message ?? "Upload fehlgeschlagen.");
      }

      setBloggerProfile((current) => ({
        ...current,
        profileImage: {
          ...current.profileImage,
          value: data.imageUrl as string,
          visibility: current.profileImage.visibility === "hidden" ? "public" : current.profileImage.visibility,
        },
      }));
      setMessage("Blogger-Bild erfolgreich hochgeladen.");
    } catch {
      setIsError(true);
      setMessage("Blogger-Bild-Upload fehlgeschlagen.");
    } finally {
      setIsUploadingBloggerImage(false);
    }
  }

  function onBloggerImagePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    bloggerDragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startCropX: bloggerProfile.profileImage.crop.x,
      startCropY: bloggerProfile.profileImage.crop.y,
    };
  }

  function onBloggerImagePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const dragState = bloggerDragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const previewSize = event.currentTarget.clientWidth || 160;
    const zoom = bloggerProfile.profileImage.crop.zoom || 1;
    const factor = (100 / previewSize) / zoom;
    const deltaX = (event.clientX - dragState.startX) * factor;
    const deltaY = (event.clientY - dragState.startY) * factor;

    setBloggerProfile((current) => ({
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

  function onBloggerImagePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (bloggerDragStateRef.current?.pointerId === event.pointerId) {
      bloggerDragStateRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  const testleserImagePreviewStyle = useMemo(() => {
    const imageUrl = testleserProfile.profileImage?.value;
    if (!imageUrl) return undefined;
    return {
      backgroundImage: `url(${imageUrl})`,
      backgroundPosition: `${testleserProfile.profileImage.crop.x}% ${testleserProfile.profileImage.crop.y}%`,
      backgroundSize: `${testleserProfile.profileImage.crop.zoom * 100}%`,
      backgroundRepeat: "no-repeat",
    };
  }, [testleserProfile.profileImage]);

  const lektorenImagePreviewStyle = useMemo(() => {
    const imageUrl = lektorenProfile.profileImage?.value;
    if (!imageUrl) return undefined;
    return {
      backgroundImage: `url(${imageUrl})`,
      backgroundPosition: `${lektorenProfile.profileImage.crop.x}% ${lektorenProfile.profileImage.crop.y}%`,
      backgroundSize: `${lektorenProfile.profileImage.crop.zoom * 100}%`,
      backgroundRepeat: "no-repeat",
    };
  }, [lektorenProfile.profileImage]);

  const verlageImagePreviewStyle = useMemo(() => {
    const imageUrl = verlageProfile.profileImage?.value;
    if (!imageUrl) return undefined;
    return {
      backgroundImage: `url(${imageUrl})`,
      backgroundPosition: `${verlageProfile.profileImage.crop.x}% ${verlageProfile.profileImage.crop.y}%`,
      backgroundSize: `${verlageProfile.profileImage.crop.zoom * 100}%`,
      backgroundRepeat: "no-repeat",
    };
  }, [verlageProfile.profileImage]);

  async function uploadTestleserImage(file: File) {
    if (!targetUsername) return;
    if (file.size > 5 * 1024 * 1024) { setIsError(true); setMessage("Das Bild darf maximal 5 MB groß sein."); return; }
    setIsUploadingTestleserImage(true); setMessage(""); setIsError(false);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("username", targetUsername);
      const response = await fetch("/api/profile/upload-image", { method: "POST", body: formData });
      if (response.status === 413) throw new Error("Das Bild ist zu groß. Bitte ein kleineres Bild wählen (max. 5 MB).");
      const data = (await response.json()) as { message?: string; imageUrl?: string };
      if (!response.ok || !data.imageUrl) throw new Error(data.message ?? "Upload fehlgeschlagen.");
      setTestleserProfile((current) => ({ ...current, profileImage: { ...current.profileImage, value: data.imageUrl as string, visibility: current.profileImage.visibility === "hidden" ? "public" : current.profileImage.visibility } }));
      setMessage("Testleser-Bild erfolgreich hochgeladen.");
    } catch { setIsError(true); setMessage("Testleser-Bild-Upload fehlgeschlagen."); }
    finally { setIsUploadingTestleserImage(false); }
  }

  function onTestleserImagePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    testleserDragStateRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startCropX: testleserProfile.profileImage.crop.x, startCropY: testleserProfile.profileImage.crop.y };
  }
  function onTestleserImagePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const dragState = testleserDragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const previewSize = event.currentTarget.clientWidth || 160;
    const zoom = testleserProfile.profileImage.crop.zoom || 1;
    const factor = (100 / previewSize) / zoom;
    const deltaX = (event.clientX - dragState.startX) * factor;
    const deltaY = (event.clientY - dragState.startY) * factor;
    setTestleserProfile((current) => ({ ...current, profileImage: { ...current.profileImage, crop: { ...current.profileImage.crop, x: clampPercent(dragState.startCropX - deltaX), y: clampPercent(dragState.startCropY - deltaY) } } }));
  }
  function onTestleserImagePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (testleserDragStateRef.current?.pointerId === event.pointerId) { testleserDragStateRef.current = null; event.currentTarget.releasePointerCapture(event.pointerId); }
  }

  async function uploadLektorenImage(file: File) {
    if (!targetUsername) return;
    if (file.size > 5 * 1024 * 1024) { setIsError(true); setMessage("Das Bild darf maximal 5 MB groß sein."); return; }
    setIsUploadingLektorenImage(true); setMessage(""); setIsError(false);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("username", targetUsername);
      const response = await fetch("/api/profile/upload-image", { method: "POST", body: formData });
      if (response.status === 413) throw new Error("Das Bild ist zu groß. Bitte ein kleineres Bild wählen (max. 5 MB).");
      const data = (await response.json()) as { message?: string; imageUrl?: string };
      if (!response.ok || !data.imageUrl) throw new Error(data.message ?? "Upload fehlgeschlagen.");
      setLektorenProfile((current) => ({ ...current, profileImage: { ...current.profileImage, value: data.imageUrl as string, visibility: current.profileImage.visibility === "hidden" ? "public" : current.profileImage.visibility } }));
      setMessage("Lektoren-Bild erfolgreich hochgeladen.");
    } catch { setIsError(true); setMessage("Lektoren-Bild-Upload fehlgeschlagen."); }
    finally { setIsUploadingLektorenImage(false); }
  }

  function onLektorenImagePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    lektorenDragStateRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startCropX: lektorenProfile.profileImage.crop.x, startCropY: lektorenProfile.profileImage.crop.y };
  }
  function onLektorenImagePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const dragState = lektorenDragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const previewSize = event.currentTarget.clientWidth || 160;
    const zoom = lektorenProfile.profileImage.crop.zoom || 1;
    const factor = (100 / previewSize) / zoom;
    const deltaX = (event.clientX - dragState.startX) * factor;
    const deltaY = (event.clientY - dragState.startY) * factor;
    setLektorenProfile((current) => ({ ...current, profileImage: { ...current.profileImage, crop: { ...current.profileImage.crop, x: clampPercent(dragState.startCropX - deltaX), y: clampPercent(dragState.startCropY - deltaY) } } }));
  }
  function onLektorenImagePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (lektorenDragStateRef.current?.pointerId === event.pointerId) { lektorenDragStateRef.current = null; event.currentTarget.releasePointerCapture(event.pointerId); }
  }

  async function uploadVerlageImage(file: File) {
    if (!targetUsername) return;
    if (file.size > 5 * 1024 * 1024) { setIsError(true); setMessage("Das Bild darf maximal 5 MB groß sein."); return; }
    setIsUploadingVerlageImage(true); setMessage(""); setIsError(false);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("username", targetUsername);
      const response = await fetch("/api/profile/upload-image", { method: "POST", body: formData });
      if (response.status === 413) throw new Error("Das Bild ist zu groß. Bitte ein kleineres Bild wählen (max. 5 MB).");
      const data = (await response.json()) as { message?: string; imageUrl?: string };
      if (!response.ok || !data.imageUrl) throw new Error(data.message ?? "Upload fehlgeschlagen.");
      setVerlageProfile((current) => ({ ...current, profileImage: { ...current.profileImage, value: data.imageUrl as string, visibility: current.profileImage.visibility === "hidden" ? "public" : current.profileImage.visibility } }));
      setMessage("Verlags-Bild erfolgreich hochgeladen.");
    } catch { setIsError(true); setMessage("Verlags-Bild-Upload fehlgeschlagen."); }
    finally { setIsUploadingVerlageImage(false); }
  }

  function onVerlageImagePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    verlageDragStateRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startCropX: verlageProfile.profileImage.crop.x, startCropY: verlageProfile.profileImage.crop.y };
  }
  function onVerlageImagePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const dragState = verlageDragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const previewSize = event.currentTarget.clientWidth || 160;
    const zoom = verlageProfile.profileImage.crop.zoom || 1;
    const factor = (100 / previewSize) / zoom;
    const deltaX = (event.clientX - dragState.startX) * factor;
    const deltaY = (event.clientY - dragState.startY) * factor;
    setVerlageProfile((current) => ({ ...current, profileImage: { ...current.profileImage, crop: { ...current.profileImage.crop, x: clampPercent(dragState.startCropX - deltaX), y: clampPercent(dragState.startCropY - deltaY) } } }));
  }
  function onVerlageImagePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (verlageDragStateRef.current?.pointerId === event.pointerId) { verlageDragStateRef.current = null; event.currentTarget.releasePointerCapture(event.pointerId); }
  }

  function updateVisibility(field: keyof Omit<ProfileData, "deaktiviert">, visibility: Visibility) {
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
        <div className="flex gap-1.5 border-b border-arena-border pb-2 max-sm:flex-wrap">
          <button
            type="button"
            className={`px-4 py-2 rounded-t-lg text-sm font-medium cursor-pointer border-none min-h-[44px] sm:min-h-0 max-sm:flex-1 max-sm:min-w-[calc(50%-0.375rem)] ${activeTab === "autor" ? "bg-arena-blue text-white" : "bg-gray-100 text-arena-text"}`}
            onClick={() => handleTabSwitch("autor")}
          >
            Autor
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-t-lg text-sm font-medium cursor-pointer border-none min-h-[44px] sm:min-h-0 max-sm:flex-1 max-sm:min-w-[calc(50%-0.375rem)] ${activeTab === "sprecher" ? "bg-arena-blue text-white" : "bg-gray-100 text-arena-text"}`}
            onClick={() => handleTabSwitch("sprecher")}
          >
            Sprecher
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-t-lg text-sm font-medium cursor-pointer border-none min-h-[44px] sm:min-h-0 max-sm:flex-1 max-sm:min-w-[calc(50%-0.375rem)] ${activeTab === "blogger" ? "bg-arena-blue text-white" : "bg-gray-100 text-arena-text"}`}
            onClick={() => handleTabSwitch("blogger")}
          >
            Blogger
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-t-lg text-sm font-medium cursor-pointer border-none min-h-[44px] sm:min-h-0 max-sm:flex-1 max-sm:min-w-[calc(50%-0.375rem)] ${activeTab === "testleser" ? "bg-arena-blue text-white" : "bg-gray-100 text-arena-text"}`}
            onClick={() => handleTabSwitch("testleser")}
          >
            Testleser
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-t-lg text-sm font-medium cursor-pointer border-none min-h-[44px] sm:min-h-0 max-sm:flex-1 max-sm:min-w-[calc(50%-0.375rem)] ${activeTab === "lektoren" ? "bg-arena-blue text-white" : "bg-gray-100 text-arena-text"}`}
            onClick={() => handleTabSwitch("lektoren")}
          >
            Lektoren
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-t-lg text-sm font-medium cursor-pointer border-none min-h-[44px] sm:min-h-0 max-sm:flex-1 max-sm:min-w-[calc(50%-0.375rem)] ${activeTab === "verlage" ? "bg-arena-blue text-white" : "bg-gray-100 text-arena-text"}`}
            onClick={() => handleTabSwitch("verlage")}
          >
            Verlage
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-t-lg text-sm font-medium cursor-pointer border-none min-h-[44px] sm:min-h-0 max-sm:flex-1 max-sm:min-w-[calc(50%-0.375rem)] ${activeTab === "kooperationen" ? "bg-arena-blue text-white" : "bg-gray-100 text-arena-text"}`}
            onClick={() => handleTabSwitch("kooperationen")}
          >
            Partner
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-t-lg text-sm font-medium cursor-pointer border-none min-h-[44px] sm:min-h-0 max-sm:flex-1 max-sm:min-w-[calc(50%-0.375rem)] ${activeTab === "buecher" ? "bg-arena-blue text-white" : "bg-gray-100 text-arena-text"}`}
            onClick={() => handleTabSwitch("buecher")}
          >
            Bücher
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-t-lg text-sm font-medium cursor-pointer border-none min-h-[44px] sm:min-h-0 max-sm:flex-1 max-sm:min-w-[calc(50%-0.375rem)] ${activeTab === "konto" ? "bg-arena-blue text-white" : "bg-gray-100 text-arena-text"}`}
            onClick={() => handleTabSwitch("konto")}
          >
            Konto
          </button>
        </div>

        {activeTab === "autor" && (
        <>
        <h2 className="text-lg mt-0">Autorenprofil</h2>
        <p className="text-arena-muted text-[0.95rem]">
          Fülle dein Autorenprofil aus. Öffentlich sichtbare Felder werden auf deiner Autorenseite angezeigt.
        </p>

        {/* Profil deaktivieren */}
        <div style={{ background: profile.deaktiviert ? "#fef2f2" : "#f0fdf4", borderRadius: 10, padding: "0.9rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
          <div>
            <span className="text-sm font-semibold">{profile.deaktiviert ? "🚫 Autorenprofil ist deaktiviert" : "✅ Autorenprofil wird angezeigt"}</span>
            <p style={{ fontSize: "0.82rem", margin: "0.15rem 0 0", color: profile.deaktiviert ? "#dc2626" : "#16a34a" }}>
              {profile.deaktiviert ? "Dein Autorenprofil ist momentan nicht sichtbar." : "Dein Autorenprofil ist in der Übersicht sichtbar."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!!profile.deaktiviert}
            className="toggle-switch"
            style={{
              width: 48, height: 26, borderRadius: 13, border: "none",
              background: profile.deaktiviert ? "#dc2626" : "#ccc",
              position: "relative", cursor: "pointer", flexShrink: 0,
              transition: "background 0.2s",
            }}
            onClick={() => setProfile((c) => ({ ...c, deaktiviert: !c.deaktiviert }))}
          >
            <span style={{
              position: "absolute", top: 3, left: profile.deaktiviert ? 24 : 3,
              width: 20, height: 20, borderRadius: "50%", background: "#fff",
              transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </button>
        </div>

        <button type="button" className="btn" onClick={saveProfile} disabled={isSaving}>
          {isSaving ? "Speichern ..." : "Profil speichern"}
        </button>

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

        <label className="grid gap-1 text-[0.95rem]">
          Name oder Pseudonym <span className="text-xs text-arena-muted">(immer öffentlich)</span>
          <input className="input-base" value={profile.name.value} onChange={(e) =>
            setProfile((current) => ({ ...current, name: { value: e.target.value, visibility: "public" } }))
          } />
        </label>

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
          label="Über mich"
          value={profile.ueberMich.value}
          visibility={profile.ueberMich.visibility}
          multiline
          maxLength={2000}
          hint="Tipp: Links werden automatisch klickbar. Eigener Linktext: [Mein Blog](https://example.com)"
          onValueChange={(value) =>
            setProfile((current) => ({
              ...current,
              ueberMich: { ...current.ueberMich, value },
            }))
          }
          onVisibilityChange={(visibility) => updateVisibility("ueberMich", visibility)}
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

        <FieldWithVisibility
          label="Website"
          value={profile.socialWebsite.value}
          visibility={profile.socialWebsite.visibility}
          onValueChange={(value) =>
            setProfile((current) => ({
              ...current,
              socialWebsite: { ...current.socialWebsite, value },
            }))
          }
          onVisibilityChange={(visibility) => updateVisibility("socialWebsite", visibility)}
        />

        <FieldWithVisibility
          label="Linktree"
          value={profile.socialLinktree.value}
          visibility={profile.socialLinktree.visibility}
          onValueChange={(value) =>
            setProfile((current) => ({
              ...current,
              socialLinktree: { ...current.socialLinktree, value },
            }))
          }
          onVisibilityChange={(visibility) => updateVisibility("socialLinktree", visibility)}
        />

        <FieldWithVisibility
          label="Newsletter"
          value={profile.socialNewsletter.value}
          visibility={profile.socialNewsletter.visibility}
          onValueChange={(value) =>
            setProfile((current) => ({
              ...current,
              socialNewsletter: { ...current.socialNewsletter, value },
            }))
          }
          onVisibilityChange={(visibility) => updateVisibility("socialNewsletter", visibility)}
        />

        <FieldWithVisibility
          label="WhatsApp-Kanal"
          value={profile.socialWhatsapp.value}
          visibility={profile.socialWhatsapp.visibility}
          onValueChange={(value) =>
            setProfile((current) => ({
              ...current,
              socialWhatsapp: { ...current.socialWhatsapp, value },
            }))
          }
          onVisibilityChange={(visibility) => updateVisibility("socialWhatsapp", visibility)}
        />

        <FieldWithVisibility
          label="Mailadresse"
          value={profile.socialEmail.value}
          visibility={profile.socialEmail.visibility}
          onValueChange={(value) =>
            setProfile((current) => ({
              ...current,
              socialEmail: { ...current.socialEmail, value },
            }))
          }
          onVisibilityChange={(visibility) => updateVisibility("socialEmail", visibility)}
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
          {profile.socialWebsite.value && (
            <a className="btn" href={profile.socialWebsite.value} target="_blank" rel="noreferrer">
              Website
            </a>
          )}
          {profile.socialLinktree.value && (
            <a className="btn" href={profile.socialLinktree.value} target="_blank" rel="noreferrer">
              Linktree
            </a>
          )}
          {profile.socialNewsletter.value && (
            <a className="btn" href={profile.socialNewsletter.value} target="_blank" rel="noreferrer">
              Newsletter
            </a>
          )}
          {profile.socialWhatsapp.value && (
            <a className="btn" href={profile.socialWhatsapp.value} target="_blank" rel="noreferrer">
              WhatsApp-Kanal
            </a>
          )}
        </div>

        {/* ── Eigene Profil-URL ── */}
        <div style={{ background: "var(--color-arena-bg-soft, #f7f7fa)", borderRadius: 10, padding: "0.9rem 1rem", marginTop: "0.5rem" }}>
          <span className="text-sm font-semibold">🔗 Eigene Profil-URL</span>
          <p className="text-arena-muted" style={{ fontSize: "0.82rem", margin: "0.15rem 0 0.5rem" }}>
            z.{"\u00a0"}B. <strong>bucharena.org/autor/{profileSlug || "dein-name"}</strong>
          </p>
          <div className="flex gap-2 items-end">
            <div className="flex-1 grid gap-1">
              <div className="flex items-center gap-1.5">
                <span className="text-arena-muted text-sm whitespace-nowrap">/autor/</span>
                <input type="text" className="input-base flex-1" placeholder="dein-wunschname" value={profileSlug} onChange={(e) => { setProfileSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setSlugAvailable(null); }} onBlur={async () => { const v = profileSlug.trim(); if (!v) { setSlugAvailable(null); return; } try { const res = await fetch(`/api/profile/slug?slug=${encodeURIComponent(v)}&username=${encodeURIComponent(targetUsername)}`); const data = (await res.json()) as { available: boolean }; setSlugAvailable(data.available); } catch { setSlugAvailable(null); } }} maxLength={40} />
              </div>
              {slugAvailable === true && <span className="text-xs text-green-600">✓ Verfügbar</span>}
              {slugAvailable === false && <span className="text-xs text-red-600">✗ Bereits vergeben</span>}
            </div>
            <button type="button" className="btn btn-primary" disabled={isSavingSlug} onClick={async () => { setIsSavingSlug(true); setMessage(""); setIsError(false); try { const res = await fetch("/api/profile/slug", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: profileSlug, ...(requestedUser ? { username: requestedUser } : {}) }) }); const data = (await res.json()) as { message?: string; slug?: string }; if (!res.ok) throw new Error(data.message ?? "Fehler"); setProfileSlug(data.slug ?? ""); setSlugAvailable(null); setMessage(data.message ?? "Profil-URL gespeichert."); setIsError(false); } catch (err) { setIsError(true); setMessage(err instanceof Error ? err.message : "Fehler"); } finally { setIsSavingSlug(false); } }}>{isSavingSlug ? "…" : "Speichern"}</button>
          </div>
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

        {/* Profil deaktivieren */}
        <div style={{ background: speakerProfile.deaktiviert ? "#fef2f2" : "#f0fdf4", borderRadius: 10, padding: "0.9rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
          <div>
            <span className="text-sm font-semibold">{speakerProfile.deaktiviert ? "🚫 Sprecherprofil ist deaktiviert" : "✅ Sprecherprofil wird angezeigt"}</span>
            <p style={{ fontSize: "0.82rem", margin: "0.15rem 0 0", color: speakerProfile.deaktiviert ? "#dc2626" : "#16a34a" }}>
              {speakerProfile.deaktiviert ? "Dein Sprecherprofil ist momentan nicht sichtbar." : "Dein Sprecherprofil ist in der Übersicht sichtbar."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!!speakerProfile.deaktiviert}
            className="toggle-switch"
            style={{
              width: 48, height: 26, borderRadius: 13, border: "none",
              background: speakerProfile.deaktiviert ? "#dc2626" : "#ccc",
              position: "relative", cursor: "pointer", flexShrink: 0,
              transition: "background 0.2s",
            }}
            onClick={() => setSpeakerProfile((c) => ({ ...c, deaktiviert: !c.deaktiviert }))}
          >
            <span style={{
              position: "absolute", top: 3, left: speakerProfile.deaktiviert ? 24 : 3,
              width: 20, height: 20, borderRadius: "50%", background: "#fff",
              transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </button>
        </div>

        <button type="button" className="btn" onClick={saveSpeakerProfile} disabled={isSavingSpeaker}>
          {isSavingSpeaker ? "Speichern ..." : "Sprecherprofil speichern"}
        </button>

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

        <label className="grid gap-1 text-[0.95rem]">
          Name <span className="text-xs text-arena-muted">(immer öffentlich)</span>
          <input className="input-base" value={speakerProfile.name.value} onChange={(e) =>
            setSpeakerProfile((c) => ({ ...c, name: { value: e.target.value, visibility: "public" } }))
          } />
        </label>

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
          label="Über mich"
          value={speakerProfile.ueberMich.value}
          visibility={speakerProfile.ueberMich.visibility}
          multiline
          maxLength={2000}
          hint="Tipp: Links werden automatisch klickbar. Eigener Linktext: [Mein Blog](https://example.com)"
          onValueChange={(value) =>
            setSpeakerProfile((c) => ({ ...c, ueberMich: { ...c.ueberMich, value } }))
          }
          onVisibilityChange={(visibility) =>
            setSpeakerProfile((c) => ({ ...c, ueberMich: { ...c.ueberMich, visibility } }))
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

        <h3 className="text-[0.95rem] font-semibold mt-4 mb-1">Social Media</h3>
        <FieldWithVisibility
          label="Social Media: Instagram"
          value={speakerProfile.socialInstagram?.value ?? ""}
          visibility={speakerProfile.socialInstagram?.visibility ?? "hidden"}
          onValueChange={(value) =>
            setSpeakerProfile((c) => ({ ...c, socialInstagram: { ...c.socialInstagram, value } }))
          }
          onVisibilityChange={(visibility) =>
            setSpeakerProfile((c) => ({ ...c, socialInstagram: { ...c.socialInstagram, visibility } }))
          }
        />
        <FieldWithVisibility
          label="Social Media: Facebook"
          value={speakerProfile.socialFacebook?.value ?? ""}
          visibility={speakerProfile.socialFacebook?.visibility ?? "hidden"}
          onValueChange={(value) =>
            setSpeakerProfile((c) => ({ ...c, socialFacebook: { ...c.socialFacebook, value } }))
          }
          onVisibilityChange={(visibility) =>
            setSpeakerProfile((c) => ({ ...c, socialFacebook: { ...c.socialFacebook, visibility } }))
          }
        />
        <FieldWithVisibility
          label="Social Media: LinkedIn"
          value={speakerProfile.socialLinkedin?.value ?? ""}
          visibility={speakerProfile.socialLinkedin?.visibility ?? "hidden"}
          onValueChange={(value) =>
            setSpeakerProfile((c) => ({ ...c, socialLinkedin: { ...c.socialLinkedin, value } }))
          }
          onVisibilityChange={(visibility) =>
            setSpeakerProfile((c) => ({ ...c, socialLinkedin: { ...c.socialLinkedin, visibility } }))
          }
        />
        <FieldWithVisibility
          label="Social Media: TikTok"
          value={speakerProfile.socialTiktok?.value ?? ""}
          visibility={speakerProfile.socialTiktok?.visibility ?? "hidden"}
          onValueChange={(value) =>
            setSpeakerProfile((c) => ({ ...c, socialTiktok: { ...c.socialTiktok, value } }))
          }
          onVisibilityChange={(visibility) =>
            setSpeakerProfile((c) => ({ ...c, socialTiktok: { ...c.socialTiktok, visibility } }))
          }
        />
        <FieldWithVisibility
          label="Social Media: YouTube"
          value={speakerProfile.socialYoutube?.value ?? ""}
          visibility={speakerProfile.socialYoutube?.visibility ?? "hidden"}
          onValueChange={(value) =>
            setSpeakerProfile((c) => ({ ...c, socialYoutube: { ...c.socialYoutube, value } }))
          }
          onVisibilityChange={(visibility) =>
            setSpeakerProfile((c) => ({ ...c, socialYoutube: { ...c.socialYoutube, visibility } }))
          }
        />
        <FieldWithVisibility
          label="Social Media: Pinterest"
          value={speakerProfile.socialPinterest?.value ?? ""}
          visibility={speakerProfile.socialPinterest?.visibility ?? "hidden"}
          onValueChange={(value) =>
            setSpeakerProfile((c) => ({ ...c, socialPinterest: { ...c.socialPinterest, value } }))
          }
          onVisibilityChange={(visibility) =>
            setSpeakerProfile((c) => ({ ...c, socialPinterest: { ...c.socialPinterest, visibility } }))
          }
        />
        <FieldWithVisibility
          label="Social Media: Reddit"
          value={speakerProfile.socialReddit?.value ?? ""}
          visibility={speakerProfile.socialReddit?.visibility ?? "hidden"}
          onValueChange={(value) =>
            setSpeakerProfile((c) => ({ ...c, socialReddit: { ...c.socialReddit, value } }))
          }
          onVisibilityChange={(visibility) =>
            setSpeakerProfile((c) => ({ ...c, socialReddit: { ...c.socialReddit, visibility } }))
          }
        />
        <FieldWithVisibility
          label="Website"
          value={speakerProfile.socialWebsite?.value ?? ""}
          visibility={speakerProfile.socialWebsite?.visibility ?? "hidden"}
          onValueChange={(value) =>
            setSpeakerProfile((c) => ({ ...c, socialWebsite: { ...c.socialWebsite, value } }))
          }
          onVisibilityChange={(visibility) =>
            setSpeakerProfile((c) => ({ ...c, socialWebsite: { ...c.socialWebsite, visibility } }))
          }
        />
        <FieldWithVisibility
          label="Linktree"
          value={speakerProfile.socialLinktree?.value ?? ""}
          visibility={speakerProfile.socialLinktree?.visibility ?? "hidden"}
          onValueChange={(value) =>
            setSpeakerProfile((c) => ({ ...c, socialLinktree: { ...c.socialLinktree, value } }))
          }
          onVisibilityChange={(visibility) =>
            setSpeakerProfile((c) => ({ ...c, socialLinktree: { ...c.socialLinktree, visibility } }))
          }
        />
        <FieldWithVisibility
          label="Newsletter"
          value={speakerProfile.socialNewsletter?.value ?? ""}
          visibility={speakerProfile.socialNewsletter?.visibility ?? "hidden"}
          onValueChange={(value) =>
            setSpeakerProfile((c) => ({ ...c, socialNewsletter: { ...c.socialNewsletter, value } }))
          }
          onVisibilityChange={(visibility) =>
            setSpeakerProfile((c) => ({ ...c, socialNewsletter: { ...c.socialNewsletter, visibility } }))
          }
        />
        <FieldWithVisibility
          label="WhatsApp-Kanal"
          value={speakerProfile.socialWhatsapp?.value ?? ""}
          visibility={speakerProfile.socialWhatsapp?.visibility ?? "hidden"}
          onValueChange={(value) =>
            setSpeakerProfile((c) => ({ ...c, socialWhatsapp: { ...c.socialWhatsapp, value } }))
          }
          onVisibilityChange={(visibility) =>
            setSpeakerProfile((c) => ({ ...c, socialWhatsapp: { ...c.socialWhatsapp, visibility } }))
          }
        />
        <FieldWithVisibility
          label="Mailadresse"
          value={speakerProfile.socialEmail?.value ?? ""}
          visibility={speakerProfile.socialEmail?.visibility ?? "hidden"}
          onValueChange={(value) =>
            setSpeakerProfile((c) => ({ ...c, socialEmail: { ...c.socialEmail, value } }))
          }
          onVisibilityChange={(visibility) =>
            setSpeakerProfile((c) => ({ ...c, socialEmail: { ...c.socialEmail, visibility } }))
          }
        />

        {/* ── Eigene Profil-URL ── */}
        <div style={{ background: "var(--color-arena-bg-soft, #f7f7fa)", borderRadius: 10, padding: "0.9rem 1rem", marginTop: "0.5rem" }}>
          <span className="text-sm font-semibold">🔗 Eigene Profil-URL</span>
          <p className="text-arena-muted" style={{ fontSize: "0.82rem", margin: "0.15rem 0 0.5rem" }}>
            z.{"\u00a0"}B. <strong>bucharena.org/sprecher/{profileSlug || "dein-name"}</strong>
          </p>
          <div className="flex gap-2 items-end">
            <div className="flex-1 grid gap-1">
              <div className="flex items-center gap-1.5">
                <span className="text-arena-muted text-sm whitespace-nowrap">/sprecher/</span>
                <input type="text" className="input-base flex-1" placeholder="dein-wunschname" value={profileSlug} onChange={(e) => { setProfileSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setSlugAvailable(null); }} onBlur={async () => { const v = profileSlug.trim(); if (!v) { setSlugAvailable(null); return; } try { const res = await fetch(`/api/profile/slug?slug=${encodeURIComponent(v)}&username=${encodeURIComponent(targetUsername)}`); const data = (await res.json()) as { available: boolean }; setSlugAvailable(data.available); } catch { setSlugAvailable(null); } }} maxLength={40} />
              </div>
              {slugAvailable === true && <span className="text-xs text-green-600">✓ Verfügbar</span>}
              {slugAvailable === false && <span className="text-xs text-red-600">✗ Bereits vergeben</span>}
            </div>
            <button type="button" className="btn btn-primary" disabled={isSavingSlug} onClick={async () => { setIsSavingSlug(true); setMessage(""); setIsError(false); try { const res = await fetch("/api/profile/slug", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: profileSlug, ...(requestedUser ? { username: requestedUser } : {}) }) }); const data = (await res.json()) as { message?: string; slug?: string }; if (!res.ok) throw new Error(data.message ?? "Fehler"); setProfileSlug(data.slug ?? ""); setSlugAvailable(null); setMessage(data.message ?? "Profil-URL gespeichert."); setIsError(false); } catch (err) { setIsError(true); setMessage(err instanceof Error ? err.message : "Fehler"); } finally { setIsSavingSlug(false); } }}>{isSavingSlug ? "…" : "Speichern"}</button>
          </div>
        </div>

        <button type="button" className="btn" onClick={saveSpeakerProfile} disabled={isSavingSpeaker}>
          {isSavingSpeaker ? "Speichern ..." : "Sprecherprofil speichern"}
        </button>
        </>
        )}

        {activeTab === "blogger" && (
        <>
        <h2 className="text-lg mt-0">Bloggerprofil</h2>
        <p className="text-arena-muted text-[0.95rem]">
          Fülle dein Profil als Buchblogger aus. Öffentlich sichtbare Felder werden auf deiner Bloggerseite angezeigt.
        </p>

        {/* Profil deaktivieren */}
        <div style={{ background: bloggerProfile.deaktiviert ? "#fef2f2" : "#f0fdf4", borderRadius: 10, padding: "0.9rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
          <div>
            <span className="text-sm font-semibold">{bloggerProfile.deaktiviert ? "🚫 Bloggerprofil ist deaktiviert" : "✅ Bloggerprofil wird angezeigt"}</span>
            <p style={{ fontSize: "0.82rem", margin: "0.15rem 0 0", color: bloggerProfile.deaktiviert ? "#dc2626" : "#16a34a" }}>
              {bloggerProfile.deaktiviert ? "Dein Bloggerprofil ist momentan nicht sichtbar." : "Dein Bloggerprofil ist in der Übersicht sichtbar."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!!bloggerProfile.deaktiviert}
            className="toggle-switch"
            style={{
              width: 48, height: 26, borderRadius: 13, border: "none",
              background: bloggerProfile.deaktiviert ? "#dc2626" : "#ccc",
              position: "relative", cursor: "pointer", flexShrink: 0,
              transition: "background 0.2s",
            }}
            onClick={() => setBloggerProfile((c) => ({ ...c, deaktiviert: !c.deaktiviert }))}
          >
            <span style={{
              position: "absolute", top: 3, left: bloggerProfile.deaktiviert ? 24 : 3,
              width: 20, height: 20, borderRadius: "50%", background: "#fff",
              transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </button>
        </div>

        <button type="button" className="btn" onClick={saveBloggerProfile} disabled={isSavingBlogger}>
          {isSavingBlogger ? "Speichern ..." : "Bloggerprofil speichern"}
        </button>

        <div className="grid justify-center items-start gap-4" style={{ gridTemplateColumns: "180px" }}>
          <button
            type="button"
            className="border-0 bg-transparent p-0 m-0 cursor-pointer"
            onClick={() => setIsBloggerImageOverlayOpen(true)}
          >
            <div className="w-[160px] h-[160px] border border-arena-border rounded-full bg-arena-bg overflow-hidden grid place-items-center text-xs text-center p-2 box-border" style={bloggerImagePreviewStyle}>
              {!bloggerProfile.profileImage?.value && <span>Kein Bild gewählt</span>}
            </div>
          </button>
        </div>

        <label className="grid gap-1 text-[0.95rem]">
          Name <span className="text-xs text-arena-muted">(immer öffentlich)</span>
          <input className="input-base" value={bloggerProfile.name.value} onChange={(e) =>
            setBloggerProfile((c) => ({ ...c, name: { value: e.target.value, visibility: "public" } }))
          } />
        </label>

        <FieldWithVisibility
          label="Motto"
          value={bloggerProfile.motto.value}
          visibility={bloggerProfile.motto.visibility}
          onValueChange={(value) =>
            setBloggerProfile((c) => ({ ...c, motto: { ...c.motto, value } }))
          }
          onVisibilityChange={(visibility) =>
            setBloggerProfile((c) => ({ ...c, motto: { ...c.motto, visibility } }))
          }
        />

        <div className="grid grid-cols-[2fr_1fr] gap-3 max-[780px]:grid-cols-1">
          <div className="grid gap-1">
            <GenrePicker
              label="Genres"
              value={bloggerProfile.genres}
              onChange={(value) => setBloggerProfile((c) => ({ ...c, genres: value }))}
            />
          </div>
          <div />
        </div>

        <FieldWithVisibility
          label="Lieblingsbuch"
          value={bloggerProfile.lieblingsbuch.value}
          visibility={bloggerProfile.lieblingsbuch.visibility}
          onValueChange={(value) =>
            setBloggerProfile((c) => ({ ...c, lieblingsbuch: { ...c.lieblingsbuch, value } }))
          }
          onVisibilityChange={(visibility) =>
            setBloggerProfile((c) => ({ ...c, lieblingsbuch: { ...c.lieblingsbuch, visibility } }))
          }
        />

        <div className="grid grid-cols-[2fr_1fr] gap-3 max-[780px]:grid-cols-1">
          <label className="grid gap-1 text-[0.95rem]">
            Beschreibung
            <span className="text-xs text-arena-muted">Tipp: Links werden automatisch klickbar. Eigener Linktext: [Mein Blog](https://example.com)</span>
            <textarea
              className="input-base"
              rows={4}
              value={bloggerProfile.beschreibung.value}
              onChange={(e) =>
                setBloggerProfile((c) => ({ ...c, beschreibung: { ...c.beschreibung, value: e.target.value } }))
              }
              maxLength={2000}
              placeholder="Erzähle etwas über dich und deinen Blog …"
            />
          </label>
          <div>
            <span className="block text-xs mb-1">Sichtbarkeit</span>
            <VisibilityToggle
              value={bloggerProfile.beschreibung.visibility}
              onChange={(visibility) =>
                setBloggerProfile((c) => ({ ...c, beschreibung: { ...c.beschreibung, visibility } }))
              }
            />
          </div>
        </div>

        <FieldWithVisibility
          label="Social Media: Instagram"
          value={bloggerProfile.socialInstagram.value}
          visibility={bloggerProfile.socialInstagram.visibility}
          onValueChange={(value) =>
            setBloggerProfile((c) => ({ ...c, socialInstagram: { ...c.socialInstagram, value } }))
          }
          onVisibilityChange={(visibility) =>
            setBloggerProfile((c) => ({ ...c, socialInstagram: { ...c.socialInstagram, visibility } }))
          }
        />

        <FieldWithVisibility
          label="Social Media: Facebook"
          value={bloggerProfile.socialFacebook.value}
          visibility={bloggerProfile.socialFacebook.visibility}
          onValueChange={(value) =>
            setBloggerProfile((c) => ({ ...c, socialFacebook: { ...c.socialFacebook, value } }))
          }
          onVisibilityChange={(visibility) =>
            setBloggerProfile((c) => ({ ...c, socialFacebook: { ...c.socialFacebook, visibility } }))
          }
        />

        <FieldWithVisibility
          label="Social Media: LinkedIn"
          value={bloggerProfile.socialLinkedin.value}
          visibility={bloggerProfile.socialLinkedin.visibility}
          onValueChange={(value) =>
            setBloggerProfile((c) => ({ ...c, socialLinkedin: { ...c.socialLinkedin, value } }))
          }
          onVisibilityChange={(visibility) =>
            setBloggerProfile((c) => ({ ...c, socialLinkedin: { ...c.socialLinkedin, visibility } }))
          }
        />

        <FieldWithVisibility
          label="Social Media: TikTok"
          value={bloggerProfile.socialTiktok.value}
          visibility={bloggerProfile.socialTiktok.visibility}
          onValueChange={(value) =>
            setBloggerProfile((c) => ({ ...c, socialTiktok: { ...c.socialTiktok, value } }))
          }
          onVisibilityChange={(visibility) =>
            setBloggerProfile((c) => ({ ...c, socialTiktok: { ...c.socialTiktok, visibility } }))
          }
        />

        <FieldWithVisibility
          label="Social Media: YouTube"
          value={bloggerProfile.socialYoutube.value}
          visibility={bloggerProfile.socialYoutube.visibility}
          onValueChange={(value) =>
            setBloggerProfile((c) => ({ ...c, socialYoutube: { ...c.socialYoutube, value } }))
          }
          onVisibilityChange={(visibility) =>
            setBloggerProfile((c) => ({ ...c, socialYoutube: { ...c.socialYoutube, visibility } }))
          }
        />

        <FieldWithVisibility
          label="Social Media: Pinterest"
          value={bloggerProfile.socialPinterest.value}
          visibility={bloggerProfile.socialPinterest.visibility}
          onValueChange={(value) =>
            setBloggerProfile((c) => ({ ...c, socialPinterest: { ...c.socialPinterest, value } }))
          }
          onVisibilityChange={(visibility) =>
            setBloggerProfile((c) => ({ ...c, socialPinterest: { ...c.socialPinterest, visibility } }))
          }
        />

        <FieldWithVisibility
          label="Social Media: Reddit"
          value={bloggerProfile.socialReddit.value}
          visibility={bloggerProfile.socialReddit.visibility}
          onValueChange={(value) =>
            setBloggerProfile((c) => ({ ...c, socialReddit: { ...c.socialReddit, value } }))
          }
          onVisibilityChange={(visibility) =>
            setBloggerProfile((c) => ({ ...c, socialReddit: { ...c.socialReddit, visibility } }))
          }
        />

        <FieldWithVisibility
          label="Website"
          value={bloggerProfile.socialWebsite.value}
          visibility={bloggerProfile.socialWebsite.visibility}
          onValueChange={(value) =>
            setBloggerProfile((c) => ({ ...c, socialWebsite: { ...c.socialWebsite, value } }))
          }
          onVisibilityChange={(visibility) =>
            setBloggerProfile((c) => ({ ...c, socialWebsite: { ...c.socialWebsite, visibility } }))
          }
        />

        <FieldWithVisibility
          label="Linktree"
          value={bloggerProfile.socialLinktree.value}
          visibility={bloggerProfile.socialLinktree.visibility}
          onValueChange={(value) =>
            setBloggerProfile((c) => ({ ...c, socialLinktree: { ...c.socialLinktree, value } }))
          }
          onVisibilityChange={(visibility) =>
            setBloggerProfile((c) => ({ ...c, socialLinktree: { ...c.socialLinktree, visibility } }))
          }
        />

        <FieldWithVisibility
          label="Newsletter"
          value={bloggerProfile.socialNewsletter.value}
          visibility={bloggerProfile.socialNewsletter.visibility}
          onValueChange={(value) =>
            setBloggerProfile((c) => ({ ...c, socialNewsletter: { ...c.socialNewsletter, value } }))
          }
          onVisibilityChange={(visibility) =>
            setBloggerProfile((c) => ({ ...c, socialNewsletter: { ...c.socialNewsletter, visibility } }))
          }
        />

        <FieldWithVisibility
          label="WhatsApp-Kanal"
          value={bloggerProfile.socialWhatsapp.value}
          visibility={bloggerProfile.socialWhatsapp.visibility}
          onValueChange={(value) =>
            setBloggerProfile((c) => ({ ...c, socialWhatsapp: { ...c.socialWhatsapp, value } }))
          }
          onVisibilityChange={(visibility) =>
            setBloggerProfile((c) => ({ ...c, socialWhatsapp: { ...c.socialWhatsapp, visibility } }))
          }
        />

        <FieldWithVisibility
          label="Mailadresse"
          value={bloggerProfile.socialEmail.value}
          visibility={bloggerProfile.socialEmail.visibility}
          onValueChange={(value) =>
            setBloggerProfile((c) => ({ ...c, socialEmail: { ...c.socialEmail, value } }))
          }
          onVisibilityChange={(visibility) =>
            setBloggerProfile((c) => ({ ...c, socialEmail: { ...c.socialEmail, visibility } }))
          }
        />

        {/* ── Eigene Profil-URL ── */}
        <div style={{ background: "var(--color-arena-bg-soft, #f7f7fa)", borderRadius: 10, padding: "0.9rem 1rem", marginTop: "0.5rem" }}>
          <span className="text-sm font-semibold">🔗 Eigene Profil-URL</span>
          <p className="text-arena-muted" style={{ fontSize: "0.82rem", margin: "0.15rem 0 0.5rem" }}>
            z.{"\u00a0"}B. <strong>bucharena.org/blogger/{profileSlug || "dein-name"}</strong>
          </p>
          <div className="flex gap-2 items-end">
            <div className="flex-1 grid gap-1">
              <div className="flex items-center gap-1.5">
                <span className="text-arena-muted text-sm whitespace-nowrap">/blogger/</span>
                <input type="text" className="input-base flex-1" placeholder="dein-wunschname" value={profileSlug} onChange={(e) => { setProfileSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setSlugAvailable(null); }} onBlur={async () => { const v = profileSlug.trim(); if (!v) { setSlugAvailable(null); return; } try { const res = await fetch(`/api/profile/slug?slug=${encodeURIComponent(v)}&username=${encodeURIComponent(targetUsername)}`); const data = (await res.json()) as { available: boolean }; setSlugAvailable(data.available); } catch { setSlugAvailable(null); } }} maxLength={40} />
              </div>
              {slugAvailable === true && <span className="text-xs text-green-600">✓ Verfügbar</span>}
              {slugAvailable === false && <span className="text-xs text-red-600">✗ Bereits vergeben</span>}
            </div>
            <button type="button" className="btn btn-primary" disabled={isSavingSlug} onClick={async () => { setIsSavingSlug(true); setMessage(""); setIsError(false); try { const res = await fetch("/api/profile/slug", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: profileSlug, ...(requestedUser ? { username: requestedUser } : {}) }) }); const data = (await res.json()) as { message?: string; slug?: string }; if (!res.ok) throw new Error(data.message ?? "Fehler"); setProfileSlug(data.slug ?? ""); setSlugAvailable(null); setMessage(data.message ?? "Profil-URL gespeichert."); setIsError(false); } catch (err) { setIsError(true); setMessage(err instanceof Error ? err.message : "Fehler"); } finally { setIsSavingSlug(false); } }}>{isSavingSlug ? "…" : "Speichern"}</button>
          </div>
        </div>

        <button type="button" className="btn" onClick={saveBloggerProfile} disabled={isSavingBlogger}>
          {isSavingBlogger ? "Speichern ..." : "Bloggerprofil speichern"}
        </button>
        </>
        )}

        {activeTab === "testleser" && (
        <>
        <h2 className="text-lg mt-0">Testleserprofil</h2>
        <p className="text-arena-muted text-[0.95rem]">
          Fülle dein Profil als Testleser aus. Öffentlich sichtbare Felder werden auf deiner Testleserseite angezeigt.
        </p>

        {/* Profil deaktivieren */}
        <div style={{ background: testleserProfile.deaktiviert ? "#fef2f2" : "#f0fdf4", borderRadius: 10, padding: "0.9rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
          <div>
            <span className="text-sm font-semibold">{testleserProfile.deaktiviert ? "🚫 Testleserprofil ist deaktiviert" : "✅ Testleserprofil wird angezeigt"}</span>
            <p style={{ fontSize: "0.82rem", margin: "0.15rem 0 0", color: testleserProfile.deaktiviert ? "#dc2626" : "#16a34a" }}>
              {testleserProfile.deaktiviert ? "Dein Testleserprofil ist momentan nicht sichtbar." : "Dein Testleserprofil ist in der Übersicht sichtbar."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!!testleserProfile.deaktiviert}
            className="toggle-switch"
            style={{
              width: 48, height: 26, borderRadius: 13, border: "none",
              background: testleserProfile.deaktiviert ? "#dc2626" : "#ccc",
              position: "relative", cursor: "pointer", flexShrink: 0,
              transition: "background 0.2s",
            }}
            onClick={() => setTestleserProfile((c) => ({ ...c, deaktiviert: !c.deaktiviert }))}
          >
            <span style={{
              position: "absolute", top: 3, left: testleserProfile.deaktiviert ? 24 : 3,
              width: 20, height: 20, borderRadius: "50%", background: "#fff",
              transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </button>
        </div>

        <button type="button" className="btn" onClick={saveTestleserProfile} disabled={isSavingTestleser}>
          {isSavingTestleser ? "Speichern ..." : "Testleserprofil speichern"}
        </button>

        <div className="grid justify-center items-start gap-4" style={{ gridTemplateColumns: "180px" }}>
          <button type="button" className="border-0 bg-transparent p-0 m-0 cursor-pointer" onClick={() => setIsTestleserImageOverlayOpen(true)}>
            <div className="w-[160px] h-[160px] border border-arena-border rounded-full bg-arena-bg overflow-hidden grid place-items-center text-xs text-center p-2 box-border" style={testleserImagePreviewStyle}>
              {!testleserProfile.profileImage?.value && <span>Kein Bild gewählt</span>}
            </div>
          </button>
        </div>

        <label className="grid gap-1 text-[0.95rem]">
          Name <span className="text-xs text-arena-muted">(immer öffentlich)</span>
          <input className="input-base" value={testleserProfile.name.value} onChange={(e) =>
            setTestleserProfile((c) => ({ ...c, name: { value: e.target.value, visibility: "public" } }))
          } />
        </label>

        <div className="grid gap-1">
          <label className="text-sm font-semibold">Zu mir</label>
          <span className="text-xs text-arena-muted">Tipp: Links werden automatisch klickbar. Eigener Linktext: [Mein Blog](https://example.com)</span>
          <textarea
            className="input-base w-full"
            rows={4}
            maxLength={2000}
            placeholder="Erzähle etwas über dich ..."
            value={testleserProfile.zuMir}
            onChange={(e) => setTestleserProfile((c) => ({ ...c, zuMir: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-[2fr_1fr] gap-3 max-[780px]:grid-cols-1">
          <div className="grid gap-1">
            <GenrePicker
              label="Genres"
              value={testleserProfile.genres}
              onChange={(value) => setTestleserProfile((c) => ({ ...c, genres: value }))}
            />
          </div>
          <div />
        </div>

        {/* Verfügbarkeits-Schalter */}
        <div style={{ background: testleserProfile.verfuegbar ? "#f0fdf4" : "#fef2f2", borderRadius: 10, padding: "0.9rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
          <div>
            <span className="text-sm font-semibold">{testleserProfile.verfuegbar ? "✅ Freie Kapazitäten: Verfügbar" : "🚫 Freie Kapazitäten: Nicht verfügbar"}</span>
            <p style={{ fontSize: "0.82rem", margin: "0.15rem 0 0", color: testleserProfile.verfuegbar ? "#16a34a" : "#dc2626" }}>
              {testleserProfile.verfuegbar ? "Du bist aktuell als Testleser verfügbar." : "Du bist aktuell nicht als Testleser verfügbar."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={testleserProfile.verfuegbar}
            className="toggle-switch"
            style={{
              width: 48, height: 26, borderRadius: 13, border: "none",
              background: testleserProfile.verfuegbar ? "#16a34a" : "#dc2626",
              position: "relative", cursor: "pointer", flexShrink: 0,
              transition: "background 0.2s",
            }}
            onClick={() => setTestleserProfile((c) => ({ ...c, verfuegbar: !c.verfuegbar }))}
          >
            <span style={{
              position: "absolute", top: 3, left: testleserProfile.verfuegbar ? 24 : 3,
              width: 20, height: 20, borderRadius: "50%", background: "#fff",
              transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </button>
        </div>

        <h3 className="text-[0.95rem] font-semibold mt-4 mb-1">Kontakt / Social Media</h3>
        <FieldWithVisibility label="Social Media: Instagram" value={testleserProfile.socialInstagram.value} visibility={testleserProfile.socialInstagram.visibility} onValueChange={(value) => setTestleserProfile((c) => ({ ...c, socialInstagram: { ...c.socialInstagram, value } }))} onVisibilityChange={(visibility) => setTestleserProfile((c) => ({ ...c, socialInstagram: { ...c.socialInstagram, visibility } }))} />
        <FieldWithVisibility label="Social Media: Facebook" value={testleserProfile.socialFacebook.value} visibility={testleserProfile.socialFacebook.visibility} onValueChange={(value) => setTestleserProfile((c) => ({ ...c, socialFacebook: { ...c.socialFacebook, value } }))} onVisibilityChange={(visibility) => setTestleserProfile((c) => ({ ...c, socialFacebook: { ...c.socialFacebook, visibility } }))} />
        <FieldWithVisibility label="Social Media: LinkedIn" value={testleserProfile.socialLinkedin.value} visibility={testleserProfile.socialLinkedin.visibility} onValueChange={(value) => setTestleserProfile((c) => ({ ...c, socialLinkedin: { ...c.socialLinkedin, value } }))} onVisibilityChange={(visibility) => setTestleserProfile((c) => ({ ...c, socialLinkedin: { ...c.socialLinkedin, visibility } }))} />
        <FieldWithVisibility label="Social Media: TikTok" value={testleserProfile.socialTiktok.value} visibility={testleserProfile.socialTiktok.visibility} onValueChange={(value) => setTestleserProfile((c) => ({ ...c, socialTiktok: { ...c.socialTiktok, value } }))} onVisibilityChange={(visibility) => setTestleserProfile((c) => ({ ...c, socialTiktok: { ...c.socialTiktok, visibility } }))} />
        <FieldWithVisibility label="Social Media: YouTube" value={testleserProfile.socialYoutube.value} visibility={testleserProfile.socialYoutube.visibility} onValueChange={(value) => setTestleserProfile((c) => ({ ...c, socialYoutube: { ...c.socialYoutube, value } }))} onVisibilityChange={(visibility) => setTestleserProfile((c) => ({ ...c, socialYoutube: { ...c.socialYoutube, visibility } }))} />
        <FieldWithVisibility label="Social Media: Pinterest" value={testleserProfile.socialPinterest.value} visibility={testleserProfile.socialPinterest.visibility} onValueChange={(value) => setTestleserProfile((c) => ({ ...c, socialPinterest: { ...c.socialPinterest, value } }))} onVisibilityChange={(visibility) => setTestleserProfile((c) => ({ ...c, socialPinterest: { ...c.socialPinterest, visibility } }))} />
        <FieldWithVisibility label="Social Media: Reddit" value={testleserProfile.socialReddit.value} visibility={testleserProfile.socialReddit.visibility} onValueChange={(value) => setTestleserProfile((c) => ({ ...c, socialReddit: { ...c.socialReddit, value } }))} onVisibilityChange={(visibility) => setTestleserProfile((c) => ({ ...c, socialReddit: { ...c.socialReddit, visibility } }))} />
        <FieldWithVisibility label="Website" value={testleserProfile.socialWebsite.value} visibility={testleserProfile.socialWebsite.visibility} onValueChange={(value) => setTestleserProfile((c) => ({ ...c, socialWebsite: { ...c.socialWebsite, value } }))} onVisibilityChange={(visibility) => setTestleserProfile((c) => ({ ...c, socialWebsite: { ...c.socialWebsite, visibility } }))} />
        <FieldWithVisibility label="Linktree" value={testleserProfile.socialLinktree.value} visibility={testleserProfile.socialLinktree.visibility} onValueChange={(value) => setTestleserProfile((c) => ({ ...c, socialLinktree: { ...c.socialLinktree, value } }))} onVisibilityChange={(visibility) => setTestleserProfile((c) => ({ ...c, socialLinktree: { ...c.socialLinktree, visibility } }))} />
        <FieldWithVisibility label="Newsletter" value={testleserProfile.socialNewsletter.value} visibility={testleserProfile.socialNewsletter.visibility} onValueChange={(value) => setTestleserProfile((c) => ({ ...c, socialNewsletter: { ...c.socialNewsletter, value } }))} onVisibilityChange={(visibility) => setTestleserProfile((c) => ({ ...c, socialNewsletter: { ...c.socialNewsletter, visibility } }))} />
        <FieldWithVisibility label="WhatsApp-Kanal" value={testleserProfile.socialWhatsapp.value} visibility={testleserProfile.socialWhatsapp.visibility} onValueChange={(value) => setTestleserProfile((c) => ({ ...c, socialWhatsapp: { ...c.socialWhatsapp, value } }))} onVisibilityChange={(visibility) => setTestleserProfile((c) => ({ ...c, socialWhatsapp: { ...c.socialWhatsapp, visibility } }))} />
        <FieldWithVisibility label="Mailadresse" value={testleserProfile.socialEmail.value} visibility={testleserProfile.socialEmail.visibility} onValueChange={(value) => setTestleserProfile((c) => ({ ...c, socialEmail: { ...c.socialEmail, value } }))} onVisibilityChange={(visibility) => setTestleserProfile((c) => ({ ...c, socialEmail: { ...c.socialEmail, visibility } }))} />

        {/* ── Eigene Profil-URL ── */}
        <div style={{ background: "var(--color-arena-bg-soft, #f7f7fa)", borderRadius: 10, padding: "0.9rem 1rem", marginTop: "0.5rem" }}>
          <span className="text-sm font-semibold">🔗 Eigene Profil-URL</span>
          <p className="text-arena-muted" style={{ fontSize: "0.82rem", margin: "0.15rem 0 0.5rem" }}>
            z.{"\u00a0"}B. <strong>bucharena.org/testleser/{profileSlug || "dein-name"}</strong>
          </p>
          <div className="flex gap-2 items-end">
            <div className="flex-1 grid gap-1">
              <div className="flex items-center gap-1.5">
                <span className="text-arena-muted text-sm whitespace-nowrap">/testleser/</span>
                <input type="text" className="input-base flex-1" placeholder="dein-wunschname" value={profileSlug} onChange={(e) => { setProfileSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setSlugAvailable(null); }} onBlur={async () => { const v = profileSlug.trim(); if (!v) { setSlugAvailable(null); return; } try { const res = await fetch(`/api/profile/slug?slug=${encodeURIComponent(v)}&username=${encodeURIComponent(targetUsername)}`); const data = (await res.json()) as { available: boolean }; setSlugAvailable(data.available); } catch { setSlugAvailable(null); } }} maxLength={40} />
              </div>
              {slugAvailable === true && <span className="text-xs text-green-600">✓ Verfügbar</span>}
              {slugAvailable === false && <span className="text-xs text-red-600">✗ Bereits vergeben</span>}
            </div>
            <button type="button" className="btn btn-primary" disabled={isSavingSlug} onClick={async () => { setIsSavingSlug(true); setMessage(""); setIsError(false); try { const res = await fetch("/api/profile/slug", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: profileSlug, ...(requestedUser ? { username: requestedUser } : {}) }) }); const data = (await res.json()) as { message?: string; slug?: string }; if (!res.ok) throw new Error(data.message ?? "Fehler"); setProfileSlug(data.slug ?? ""); setSlugAvailable(null); setMessage(data.message ?? "Profil-URL gespeichert."); setIsError(false); } catch (err) { setIsError(true); setMessage(err instanceof Error ? err.message : "Fehler"); } finally { setIsSavingSlug(false); } }}>{isSavingSlug ? "…" : "Speichern"}</button>
          </div>
        </div>

        <button type="button" className="btn" onClick={saveTestleserProfile} disabled={isSavingTestleser}>
          {isSavingTestleser ? "Speichern ..." : "Testleserprofil speichern"}
        </button>
        </>
        )}

        {activeTab === "lektoren" && (
        <>
        <h2 className="text-lg mt-0">Lektorenprofil</h2>
        <p className="text-arena-muted text-[0.95rem]">
          Fülle dein Profil als Lektor aus. Öffentlich sichtbare Felder werden auf deiner Lektorenseite angezeigt.
        </p>

        {/* Profil deaktivieren */}
        <div style={{ background: lektorenProfile.deaktiviert ? "#fef2f2" : "#f0fdf4", borderRadius: 10, padding: "0.9rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
          <div>
            <span className="text-sm font-semibold">{lektorenProfile.deaktiviert ? "🚫 Lektorenprofil ist deaktiviert" : "✅ Lektorenprofil wird angezeigt"}</span>
            <p style={{ fontSize: "0.82rem", margin: "0.15rem 0 0", color: lektorenProfile.deaktiviert ? "#dc2626" : "#16a34a" }}>
              {lektorenProfile.deaktiviert ? "Dein Lektorenprofil ist momentan nicht sichtbar." : "Dein Lektorenprofil ist in der Übersicht sichtbar."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!!lektorenProfile.deaktiviert}
            className="toggle-switch"
            style={{
              width: 48, height: 26, borderRadius: 13, border: "none",
              background: lektorenProfile.deaktiviert ? "#dc2626" : "#ccc",
              position: "relative", cursor: "pointer", flexShrink: 0,
              transition: "background 0.2s",
            }}
            onClick={() => setLektorenProfile((c) => ({ ...c, deaktiviert: !c.deaktiviert }))}
          >
            <span style={{
              position: "absolute", top: 3, left: lektorenProfile.deaktiviert ? 24 : 3,
              width: 20, height: 20, borderRadius: "50%", background: "#fff",
              transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </button>
        </div>

        <button type="button" className="btn" onClick={saveLektorenProfile} disabled={isSavingLektoren}>
          {isSavingLektoren ? "Speichern ..." : "Lektorenprofil speichern"}
        </button>

        <div className="grid justify-center items-start gap-4" style={{ gridTemplateColumns: "180px" }}>
          <button type="button" className="border-0 bg-transparent p-0 m-0 cursor-pointer" onClick={() => setIsLektorenImageOverlayOpen(true)}>
            <div className="w-[160px] h-[160px] border border-arena-border rounded-full bg-arena-bg overflow-hidden grid place-items-center text-xs text-center p-2 box-border" style={lektorenImagePreviewStyle}>
              {!lektorenProfile.profileImage?.value && <span>Kein Bild gewählt</span>}
            </div>
          </button>
        </div>

        <label className="grid gap-1 text-[0.95rem]">
          Name <span className="text-xs text-arena-muted">(immer öffentlich)</span>
          <input className="input-base" value={lektorenProfile.name.value} onChange={(e) =>
            setLektorenProfile((c) => ({ ...c, name: { value: e.target.value, visibility: "public" } }))
          } />
        </label>

        <label className="grid gap-1 text-[0.95rem]">
          Motto / Satz <span className="text-xs text-arena-muted">(wird in der Übersicht angezeigt)</span>
          <input className="input-base" maxLength={300} placeholder="Dein Text verdient ein zweites Paar Augen." value={lektorenProfile.motto} onChange={(e) =>
            setLektorenProfile((c) => ({ ...c, motto: e.target.value }))
          } />
        </label>

        <div className="grid gap-1">
          <label className="text-sm font-semibold">Zu mir</label>
          <span className="text-xs text-arena-muted">Tipp: Links werden automatisch klickbar. Eigener Linktext: [Mein Blog](https://example.com)</span>
          <textarea
            className="input-base w-full"
            rows={4}
            maxLength={2000}
            placeholder="Erzähle etwas über dich ..."
            value={lektorenProfile.zuMir}
            onChange={(e) => setLektorenProfile((c) => ({ ...c, zuMir: e.target.value }))}
          />
        </div>

        {/* Kapazitäten-Kalender */}
        <div className="mt-2">
          <h3 className="text-[0.95rem] font-semibold mb-2">Kapazitäten nach Monat</h3>
          <p className="text-arena-muted text-xs mb-2">Klicke auf die Monate, in denen du Kapazitäten hast.</p>
          <div className="flex flex-wrap gap-1.5">
            {["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"].map((label, index) => {
              const month = index + 1;
              const isActive = lektorenProfile.kapazitaeten.includes(month);
              return (
                <button
                  key={month}
                  type="button"
                  className={`px-3 py-2 rounded-full text-sm font-medium cursor-pointer border min-h-[44px] sm:min-h-0 ${isActive ? "bg-green-600 text-white border-green-600" : "bg-white text-arena-text border-arena-border"}`}
                  onClick={() => {
                    setLektorenProfile((c) => ({
                      ...c,
                      kapazitaeten: isActive
                        ? c.kapazitaeten.filter((m) => m !== month)
                        : [...c.kapazitaeten, month].sort((a, b) => a - b),
                    }));
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <h3 className="text-[0.95rem] font-semibold mt-4 mb-1">Kontakt / Social Media</h3>
        <FieldWithVisibility label="Website" value={lektorenProfile.socialWebsite.value} visibility={lektorenProfile.socialWebsite.visibility} onValueChange={(value) => setLektorenProfile((c) => ({ ...c, socialWebsite: { ...c.socialWebsite, value } }))} onVisibilityChange={(visibility) => setLektorenProfile((c) => ({ ...c, socialWebsite: { ...c.socialWebsite, visibility } }))} />
        <FieldWithVisibility label="Social Media: Instagram" value={lektorenProfile.socialInstagram.value} visibility={lektorenProfile.socialInstagram.visibility} onValueChange={(value) => setLektorenProfile((c) => ({ ...c, socialInstagram: { ...c.socialInstagram, value } }))} onVisibilityChange={(visibility) => setLektorenProfile((c) => ({ ...c, socialInstagram: { ...c.socialInstagram, visibility } }))} />
        <FieldWithVisibility label="Social Media: Facebook" value={lektorenProfile.socialFacebook.value} visibility={lektorenProfile.socialFacebook.visibility} onValueChange={(value) => setLektorenProfile((c) => ({ ...c, socialFacebook: { ...c.socialFacebook, value } }))} onVisibilityChange={(visibility) => setLektorenProfile((c) => ({ ...c, socialFacebook: { ...c.socialFacebook, visibility } }))} />
        <FieldWithVisibility label="Social Media: LinkedIn" value={lektorenProfile.socialLinkedin.value} visibility={lektorenProfile.socialLinkedin.visibility} onValueChange={(value) => setLektorenProfile((c) => ({ ...c, socialLinkedin: { ...c.socialLinkedin, value } }))} onVisibilityChange={(visibility) => setLektorenProfile((c) => ({ ...c, socialLinkedin: { ...c.socialLinkedin, visibility } }))} />
        <FieldWithVisibility label="Social Media: TikTok" value={lektorenProfile.socialTiktok.value} visibility={lektorenProfile.socialTiktok.visibility} onValueChange={(value) => setLektorenProfile((c) => ({ ...c, socialTiktok: { ...c.socialTiktok, value } }))} onVisibilityChange={(visibility) => setLektorenProfile((c) => ({ ...c, socialTiktok: { ...c.socialTiktok, visibility } }))} />
        <FieldWithVisibility label="Social Media: YouTube" value={lektorenProfile.socialYoutube.value} visibility={lektorenProfile.socialYoutube.visibility} onValueChange={(value) => setLektorenProfile((c) => ({ ...c, socialYoutube: { ...c.socialYoutube, value } }))} onVisibilityChange={(visibility) => setLektorenProfile((c) => ({ ...c, socialYoutube: { ...c.socialYoutube, visibility } }))} />
        <FieldWithVisibility label="Social Media: Pinterest" value={lektorenProfile.socialPinterest.value} visibility={lektorenProfile.socialPinterest.visibility} onValueChange={(value) => setLektorenProfile((c) => ({ ...c, socialPinterest: { ...c.socialPinterest, value } }))} onVisibilityChange={(visibility) => setLektorenProfile((c) => ({ ...c, socialPinterest: { ...c.socialPinterest, visibility } }))} />
        <FieldWithVisibility label="Social Media: Reddit" value={lektorenProfile.socialReddit.value} visibility={lektorenProfile.socialReddit.visibility} onValueChange={(value) => setLektorenProfile((c) => ({ ...c, socialReddit: { ...c.socialReddit, value } }))} onVisibilityChange={(visibility) => setLektorenProfile((c) => ({ ...c, socialReddit: { ...c.socialReddit, visibility } }))} />
        <FieldWithVisibility label="Linktree" value={lektorenProfile.socialLinktree.value} visibility={lektorenProfile.socialLinktree.visibility} onValueChange={(value) => setLektorenProfile((c) => ({ ...c, socialLinktree: { ...c.socialLinktree, value } }))} onVisibilityChange={(visibility) => setLektorenProfile((c) => ({ ...c, socialLinktree: { ...c.socialLinktree, visibility } }))} />
        <FieldWithVisibility label="Newsletter" value={lektorenProfile.socialNewsletter.value} visibility={lektorenProfile.socialNewsletter.visibility} onValueChange={(value) => setLektorenProfile((c) => ({ ...c, socialNewsletter: { ...c.socialNewsletter, value } }))} onVisibilityChange={(visibility) => setLektorenProfile((c) => ({ ...c, socialNewsletter: { ...c.socialNewsletter, visibility } }))} />
        <FieldWithVisibility label="WhatsApp-Kanal" value={lektorenProfile.socialWhatsapp.value} visibility={lektorenProfile.socialWhatsapp.visibility} onValueChange={(value) => setLektorenProfile((c) => ({ ...c, socialWhatsapp: { ...c.socialWhatsapp, value } }))} onVisibilityChange={(visibility) => setLektorenProfile((c) => ({ ...c, socialWhatsapp: { ...c.socialWhatsapp, visibility } }))} />
        <FieldWithVisibility label="Mailadresse" value={lektorenProfile.socialEmail.value} visibility={lektorenProfile.socialEmail.visibility} onValueChange={(value) => setLektorenProfile((c) => ({ ...c, socialEmail: { ...c.socialEmail, value } }))} onVisibilityChange={(visibility) => setLektorenProfile((c) => ({ ...c, socialEmail: { ...c.socialEmail, visibility } }))} />

        {/* ── Eigene Profil-URL ── */}
        <div style={{ background: "var(--color-arena-bg-soft, #f7f7fa)", borderRadius: 10, padding: "0.9rem 1rem", marginTop: "0.5rem" }}>
          <span className="text-sm font-semibold">🔗 Eigene Profil-URL</span>
          <p className="text-arena-muted" style={{ fontSize: "0.82rem", margin: "0.15rem 0 0.5rem" }}>
            z.{"\u00a0"}B. <strong>bucharena.org/lektoren/{profileSlug || "dein-name"}</strong>
          </p>
          <div className="flex gap-2 items-end">
            <div className="flex-1 grid gap-1">
              <div className="flex items-center gap-1.5">
                <span className="text-arena-muted text-sm whitespace-nowrap">/lektoren/</span>
                <input type="text" className="input-base flex-1" placeholder="dein-wunschname" value={profileSlug} onChange={(e) => { setProfileSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setSlugAvailable(null); }} onBlur={async () => { const v = profileSlug.trim(); if (!v) { setSlugAvailable(null); return; } try { const res = await fetch(`/api/profile/slug?slug=${encodeURIComponent(v)}&username=${encodeURIComponent(targetUsername)}`); const data = (await res.json()) as { available: boolean }; setSlugAvailable(data.available); } catch { setSlugAvailable(null); } }} maxLength={40} />
              </div>
              {slugAvailable === true && <span className="text-xs text-green-600">✓ Verfügbar</span>}
              {slugAvailable === false && <span className="text-xs text-red-600">✗ Bereits vergeben</span>}
            </div>
            <button type="button" className="btn btn-primary" disabled={isSavingSlug} onClick={async () => { setIsSavingSlug(true); setMessage(""); setIsError(false); try { const res = await fetch("/api/profile/slug", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: profileSlug, ...(requestedUser ? { username: requestedUser } : {}) }) }); const data = (await res.json()) as { message?: string; slug?: string }; if (!res.ok) throw new Error(data.message ?? "Fehler"); setProfileSlug(data.slug ?? ""); setSlugAvailable(null); setMessage(data.message ?? "Profil-URL gespeichert."); setIsError(false); } catch (err) { setIsError(true); setMessage(err instanceof Error ? err.message : "Fehler"); } finally { setIsSavingSlug(false); } }}>{isSavingSlug ? "…" : "Speichern"}</button>
          </div>
        </div>

        <button type="button" className="btn" onClick={saveLektorenProfile} disabled={isSavingLektoren}>
          {isSavingLektoren ? "Speichern ..." : "Lektorenprofil speichern"}
        </button>
        </>
        )}

        {activeTab === "verlage" && (
        <>
        <h2 className="text-lg mt-0">Verlagsprofil</h2>
        <p className="text-arena-muted text-[0.95rem]">
          Fülle dein Profil als Verlag aus. Öffentlich sichtbare Felder werden auf deiner Verlagsseite angezeigt.
        </p>

        {/* Profil deaktivieren */}
        <div style={{ background: verlageProfile.deaktiviert ? "#fef2f2" : "#f0fdf4", borderRadius: 10, padding: "0.9rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
          <div>
            <span className="text-sm font-semibold">{verlageProfile.deaktiviert ? "🚫 Verlagsprofil ist deaktiviert" : "✅ Verlagsprofil wird angezeigt"}</span>
            <p style={{ fontSize: "0.82rem", margin: "0.15rem 0 0", color: verlageProfile.deaktiviert ? "#dc2626" : "#16a34a" }}>
              {verlageProfile.deaktiviert ? "Dein Verlagsprofil ist momentan nicht sichtbar." : "Dein Verlagsprofil ist in der Übersicht sichtbar."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!!verlageProfile.deaktiviert}
            className="toggle-switch"
            style={{
              width: 48, height: 26, borderRadius: 13, border: "none",
              background: verlageProfile.deaktiviert ? "#dc2626" : "#ccc",
              position: "relative", cursor: "pointer", flexShrink: 0,
              transition: "background 0.2s",
            }}
            onClick={() => setVerlageProfile((c) => ({ ...c, deaktiviert: !c.deaktiviert }))}
          >
            <span style={{
              position: "absolute", top: 3, left: verlageProfile.deaktiviert ? 24 : 3,
              width: 20, height: 20, borderRadius: "50%", background: "#fff",
              transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </button>
        </div>

        <button type="button" className="btn" onClick={saveVerlageProfile} disabled={isSavingVerlage}>
          {isSavingVerlage ? "Speichern ..." : "Verlagsprofil speichern"}
        </button>

        <div className="grid justify-center items-start gap-4" style={{ gridTemplateColumns: "180px" }}>
          <button type="button" className="border-0 bg-transparent p-0 m-0 cursor-pointer" onClick={() => setIsVerlageImageOverlayOpen(true)}>
            <div className="w-[160px] h-[160px] border border-arena-border rounded-full bg-arena-bg overflow-hidden grid place-items-center text-xs text-center p-2 box-border" style={verlageImagePreviewStyle}>
              {!verlageProfile.profileImage?.value && <span>Kein Bild gewählt</span>}
            </div>
          </button>
        </div>

        <label className="grid gap-1 text-[0.95rem]">
          Verlagsname <span className="text-xs text-arena-muted">(immer öffentlich)</span>
          <input className="input-base" value={verlageProfile.name.value} onChange={(e) =>
            setVerlageProfile((c) => ({ ...c, name: { value: e.target.value, visibility: "public" } }))
          } />
        </label>

        <label className="grid gap-1 text-[0.95rem]">
          Motto / Satz <span className="text-xs text-arena-muted">(wird in der Übersicht angezeigt)</span>
          <input className="input-base" maxLength={300} placeholder="Wir bringen dein Buch auf die Bühne." value={verlageProfile.motto} onChange={(e) =>
            setVerlageProfile((c) => ({ ...c, motto: e.target.value }))
          } />
        </label>

        <div className="grid gap-1">
          <label className="text-sm font-semibold">Beschreibung</label>
          <span className="text-xs text-arena-muted">Tipp: Links werden automatisch klickbar. Eigener Linktext: [Mein Blog](https://example.com)</span>
          <textarea
            className="input-base w-full"
            rows={4}
            maxLength={2000}
            placeholder="Beschreibe deinen Verlag ..."
            value={verlageProfile.beschreibung}
            onChange={(e) => setVerlageProfile((c) => ({ ...c, beschreibung: e.target.value }))}
          />
        </div>

        <label className="grid gap-1 text-[0.95rem]">
          Ansprechperson
          <input className="input-base" value={verlageProfile.ansprechperson} maxLength={200} onChange={(e) =>
            setVerlageProfile((c) => ({ ...c, ansprechperson: e.target.value }))
          } />
        </label>

        <div className="grid gap-1">
          <label className="text-sm font-semibold">Voraussetzungen</label>
          <textarea
            className="input-base w-full"
            rows={4}
            maxLength={2000}
            placeholder="Welche Voraussetzungen müssen erfüllt sein?"
            value={verlageProfile.voraussetzungen}
            onChange={(e) => setVerlageProfile((c) => ({ ...c, voraussetzungen: e.target.value }))}
          />
        </div>

        {/* Kapazitäten-Kalender */}
        <div className="mt-2">
          <h3 className="text-[0.95rem] font-semibold mb-2">Kapazitäten nach Monat</h3>
          <p className="text-arena-muted text-xs mb-2">Klicke auf die Monate, in denen du Kapazitäten hast.</p>
          <div className="flex flex-wrap gap-1.5">
            {["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"].map((label, index) => {
              const month = index + 1;
              const isActive = verlageProfile.kapazitaeten.includes(month);
              return (
                <button
                  key={month}
                  type="button"
                  className={`px-3 py-2 rounded-full text-sm font-medium cursor-pointer border min-h-[44px] sm:min-h-0 ${isActive ? "bg-green-600 text-white border-green-600" : "bg-white text-arena-text border-arena-border"}`}
                  onClick={() => {
                    setVerlageProfile((c) => ({
                      ...c,
                      kapazitaeten: isActive
                        ? c.kapazitaeten.filter((m) => m !== month)
                        : [...c.kapazitaeten, month].sort((a, b) => a - b),
                    }));
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <h3 className="text-[0.95rem] font-semibold mt-4 mb-1">Webseite / Social Media</h3>
        <FieldWithVisibility label="Website" value={verlageProfile.socialWebsite.value} visibility={verlageProfile.socialWebsite.visibility} onValueChange={(value) => setVerlageProfile((c) => ({ ...c, socialWebsite: { ...c.socialWebsite, value } }))} onVisibilityChange={(visibility) => setVerlageProfile((c) => ({ ...c, socialWebsite: { ...c.socialWebsite, visibility } }))} />
        <FieldWithVisibility label="Social Media: Instagram" value={verlageProfile.socialInstagram.value} visibility={verlageProfile.socialInstagram.visibility} onValueChange={(value) => setVerlageProfile((c) => ({ ...c, socialInstagram: { ...c.socialInstagram, value } }))} onVisibilityChange={(visibility) => setVerlageProfile((c) => ({ ...c, socialInstagram: { ...c.socialInstagram, visibility } }))} />
        <FieldWithVisibility label="Social Media: Facebook" value={verlageProfile.socialFacebook.value} visibility={verlageProfile.socialFacebook.visibility} onValueChange={(value) => setVerlageProfile((c) => ({ ...c, socialFacebook: { ...c.socialFacebook, value } }))} onVisibilityChange={(visibility) => setVerlageProfile((c) => ({ ...c, socialFacebook: { ...c.socialFacebook, visibility } }))} />
        <FieldWithVisibility label="Social Media: LinkedIn" value={verlageProfile.socialLinkedin.value} visibility={verlageProfile.socialLinkedin.visibility} onValueChange={(value) => setVerlageProfile((c) => ({ ...c, socialLinkedin: { ...c.socialLinkedin, value } }))} onVisibilityChange={(visibility) => setVerlageProfile((c) => ({ ...c, socialLinkedin: { ...c.socialLinkedin, visibility } }))} />
        <FieldWithVisibility label="Social Media: TikTok" value={verlageProfile.socialTiktok.value} visibility={verlageProfile.socialTiktok.visibility} onValueChange={(value) => setVerlageProfile((c) => ({ ...c, socialTiktok: { ...c.socialTiktok, value } }))} onVisibilityChange={(visibility) => setVerlageProfile((c) => ({ ...c, socialTiktok: { ...c.socialTiktok, visibility } }))} />
        <FieldWithVisibility label="Social Media: YouTube" value={verlageProfile.socialYoutube.value} visibility={verlageProfile.socialYoutube.visibility} onValueChange={(value) => setVerlageProfile((c) => ({ ...c, socialYoutube: { ...c.socialYoutube, value } }))} onVisibilityChange={(visibility) => setVerlageProfile((c) => ({ ...c, socialYoutube: { ...c.socialYoutube, visibility } }))} />
        <FieldWithVisibility label="Social Media: Pinterest" value={verlageProfile.socialPinterest.value} visibility={verlageProfile.socialPinterest.visibility} onValueChange={(value) => setVerlageProfile((c) => ({ ...c, socialPinterest: { ...c.socialPinterest, value } }))} onVisibilityChange={(visibility) => setVerlageProfile((c) => ({ ...c, socialPinterest: { ...c.socialPinterest, visibility } }))} />
        <FieldWithVisibility label="Social Media: Reddit" value={verlageProfile.socialReddit.value} visibility={verlageProfile.socialReddit.visibility} onValueChange={(value) => setVerlageProfile((c) => ({ ...c, socialReddit: { ...c.socialReddit, value } }))} onVisibilityChange={(visibility) => setVerlageProfile((c) => ({ ...c, socialReddit: { ...c.socialReddit, visibility } }))} />
        <FieldWithVisibility label="Linktree" value={verlageProfile.socialLinktree.value} visibility={verlageProfile.socialLinktree.visibility} onValueChange={(value) => setVerlageProfile((c) => ({ ...c, socialLinktree: { ...c.socialLinktree, value } }))} onVisibilityChange={(visibility) => setVerlageProfile((c) => ({ ...c, socialLinktree: { ...c.socialLinktree, visibility } }))} />
        <FieldWithVisibility label="Newsletter" value={verlageProfile.socialNewsletter.value} visibility={verlageProfile.socialNewsletter.visibility} onValueChange={(value) => setVerlageProfile((c) => ({ ...c, socialNewsletter: { ...c.socialNewsletter, value } }))} onVisibilityChange={(visibility) => setVerlageProfile((c) => ({ ...c, socialNewsletter: { ...c.socialNewsletter, visibility } }))} />
        <FieldWithVisibility label="WhatsApp-Kanal" value={verlageProfile.socialWhatsapp.value} visibility={verlageProfile.socialWhatsapp.visibility} onValueChange={(value) => setVerlageProfile((c) => ({ ...c, socialWhatsapp: { ...c.socialWhatsapp, value } }))} onVisibilityChange={(visibility) => setVerlageProfile((c) => ({ ...c, socialWhatsapp: { ...c.socialWhatsapp, visibility } }))} />
        <FieldWithVisibility label="Mailadresse" value={verlageProfile.socialEmail.value} visibility={verlageProfile.socialEmail.visibility} onValueChange={(value) => setVerlageProfile((c) => ({ ...c, socialEmail: { ...c.socialEmail, value } }))} onVisibilityChange={(visibility) => setVerlageProfile((c) => ({ ...c, socialEmail: { ...c.socialEmail, visibility } }))} />

        {/* ── Eigene Profil-URL ── */}
        <div style={{ background: "var(--color-arena-bg-soft, #f7f7fa)", borderRadius: 10, padding: "0.9rem 1rem", marginTop: "0.5rem" }}>
          <span className="text-sm font-semibold">🔗 Eigene Profil-URL</span>
          <p className="text-arena-muted" style={{ fontSize: "0.82rem", margin: "0.15rem 0 0.5rem" }}>
            z.{"\u00a0"}B. <strong>bucharena.org/verlage/{profileSlug || "dein-name"}</strong>
          </p>
          <div className="flex gap-2 items-end">
            <div className="flex-1 grid gap-1">
              <div className="flex items-center gap-1.5">
                <span className="text-arena-muted text-sm whitespace-nowrap">/verlage/</span>
                <input type="text" className="input-base flex-1" placeholder="dein-wunschname" value={profileSlug} onChange={(e) => { setProfileSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setSlugAvailable(null); }} onBlur={async () => { const v = profileSlug.trim(); if (!v) { setSlugAvailable(null); return; } try { const res = await fetch(`/api/profile/slug?slug=${encodeURIComponent(v)}&username=${encodeURIComponent(targetUsername)}`); const data = (await res.json()) as { available: boolean }; setSlugAvailable(data.available); } catch { setSlugAvailable(null); } }} maxLength={40} />
              </div>
              {slugAvailable === true && <span className="text-xs text-green-600">✓ Verfügbar</span>}
              {slugAvailable === false && <span className="text-xs text-red-600">✗ Bereits vergeben</span>}
            </div>
            <button type="button" className="btn btn-primary" disabled={isSavingSlug} onClick={async () => { setIsSavingSlug(true); setMessage(""); setIsError(false); try { const res = await fetch("/api/profile/slug", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: profileSlug, ...(requestedUser ? { username: requestedUser } : {}) }) }); const data = (await res.json()) as { message?: string; slug?: string }; if (!res.ok) throw new Error(data.message ?? "Fehler"); setProfileSlug(data.slug ?? ""); setSlugAvailable(null); setMessage(data.message ?? "Profil-URL gespeichert."); setIsError(false); } catch (err) { setIsError(true); setMessage(err instanceof Error ? err.message : "Fehler"); } finally { setIsSavingSlug(false); } }}>{isSavingSlug ? "…" : "Speichern"}</button>
          </div>
        </div>

        <button type="button" className="btn" onClick={saveVerlageProfile} disabled={isSavingVerlage}>
          {isSavingVerlage ? "Speichern ..." : "Verlagsprofil speichern"}
        </button>
        </>
        )}

        {activeTab === "kooperationen" && (
          <KooperationenTab username={targetUsername} />
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

        {activeTab === "konto" && (
          <>
          <h2 className="text-lg mt-0">Kontoeinstellungen</h2>

          {/* ── Newsletter Opt-In ── */}
          <div style={{ background: newsletterOptIn ? "#f0fdf4" : "#f7f7fa", borderRadius: 10, padding: "0.9rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", transition: "background 0.2s" }}>
            <div>
              <span className="text-sm font-semibold">{newsletterOptIn ? "✅ Newsletter aktiv" : "📬 Newsletter"}</span>
              <p style={{ fontSize: "0.82rem", margin: "0.15rem 0 0", color: newsletterOptIn ? "#16a34a" : "#6b7280" }}>
                {newsletterOptIn ? "Du erhältst Neuigkeiten und Updates per E-Mail." : "Erhalte Neuigkeiten und Updates per E-Mail."}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={newsletterOptIn}
              disabled={isSavingNewsletter}
              className="toggle-switch"
              style={{
                width: 48, height: 26, borderRadius: 13, border: "none",
                background: newsletterOptIn ? "#16a34a" : "#ccc",
                position: "relative", cursor: "pointer", flexShrink: 0,
                transition: "background 0.2s",
              }}
              onClick={async () => {
                setIsSavingNewsletter(true);
                const newVal = !newsletterOptIn;
                try {
                  const res = await fetch("/api/profile/newsletter", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ newsletterOptIn: newVal }),
                  });
                  if (res.ok) {
                    setNewsletterOptIn(newVal);
                    setMessage(newVal ? "Newsletter aktiviert." : "Newsletter deaktiviert.");
                    setIsError(false);
                  } else {
                    setIsError(true);
                    setMessage("Newsletter-Einstellung konnte nicht gespeichert werden.");
                  }
                } catch {
                  setIsError(true);
                  setMessage("Newsletter-Einstellung konnte nicht gespeichert werden.");
                } finally {
                  setIsSavingNewsletter(false);
                }
              }}
            >
              <span style={{
                position: "absolute", top: 3, left: newsletterOptIn ? 24 : 3,
                width: 20, height: 20, borderRadius: "50%", background: "#fff",
                transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </button>
          </div>

          {/* ── E-Mail bei ungelesenen Nachrichten ── */}
          <div style={{ background: emailOnUnreadMessages ? "#f0fdf4" : "#f7f7fa", borderRadius: 10, padding: "0.9rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", transition: "background 0.2s" }}>
            <div>
              <span className="text-sm font-semibold">{emailOnUnreadMessages ? "✅ Nachrichteninfo aktiv" : "🔔 Nachrichteninfo"}</span>
              <p style={{ fontSize: "0.82rem", margin: "0.15rem 0 0", color: emailOnUnreadMessages ? "#16a34a" : "#6b7280" }}>
                {emailOnUnreadMessages ? "Du wirst per E-Mail benachrichtigt, wenn Nachrichten 24 h ungelesen bleiben." : "Per E-Mail benachrichtigt werden, wenn Nachrichten 24 h ungelesen bleiben."}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={emailOnUnreadMessages}
              disabled={isSavingUnreadMail}
              className="toggle-switch"
              style={{
                width: 48, height: 26, borderRadius: 13, border: "none",
                background: emailOnUnreadMessages ? "#16a34a" : "#ccc",
                position: "relative", cursor: "pointer", flexShrink: 0,
                transition: "background 0.2s",
              }}
              onClick={async () => {
                setIsSavingUnreadMail(true);
                const newVal = !emailOnUnreadMessages;
                try {
                  const res = await fetch("/api/profile/email-on-unread", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ emailOnUnreadMessages: newVal }),
                  });
                  if (res.ok) {
                    setEmailOnUnreadMessages(newVal);
                    setMessage(newVal ? "E-Mail-Benachrichtigung aktiviert." : "E-Mail-Benachrichtigung deaktiviert.");
                    setIsError(false);
                  } else {
                    setIsError(true);
                    setMessage("Einstellung konnte nicht gespeichert werden.");
                  }
                } catch {
                  setIsError(true);
                  setMessage("Einstellung konnte nicht gespeichert werden.");
                } finally {
                  setIsSavingUnreadMail(false);
                }
              }}
            >
              <span style={{
                position: "absolute", top: 3, left: emailOnUnreadMessages ? 24 : 3,
                width: 20, height: 20, borderRadius: "50%", background: "#fff",
                transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </button>
          </div>

          {/* ── Angezeigter Name ── */}
          <div style={{ background: "var(--color-arena-bg-soft, #f7f7fa)", borderRadius: 10, padding: "0.9rem 1rem" }}>
            <span className="text-sm font-semibold">📝 Angezeigter Name</span>
            <p className="text-arena-muted" style={{ fontSize: "0.82rem", margin: "0.15rem 0 0.5rem" }}>
              Dieser Name wird bei Nachrichten, Lesezeichen und im Treffpunkt angezeigt.
            </p>
            <div className="flex gap-2 items-end">
              <input
                type="text"
                className="input-base flex-1"
                placeholder="z. B. Dein Vorname oder Spitzname"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={120}
              />
              <button
                type="button"
                className="btn btn-primary"
                disabled={isSavingDisplayName}
                onClick={async () => {
                  setIsSavingDisplayName(true);
                  setMessage("");
                  setIsError(false);
                  try {
                    const res = await fetch("/api/profile/display-name", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ displayName, ...(requestedUser ? { username: requestedUser } : {}) }),
                    });
                    const data = (await res.json()) as { message?: string };
                    if (!res.ok) throw new Error(data.message ?? "Fehler beim Speichern.");
                    setMessage(data.message ?? "Angezeigter Name gespeichert.");
                    setIsError(false);
                  } catch (err) {
                    setIsError(true);
                    setMessage(err instanceof Error ? err.message : "Fehler beim Speichern.");
                  } finally {
                    setIsSavingDisplayName(false);
                  }
                }}
              >
                {isSavingDisplayName ? "Speichern …" : "Speichern"}
              </button>
            </div>
          </div>

          <hr className="my-2" />

          <p className="text-arena-muted text-[0.95rem]">
            Hier kannst du deinen Benutzernamen, deine E-Mail-Adresse oder dein Passwort ändern.
            Zur Bestätigung musst du dein aktuelles Passwort eingeben.
          </p>

          <label className="grid gap-1">
            <span className="text-sm font-medium">Neuer Benutzername</span>
            <input
              type="text"
              className="input-base"
              placeholder={account.username}
              value={accountNewUsername}
              onChange={(e) => setAccountNewUsername(e.target.value)}
              autoComplete="username"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium">Neue E-Mail-Adresse</span>
            <input
              type="email"
              className="input-base"
              placeholder={account.email}
              value={accountNewEmail}
              onChange={(e) => setAccountNewEmail(e.target.value)}
              autoComplete="email"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium">Neues Passwort</span>
            <input
              type="password"
              className="input-base"
              placeholder="Mindestens 8 Zeichen"
              value={accountNewPassword}
              onChange={(e) => setAccountNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium">Neues Passwort bestätigen</span>
            <input
              type="password"
              className="input-base"
              placeholder="Passwort wiederholen"
              value={accountNewPasswordConfirm}
              onChange={(e) => setAccountNewPasswordConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </label>

          <hr className="my-2" />

          <label className="grid gap-1">
            <span className="text-sm font-medium">Aktuelles Passwort (Pflichtfeld)</span>
            <input
              type="password"
              className="input-base"
              placeholder="Zur Bestätigung"
              value={accountCurrentPassword}
              onChange={(e) => setAccountCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          <button
            type="button"
            className="btn btn-primary"
            disabled={isSavingAccount || !accountCurrentPassword}
            onClick={async () => {
              setMessage("");
              setIsError(false);

              if (accountNewPassword && accountNewPassword !== accountNewPasswordConfirm) {
                setIsError(true);
                setMessage("Die neuen Passwörter stimmen nicht überein.");
                return;
              }

              if (!accountNewUsername && !accountNewEmail && !accountNewPassword) {
                setIsError(true);
                setMessage("Bitte fülle mindestens ein Feld aus.");
                return;
              }

              setIsSavingAccount(true);
              try {
                const payload: Record<string, string> = {
                  currentPassword: accountCurrentPassword,
                };
                if (accountNewUsername && accountNewUsername !== account.username) {
                  payload.newUsername = accountNewUsername;
                }
                if (accountNewEmail && accountNewEmail !== account.email) {
                  payload.newEmail = accountNewEmail;
                }
                if (accountNewPassword) {
                  payload.newPassword = accountNewPassword;
                }

                const res = await fetch("/api/auth/update-account", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });

                const data = (await res.json()) as { message?: string; user?: { username: string; email: string; role: string } };
                if (!res.ok) {
                  throw new Error(data.message ?? "Aktualisierung fehlgeschlagen.");
                }

                // Update local account state
                if (data.user) {
                  const updatedAccount: LoggedInAccount = {
                    username: data.user.username,
                    email: data.user.email,
                    role: data.user.role as LoggedInAccount["role"],
                  };
                  setStoredAccount(updatedAccount);
                }

                setMessage(data.message ?? "Kontodaten aktualisiert.");
                setAccountNewUsername("");
                setAccountNewEmail("");
                setAccountNewPassword("");
                setAccountNewPasswordConfirm("");
                setAccountCurrentPassword("");
              } catch (err) {
                setIsError(true);
                setMessage(
                  err instanceof Error ? err.message : "Aktualisierung fehlgeschlagen."
                );
              } finally {
                setIsSavingAccount(false);
              }
            }}
          >
            {isSavingAccount ? "Wird gespeichert …" : "Änderungen speichern"}
          </button>
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

            <input
              ref={imageFileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                const selectedFile = event.target.files?.[0];
                if (selectedFile) {
                  void uploadImage(selectedFile);
                }
                event.currentTarget.value = "";
              }}
            />
            {isUploadingImage && <span className="text-xs text-arena-muted">Bild wird hochgeladen ...</span>}

            <div>
              <span className="block text-xs mb-1">Sichtbarkeit</span>
              <VisibilityToggle
                value={profile.profileImage.visibility}
                onChange={(visibility) => updateVisibility("profileImage", visibility)}
              />
            </div>

            <div
              className={`w-[160px] h-[160px] border border-arena-border rounded-full bg-arena-bg overflow-hidden grid place-items-center text-xs text-center p-2 box-border ${profile.profileImage.value ? "cursor-grab" : "cursor-pointer"}`}
              style={imagePreviewStyle}
              onPointerDown={onImagePointerDown}
              onPointerMove={onImagePointerMove}
              onPointerUp={onImagePointerUp}
              onPointerCancel={onImagePointerUp}
              onClick={() => imageFileInputRef.current?.click()}
              title={profile.profileImage.value ? "Ziehen zum Positionieren, Klicken zum Ändern" : "Klicken zum Auswählen"}
            >
              {!profile.profileImage.value && (
                <span className="flex flex-col items-center gap-1 text-arena-muted pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  Bild auswählen
                </span>
              )}
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

            <input
              ref={speakerImageFileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                const selectedFile = event.target.files?.[0];
                if (selectedFile) {
                  void uploadSpeakerImage(selectedFile);
                }
                event.currentTarget.value = "";
              }}
            />
            {isUploadingSpeakerImage && <span className="text-xs text-arena-muted">Bild wird hochgeladen ...</span>}

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
              className={`w-[160px] h-[160px] border border-arena-border rounded-full bg-arena-bg overflow-hidden grid place-items-center text-xs text-center p-2 box-border ${speakerProfile.profileImage?.value ? "cursor-grab" : "cursor-pointer"}`}
              style={speakerImagePreviewStyle}
              onPointerDown={onSpeakerImagePointerDown}
              onPointerMove={onSpeakerImagePointerMove}
              onPointerUp={onSpeakerImagePointerUp}
              onPointerCancel={onSpeakerImagePointerUp}
              onClick={() => speakerImageFileInputRef.current?.click()}
              title={speakerProfile.profileImage?.value ? "Ziehen zum Positionieren, Klicken zum Ändern" : "Klicken zum Auswählen"}
            >
              {!speakerProfile.profileImage?.value && (
                <span className="flex flex-col items-center gap-1 text-arena-muted pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  Bild auswählen
                </span>
              )}
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

      {isBloggerImageOverlayOpen && (
        <div className="overlay-backdrop" onClick={() => setIsBloggerImageOverlayOpen(false)}>
          <section className="w-[min(560px,100%)] bg-white rounded-xl p-4 box-border grid gap-3 justify-items-center" onClick={(event) => event.stopPropagation()}>
            <h2>Blogger-Bildeinstellungen</h2>

            <input
              ref={bloggerImageFileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                const selectedFile = event.target.files?.[0];
                if (selectedFile) {
                  void uploadBloggerImage(selectedFile);
                }
                event.currentTarget.value = "";
              }}
            />
            {isUploadingBloggerImage && <span className="text-xs text-arena-muted">Bild wird hochgeladen ...</span>}

            <div>
              <span className="block text-xs mb-1">Sichtbarkeit</span>
              <VisibilityToggle
                value={bloggerProfile.profileImage.visibility}
                onChange={(visibility) =>
                  setBloggerProfile((current) => ({
                    ...current,
                    profileImage: { ...current.profileImage, visibility },
                  }))
                }
              />
            </div>

            <div
              className={`w-[160px] h-[160px] border border-arena-border rounded-full bg-arena-bg overflow-hidden grid place-items-center text-xs text-center p-2 box-border ${bloggerProfile.profileImage?.value ? "cursor-grab" : "cursor-pointer"}`}
              style={bloggerImagePreviewStyle}
              onPointerDown={onBloggerImagePointerDown}
              onPointerMove={onBloggerImagePointerMove}
              onPointerUp={onBloggerImagePointerUp}
              onPointerCancel={onBloggerImagePointerUp}
              onClick={() => bloggerImageFileInputRef.current?.click()}
              title={bloggerProfile.profileImage?.value ? "Ziehen zum Positionieren, Klicken zum Ändern" : "Klicken zum Auswählen"}
            >
              {!bloggerProfile.profileImage?.value && (
                <span className="flex flex-col items-center gap-1 text-arena-muted pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  Bild auswählen
                </span>
              )}
            </div>

            <div className="grid gap-2.5">
              <label>
                Zoom
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={bloggerProfile.profileImage.crop.zoom}
                  onChange={(event) =>
                    setBloggerProfile((current) => ({
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
              onClick={() => setIsBloggerImageOverlayOpen(false)}
            >
              Fertig
            </button>
          </section>
        </div>
      )}

      {isTestleserImageOverlayOpen && (
        <div className="overlay-backdrop" onClick={() => setIsTestleserImageOverlayOpen(false)}>
          <section className="w-[min(560px,100%)] bg-white rounded-xl p-4 box-border grid gap-3 justify-items-center" onClick={(event) => event.stopPropagation()}>
            <h2>Testleser-Bildeinstellungen</h2>
            <input ref={testleserImageFileInputRef} type="file" accept="image/*" className="sr-only" onChange={(event) => { const selectedFile = event.target.files?.[0]; if (selectedFile) void uploadTestleserImage(selectedFile); event.currentTarget.value = ""; }} />
            {isUploadingTestleserImage && <span className="text-xs text-arena-muted">Bild wird hochgeladen ...</span>}
            <div>
              <span className="block text-xs mb-1">Sichtbarkeit</span>
              <VisibilityToggle value={testleserProfile.profileImage.visibility} onChange={(visibility) => setTestleserProfile((current) => ({ ...current, profileImage: { ...current.profileImage, visibility } }))} />
            </div>
            <div className={`w-[160px] h-[160px] border border-arena-border rounded-full bg-arena-bg overflow-hidden grid place-items-center text-xs text-center p-2 box-border ${testleserProfile.profileImage?.value ? "cursor-grab" : "cursor-pointer"}`} style={testleserImagePreviewStyle} onPointerDown={onTestleserImagePointerDown} onPointerMove={onTestleserImagePointerMove} onPointerUp={onTestleserImagePointerUp} onPointerCancel={onTestleserImagePointerUp} onClick={() => testleserImageFileInputRef.current?.click()} title={testleserProfile.profileImage?.value ? "Ziehen zum Positionieren, Klicken zum Ändern" : "Klicken zum Auswählen"}>
              {!testleserProfile.profileImage?.value && <span className="flex flex-col items-center gap-1 text-arena-muted pointer-events-none"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>Bild auswählen</span>}
            </div>
            <div className="grid gap-2.5">
              <label>
                Zoom
                <input type="range" min={1} max={3} step={0.1} value={testleserProfile.profileImage.crop.zoom} onChange={(event) => setTestleserProfile((current) => ({ ...current, profileImage: { ...current.profileImage, crop: { ...current.profileImage.crop, zoom: Number(event.target.value) } } }))} />
              </label>
            </div>
            <button type="button" className="btn" onClick={() => setIsTestleserImageOverlayOpen(false)}>Fertig</button>
          </section>
        </div>
      )}

      {isLektorenImageOverlayOpen && (
        <div className="overlay-backdrop" onClick={() => setIsLektorenImageOverlayOpen(false)}>
          <section className="w-[min(560px,100%)] bg-white rounded-xl p-4 box-border grid gap-3 justify-items-center" onClick={(event) => event.stopPropagation()}>
            <h2>Lektoren-Bildeinstellungen</h2>
            <input ref={lektorenImageFileInputRef} type="file" accept="image/*" className="sr-only" onChange={(event) => { const selectedFile = event.target.files?.[0]; if (selectedFile) void uploadLektorenImage(selectedFile); event.currentTarget.value = ""; }} />
            {isUploadingLektorenImage && <span className="text-xs text-arena-muted">Bild wird hochgeladen ...</span>}
            <div>
              <span className="block text-xs mb-1">Sichtbarkeit</span>
              <VisibilityToggle value={lektorenProfile.profileImage.visibility} onChange={(visibility) => setLektorenProfile((current) => ({ ...current, profileImage: { ...current.profileImage, visibility } }))} />
            </div>
            <div className={`w-[160px] h-[160px] border border-arena-border rounded-full bg-arena-bg overflow-hidden grid place-items-center text-xs text-center p-2 box-border ${lektorenProfile.profileImage?.value ? "cursor-grab" : "cursor-pointer"}`} style={lektorenImagePreviewStyle} onPointerDown={onLektorenImagePointerDown} onPointerMove={onLektorenImagePointerMove} onPointerUp={onLektorenImagePointerUp} onPointerCancel={onLektorenImagePointerUp} onClick={() => lektorenImageFileInputRef.current?.click()} title={lektorenProfile.profileImage?.value ? "Ziehen zum Positionieren, Klicken zum Ändern" : "Klicken zum Auswählen"}>
              {!lektorenProfile.profileImage?.value && <span className="flex flex-col items-center gap-1 text-arena-muted pointer-events-none"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>Bild auswählen</span>}
            </div>
            <div className="grid gap-2.5">
              <label>
                Zoom
                <input type="range" min={1} max={3} step={0.1} value={lektorenProfile.profileImage.crop.zoom} onChange={(event) => setLektorenProfile((current) => ({ ...current, profileImage: { ...current.profileImage, crop: { ...current.profileImage.crop, zoom: Number(event.target.value) } } }))} />
              </label>
            </div>
            <button type="button" className="btn" onClick={() => setIsLektorenImageOverlayOpen(false)}>Fertig</button>
          </section>
        </div>
      )}

      {isVerlageImageOverlayOpen && (
        <div className="overlay-backdrop" onClick={() => setIsVerlageImageOverlayOpen(false)}>
          <section className="w-[min(560px,100%)] bg-white rounded-xl p-4 box-border grid gap-3 justify-items-center" onClick={(event) => event.stopPropagation()}>
            <h2>Verlags-Bildeinstellungen</h2>
            <input ref={verlageImageFileInputRef} type="file" accept="image/*" className="sr-only" onChange={(event) => { const selectedFile = event.target.files?.[0]; if (selectedFile) void uploadVerlageImage(selectedFile); event.currentTarget.value = ""; }} />
            {isUploadingVerlageImage && <span className="text-xs text-arena-muted">Bild wird hochgeladen ...</span>}
            <div>
              <span className="block text-xs mb-1">Sichtbarkeit</span>
              <VisibilityToggle value={verlageProfile.profileImage.visibility} onChange={(visibility) => setVerlageProfile((current) => ({ ...current, profileImage: { ...current.profileImage, visibility } }))} />
            </div>
            <div className={`w-[160px] h-[160px] border border-arena-border rounded-full bg-arena-bg overflow-hidden grid place-items-center text-xs text-center p-2 box-border ${verlageProfile.profileImage?.value ? "cursor-grab" : "cursor-pointer"}`} style={verlageImagePreviewStyle} onPointerDown={onVerlageImagePointerDown} onPointerMove={onVerlageImagePointerMove} onPointerUp={onVerlageImagePointerUp} onPointerCancel={onVerlageImagePointerUp} onClick={() => verlageImageFileInputRef.current?.click()} title={verlageProfile.profileImage?.value ? "Ziehen zum Positionieren, Klicken zum Ändern" : "Klicken zum Auswählen"}>
              {!verlageProfile.profileImage?.value && <span className="flex flex-col items-center gap-1 text-arena-muted pointer-events-none"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>Bild auswählen</span>}
            </div>
            <div className="grid gap-2.5">
              <label>
                Zoom
                <input type="range" min={1} max={3} step={0.1} value={verlageProfile.profileImage.crop.zoom} onChange={(event) => setVerlageProfile((current) => ({ ...current, profileImage: { ...current.profileImage, crop: { ...current.profileImage.crop, zoom: Number(event.target.value) } } }))} />
              </label>
            </div>
            <button type="button" className="btn" onClick={() => setIsVerlageImageOverlayOpen(false)}>Fertig</button>
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
  multiline?: boolean;
  maxLength?: number;
  hint?: string;
};

function FieldWithVisibility({
  label,
  value,
  visibility,
  onValueChange,
  onVisibilityChange,
  multiline,
  maxLength,
  hint,
}: FieldWithVisibilityProps) {
  return (
    <div className="grid grid-cols-[2fr_1fr] gap-3 max-[780px]:grid-cols-1">
      <label className="grid gap-1 text-[0.95rem]">
        {label}
        {hint && <span className="text-xs text-arena-muted">{hint}</span>}
        {multiline ? (
          <textarea className="input-base resize-y" rows={4} maxLength={maxLength} value={value} onChange={(event) => {
            const newValue = event.target.value;
            onValueChange(newValue);
            if (newValue.trim() && visibility === "hidden") {
              onVisibilityChange("public");
            }
          }} />
        ) : (
          <input className="input-base" value={value} onChange={(event) => {
            const newValue = event.target.value;
            onValueChange(newValue);
            if (newValue.trim() && visibility === "hidden") {
              onVisibilityChange("public");
            }
          }} />
        )}
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
