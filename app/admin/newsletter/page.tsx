"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { useEffect, useState, useCallback } from "react";
import { getStoredAccount } from "@/lib/client-account";

/* ── Toolbar ── */

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      className={`px-2 py-1 rounded text-sm font-medium border transition-colors ${
        active
          ? "bg-blue-600 text-white border-blue-600"
          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  const setLink = useCallback(() => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL eingeben:", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  return (
    <div className="flex flex-wrap gap-1 p-2 border border-b-0 border-gray-300 rounded-t-lg bg-gray-50">
      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Fett">
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Kursiv">
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Unterstrichen">
        <span className="underline">U</span>
      </ToolbarButton>
      <span className="border-l border-gray-300 mx-1" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Überschrift 1">H1</ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Überschrift 2">H2</ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Überschrift 3">H3</ToolbarButton>
      <span className="border-l border-gray-300 mx-1" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Aufzählung">• Liste</ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Nummerierte Liste">1. Liste</ToolbarButton>
      <span className="border-l border-gray-300 mx-1" />
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Linksbündig">⬱</ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Zentriert">≡</ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Rechtsbündig">⬰</ToolbarButton>
      <span className="border-l border-gray-300 mx-1" />
      <ToolbarButton onClick={setLink} active={editor.isActive("link")} title="Link einfügen">🔗 Link</ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Zitat">❝</ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Trennlinie">—</ToolbarButton>
      <span className="border-l border-gray-300 mx-1" />
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} active={false} title="Rückgängig">↩</ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} active={false} title="Wiederholen">↪</ToolbarButton>
    </div>
  );
}

/* ── Haupt-Komponente ── */

export default function NewsletterAdminPage() {
  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [sendProgress, setSendProgress] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const [testEmail, setTestEmail] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  useEffect(() => {
    const acc = getStoredAccount();
    setIsAdmin(acc?.role === "ADMIN" || acc?.role === "SUPERADMIN");
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[320px] p-4 focus:outline-none",
      },
    },
  });

  const handleSend = useCallback(async () => {
    if (!editor) return;
    const htmlContent = editor.getHTML();

    if (!subject.trim()) {
      setStatus("error");
      setStatusMessage("Bitte gib einen Betreff ein.");
      return;
    }
    if (!htmlContent || editor.isEmpty) {
      setStatus("error");
      setStatusMessage("Der Newsletter-Inhalt darf nicht leer sein.");
      return;
    }

    const confirmed = window.confirm(
      "Newsletter wirklich an alle aktiven Abonnenten senden? Diese Aktion kann nicht rückgängig gemacht werden."
    );
    if (!confirmed) return;

    setStatus("sending");
    setStatusMessage("");
    setSendProgress(null);

    try {
      const res = await fetch("/api/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), htmlContent }),
      });

      const data = (await res.json()) as { message?: string; queued?: number; batchId?: string };

      if (res.ok) {
        const total = data.queued ?? 0;
        setSendProgress({ sent: 0, failed: 0, total });

        // Progress pollen bis alles versendet
        if (data.batchId && total > 0) {
          const batchId = data.batchId;
          const poll = setInterval(async () => {
            try {
              const pr = await fetch(`/api/newsletter/progress?batchId=${encodeURIComponent(batchId)}`);
              if (!pr.ok) return;
              const pd = (await pr.json()) as { sent: number; failed: number; pending: number; total: number };
              setSendProgress({ sent: pd.sent, failed: pd.failed, total: pd.total });
              if (pd.pending === 0) {
                clearInterval(poll);
                setStatus("success");
                setStatusMessage(`Versand abgeschlossen: ${pd.sent} gesendet, ${pd.failed} fehlgeschlagen.`);
                setSubject("");
                editor.commands.clearContent();
              }
            } catch { /* ignore polling error */ }
          }, 5000);
        } else {
          setStatus("success");
          setStatusMessage(data.message ?? `${total} Einträge in der Warteschlange.`);
          setSubject("");
          editor.commands.clearContent();
        }
      } else {
        setStatus("error");
        setStatusMessage(data.message ?? "Unbekannter Fehler.");
      }
    } catch {
      setStatus("error");
      setStatusMessage("Netzwerkfehler – bitte versuche es erneut.");
    }
  }, [editor, subject]);

  const handleTestSend = useCallback(async () => {
    if (!editor) return;
    const htmlContent = editor.getHTML();

    if (!subject.trim()) {
      setTestStatus("error");
      setTestMessage("Bitte zuerst einen Betreff eingeben.");
      return;
    }
    if (!htmlContent || editor.isEmpty) {
      setTestStatus("error");
      setTestMessage("Der Newsletter-Inhalt darf nicht leer sein.");
      return;
    }
    if (!testEmail.trim()) {
      setTestStatus("error");
      setTestMessage("Bitte eine Test-E-Mail-Adresse eingeben.");
      return;
    }

    setTestStatus("sending");
    setTestMessage("");

    try {
      const res = await fetch("/api/newsletter/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testEmail: testEmail.trim(), subject: subject.trim(), htmlContent }),
      });
      const data = (await res.json()) as { message?: string };
      if (res.ok) {
        setTestStatus("success");
        setTestMessage(data.message ?? "Testzusendung gesendet.");
      } else {
        setTestStatus("error");
        setTestMessage(data.message ?? "Unbekannter Fehler.");
      }
    } catch {
      setTestStatus("error");
      setTestMessage("Netzwerkfehler – bitte versuche es erneut.");
    }
  }, [editor, subject, testEmail]);

  if (isAdmin === null) {
    return <div className="p-8 text-gray-500">Lade…</div>;
  }
  if (!isAdmin) {
    return (
      <div className="p-8 text-red-600 font-semibold">
        Kein Zugriff. Diese Seite ist nur für Admins.
      </div>
    );
  }

  return (
    <main className="w-full px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Newsletter verfassen</h1>

      {/* Betreff */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="nl-subject">
          Betreff
        </label>
        <input
          id="nl-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Betreff des Newsletters…"
          maxLength={300}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Editor */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Inhalt</label>
        <div className="border border-gray-300 rounded-lg overflow-hidden shadow-sm">
          <EditorToolbar editor={editor} />
          <EditorContent editor={editor} className="bg-white" />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Ein Abmelde-Link wird automatisch an das Ende jeder E-Mail angehängt.
        </p>
      </div>

      {/* Testzusendung */}
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h2 className="text-sm font-semibold text-yellow-800 mb-2">🧪 Testzusendung</h2>
        <p className="text-xs text-yellow-700 mb-3">
          Sendet den aktuellen Entwurf direkt (ohne Queue) an eine einzelne Adresse zur Vorschau.
          Die E-Mail enthält einen gelben Testhinweis-Banner.
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="test@beispiel.de"
            className="flex-1 border border-yellow-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            onKeyDown={(e) => { if (e.key === "Enter") void handleTestSend(); }}
          />
          <button
            type="button"
            onClick={handleTestSend}
            disabled={testStatus === "sending"}
            className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {testStatus === "sending" ? "Wird gesendet…" : "Test senden"}
          </button>
        </div>
        {testStatus === "success" && (
          <p className="mt-2 text-sm text-green-700">✓ {testMessage}</p>
        )}
        {testStatus === "error" && (
          <p className="mt-2 text-sm text-red-600">✗ {testMessage}</p>
        )}
      </div>

      {/* Status / Fortschritt */}
      {status === "sending" && sendProgress && sendProgress.total > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-sm">
          <div className="flex justify-between mb-1">
            <span>Wird versendet…</span>
            <span className="font-semibold">{sendProgress.sent + sendProgress.failed} / {sendProgress.total}</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.round(((sendProgress.sent + sendProgress.failed) / sendProgress.total) * 100)}%` }}
            />
          </div>
          {sendProgress.failed > 0 && (
            <p className="mt-1 text-xs text-red-600">{sendProgress.failed} fehlgeschlagen</p>
          )}
        </div>
      )}
      {status === "success" && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
          ✓ {statusMessage}
        </div>
      )}
      {status === "error" && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
          ✗ {statusMessage}
        </div>
      )}

      {/* Senden-Button */}
      <button
        type="button"
        onClick={handleSend}
        disabled={status === "sending"}
        className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {status === "sending" ? "Wird in Warteschlange aufgenommen…" : "Newsletter senden"}
      </button>

      {/* Abonnenten-Verwaltung */}
      <section className="mt-12">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Abonnenten verwalten</h2>
        <SubscriberManager />
      </section>
    </main>
  );
}

/* ── Abonnenten-Verwaltung ── */

type Subscriber = {
  _id: string;
  email: string;
  status: "active" | "unsubscribed";
  createdAt: string;
};

function SubscriberManager() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [addStatus, setAddStatus] = useState("");

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter/subscribers");
      const data = (await res.json()) as { subscribers?: Subscriber[] };
      setSubscribers(data.subscribers ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSubscribers();
  }, [fetchSubscribers]);

  const handleAdd = async () => {
    if (!newEmail.trim()) return;
    const res = await fetch("/api/newsletter/subscribers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail.trim() }),
    });
    const data = (await res.json()) as { message?: string };
    setAddStatus(data.message ?? "");
    if (res.ok || res.status === 201) {
      setNewEmail("");
      void fetchSubscribers();
    }
  };

  const activeCount = subscribers.filter((s) => s.status === "active").length;
  const totalCount = subscribers.length;

  return (
    <div>
      {/* E-Mail hinzufügen */}
      <div className="flex gap-2 mb-4">
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="neue@email.de"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => { if (e.key === "Enter") void handleAdd(); }}
        />
        <button
          type="button"
          onClick={handleAdd}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          Hinzufügen
        </button>
      </div>
      {addStatus && <p className="text-sm text-gray-600 mb-3">{addStatus}</p>}

      {/* Statistik */}
      <p className="text-sm text-gray-500 mb-3">
        <strong>{activeCount}</strong> aktive · <strong>{totalCount - activeCount}</strong> abgemeldet · <strong>{totalCount}</strong> gesamt
      </p>

      {/* Liste */}
      {loading ? (
        <p className="text-gray-400 text-sm">Lade Abonnenten…</p>
      ) : subscribers.length === 0 ? (
        <p className="text-gray-400 text-sm">Noch keine Abonnenten vorhanden.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 font-medium">
              <tr>
                <th className="px-4 py-2 text-left">E-Mail</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Registriert</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subscribers.map((sub) => (
                <tr key={sub._id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-800">{sub.email}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        sub.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {sub.status === "active" ? "Aktiv" : "Abgemeldet"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {new Date(sub.createdAt).toLocaleDateString("de-DE")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
