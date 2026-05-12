"use client";

import { useRef, useState } from "react";

export function CommentToolbar({
  textareaRef,
  value,
  onChange,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState<null | "link" | "youtube" | "emoji">(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [ytUrl, setYtUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  // Cursorposition in der Textarea beim Öffnen des Popovers speichern
  const savedSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const TOOLBAR_EMOJIS = [
    "😊","😂","😍","🥰","😎","😢","😡","🤔",
    "👍","👎","❤️","💙","🎉","🔥","✨","🙏",
    "📚","✍️","💡","🌟","😅","🤣","😮","👋",
    "🤩","😴","🤦","🙈","💪","🎊","🥳","💯",
  ];

  function openPopover(type: "link" | "youtube" | "emoji") {
    // Cursorposition speichern bevor Textarea den Fokus verliert
    const ta = textareaRef.current;
    if (ta) {
      savedSelectionRef.current = { start: ta.selectionStart, end: ta.selectionEnd };
    }
    setOpen(open === type ? null : type);
  }

  function insert(text: string) {
    const ta = textareaRef.current;
    const { start, end } = savedSelectionRef.current;
    const next = value.substring(0, start) + text + value.substring(end);
    savedSelectionRef.current = { start: start + text.length, end: start + text.length };
    onChange(next);
    setTimeout(() => {
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  }

  function handleInsertLink() {
    const raw = linkUrl.trim();
    if (!raw) return;
    // https:// automatisch ergänzen wenn kein Protokoll angegeben
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    insert(url);
    setLinkUrl("");
    setOpen(null);
  }

  function handleInsertYoutube() {
    const url = ytUrl.trim();
    if (!url) return;
    insert(url);
    setYtUrl("");
    setOpen(null);
  }

  async function handleImageFile(file: File) {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/editor/upload-image", { method: "POST", body: formData });
      const data = await res.json() as { imageUrl?: string; message?: string };
      if (!res.ok || !data.imageUrl) throw new Error(data.message ?? "Upload fehlgeschlagen.");
      insert(`![](${data.imageUrl})`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Fehler beim Bild-Upload.");
    } finally {
      setIsUploading(false);
    }
  }

  const btnCls =
    "inline-flex items-center justify-center w-7 h-7 rounded text-arena-muted hover:text-arena-text hover:bg-gray-100 transition-colors text-base cursor-pointer border-none bg-transparent disabled:opacity-40";

  return (
    <div className="relative">
      <div className="flex items-center gap-0.5 mt-1">
        <button type="button" title="Link einfügen" className={btnCls}
          onClick={() => openPopover("link")}>
          🔗
        </button>
        <button type="button" title="Bild hochladen" className={btnCls}
          disabled={isUploading} onClick={() => fileInputRef.current?.click()}>
          {isUploading ? "⏳" : "🖼"}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleImageFile(f); e.target.value = ""; }} />
        <button type="button" title="YouTube-Video einbetten" className={btnCls}
          onClick={() => openPopover("youtube")}>
          ▶
        </button>
        <button type="button" title="Emoji einfügen" className={btnCls}
          onClick={() => openPopover("emoji")}>
          😊
        </button>
      </div>

      {/* Link-Formular */}
      {open === "link" && (
        <div className="absolute top-full mt-1 left-0 bg-white border border-arena-border-light rounded-lg p-2 shadow-lg z-50 grid gap-1.5 w-72">
          <input className="input-base text-sm py-1" placeholder="URL (https://...)"
            value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleInsertLink(); } }}
            autoFocus />
          <div className="flex gap-1.5">
            <button type="button" className="btn btn-sm text-xs flex-1"
              onClick={handleInsertLink} disabled={!linkUrl.trim()}>
              Einfügen
            </button>
            <button type="button" className="btn btn-sm text-xs"
              onClick={() => { setLinkUrl(""); setOpen(null); }}>✕</button>
          </div>
        </div>
      )}

      {/* YouTube-Formular */}
      {open === "youtube" && (
        <div className="absolute top-full mt-1 left-0 bg-white border border-arena-border-light rounded-lg p-2 shadow-lg z-50 grid gap-1.5 w-72">
          <input className="input-base text-sm py-1"
            placeholder="https://www.youtube.com/watch?v=..."
            value={ytUrl} onChange={(e) => setYtUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleInsertYoutube(); } }}
            autoFocus />
          <div className="flex gap-1.5">
            <button type="button" className="btn btn-sm text-xs flex-1"
              onClick={handleInsertYoutube} disabled={!ytUrl.trim()}>
              Einbetten
            </button>
            <button type="button" className="btn btn-sm text-xs"
              onClick={() => setOpen(null)}>✕</button>
          </div>
        </div>
      )}

      {/* Emoji-Picker */}
      {open === "emoji" && (
        <div className="absolute top-full mt-1 left-0 bg-white border border-arena-border-light rounded-lg p-2 shadow-lg z-50 flex flex-wrap gap-0.5 w-64">
          {TOOLBAR_EMOJIS.map((emoji) => (
            <button key={emoji} type="button"
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-lg cursor-pointer border-none bg-transparent"
              onClick={() => { insert(emoji); setOpen(null); }}>
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
