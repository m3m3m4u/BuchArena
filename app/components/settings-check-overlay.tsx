"use client";

import { useEffect, useState } from "react";
import { getStoredAccount } from "@/lib/client-account";

type SettingsData = {
  email: string;
  newsletterOptIn: boolean;
  emailOnUnreadMessages: boolean;
  lastSettingsCheckAt: string | null;
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default function SettingsCheckOverlay() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [show, setShow] = useState(false);
  const [newsletter, setNewsletter] = useState(false);
  const [unreadMail, setUnreadMail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const account = getStoredAccount();
    if (!account) return;

    fetch("/api/profile/settings-check", { credentials: "same-origin" })
      .then(async (res) => {
        if (!res.ok) return;
        const d = (await res.json()) as SettingsData;
        setData(d);
        setNewsletter(d.newsletterOptIn);
        setUnreadMail(d.emailOnUnreadMessages);

        const last = d.lastSettingsCheckAt ? new Date(d.lastSettingsCheckAt).getTime() : 0;
        if (Date.now() - last > THIRTY_DAYS_MS) {
          setShow(true);
        }
      })
      .catch(() => {});
  }, []);

  if (!show || !data) return null;

  async function confirm() {
    setSaving(true);
    setSaveError("");
    try {
      const response = await fetch("/api/profile/settings-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newsletterOptIn: newsletter,
          emailOnUnreadMessages: unreadMail,
        }),
      });
      if (!response.ok) throw new Error("Speichern fehlgeschlagen.");
      setShow(false);
    } catch {
      setSaveError("Die Einstellungen konnten nicht gespeichert werden. Bitte versuche es erneut.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overlay-backdrop" style={{ zIndex: 1200 }}>
      <section
        className="w-full max-w-[460px] rounded-xl bg-white p-5 box-border grid gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg mt-0 mb-0">Stimmen deine Einstellungen noch?</h2>
        <p className="text-arena-muted" style={{ fontSize: "0.9rem", margin: 0 }}>
          Bitte prüfe kurz, ob deine E-Mail-Adresse und Benachrichtigungen noch aktuell sind.
        </p>

        {/* E-Mail-Adresse */}
        <div style={{ background: "var(--color-arena-bg)", borderRadius: 10, padding: "0.8rem 1rem" }}>
          <span className="text-sm font-semibold">E-Mail-Adresse</span>
          <p style={{ fontSize: "0.9rem", margin: "0.25rem 0 0", wordBreak: "break-all" }}>
            {data.email}
          </p>
          <p className="text-arena-muted" style={{ fontSize: "0.78rem", margin: "0.25rem 0 0" }}>
            Ändern kannst du sie in den Kontoeinstellungen.
          </p>
        </div>

        {/* Newsletter Toggle */}
        <div
          style={{
            background: "var(--color-arena-bg)",
            borderRadius: 10, padding: "0.8rem 1rem",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem",
            transition: "background 0.2s",
          }}
        >
          <div>
            <span className="text-sm font-semibold">{newsletter ? "Newsletter aktiv" : "Newsletter"}</span>
            <p style={{ fontSize: "0.82rem", margin: "0.15rem 0 0", color: "var(--color-arena-muted)" }}>
              Neuigkeiten und Updates per E-Mail.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={newsletter}
            aria-label="Newsletter"
            className="toggle-switch"
            style={{
              width: 48, height: 26, borderRadius: 13, border: "none",
              background: newsletter ? "var(--color-arena-blue)" : "var(--color-arena-border)",
              position: "relative", cursor: "pointer", flexShrink: 0,
              transition: "background 0.2s",
            }}
            onClick={() => setNewsletter((v) => !v)}
          >
            <span style={{
              position: "absolute", top: 3, left: newsletter ? 24 : 3,
              width: 20, height: 20, borderRadius: "50%", background: "#fff",
              transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </button>
        </div>

        {/* Nachrichteninfo Toggle */}
        <div
          style={{
            background: "var(--color-arena-bg)",
            borderRadius: 10, padding: "0.8rem 1rem",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem",
            transition: "background 0.2s",
          }}
        >
          <div>
            <span className="text-sm font-semibold">{unreadMail ? "Nachrichteninfo aktiv" : "Nachrichteninfo"}</span>
            <p style={{ fontSize: "0.82rem", margin: "0.15rem 0 0", color: "var(--color-arena-muted)" }}>
              E-Mail bei ungelesenen Nachrichten nach 24&nbsp;h.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={unreadMail}
            aria-label="Nachrichteninfo"
            className="toggle-switch"
            style={{
              width: 48, height: 26, borderRadius: 13, border: "none",
              background: unreadMail ? "var(--color-arena-blue)" : "var(--color-arena-border)",
              position: "relative", cursor: "pointer", flexShrink: 0,
              transition: "background 0.2s",
            }}
            onClick={() => setUnreadMail((v) => !v)}
          >
            <span style={{
              position: "absolute", top: 3, left: unreadMail ? 24 : 3,
              width: 20, height: 20, borderRadius: "50%", background: "#fff",
              transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </button>
        </div>

        {saveError && <p role="alert" className="text-sm text-arena-danger">{saveError}</p>}
        <button
          type="button"
          className="btn btn-primary"
          disabled={saving}
          onClick={confirm}
        >
          {saving ? "Wird gespeichert …" : "Passt so ✓"}
        </button>
      </section>
    </div>
  );
}
