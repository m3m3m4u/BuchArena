"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  useEditor,
  EditorContent,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapLink from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import { useRouter } from "next/navigation";
import { getStoredAccount } from "@/lib/client-account";

/* ── Resizable Image ── */
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el: HTMLElement) => {
          const sw = el.style.width;
          if (sw.endsWith("%")) return sw;
          if (sw.endsWith("px")) return sw.slice(0, -2);
          return el.getAttribute("width") ?? null;
        },
        renderHTML: (attrs: { width?: string | null }) => {
          if (!attrs.width) return {};
          const w = String(attrs.width);
          if (w.endsWith("%")) return { style: `width: ${w}; max-width: 100%;` };
          return { width: w, style: `width: ${w}px; max-width: 100%;` };
        },
      },
    };
  },
});

/* ── Toolbar-Button ── */
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
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
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

/* ── URL-Modal ── */
type UrlModalConfig = {
  title: string;
  placeholder: string;
  initial: string;
  onConfirm: (url: string) => void;
};

function UrlInputModal({ config, onClose }: { config: UrlModalConfig; onClose: () => void }) {
  const [value, setValue] = useState(config.initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  const confirm = () => { if (value.trim()) config.onConfirm(value.trim()); onClose(); };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-[min(480px,95vw)] p-5">
        <h3 className="text-base font-semibold text-gray-800 mb-3">{config.title}</h3>
        <input
          ref={inputRef}
          type="url"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={config.placeholder}
          onKeyDown={(e) => { if (e.key === "Enter") confirm(); if (e.key === "Escape") onClose(); }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-gray-50">
            Abbrechen
          </button>
          <button type="button" onClick={confirm}
            className="px-4 py-1.5 rounded-lg text-sm bg-blue-600 text-white font-medium hover:bg-blue-700">
            Einfügen
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Toolbar ── */
function EditorToolbar({
  editor,
  htmlMode,
  onToggleHtml,
}: {
  editor: Editor | null;
  htmlMode: boolean;
  onToggleHtml: () => void;
}) {
  const imgInputRef = useRef<HTMLInputElement>(null);
  const [urlModal, setUrlModal] = useState<UrlModalConfig | null>(null);
  const [imgWidthInput, setImgWidthInput] = useState("");
  const [ytWidthInput, setYtWidthInput] = useState("640");
  const [ytHeightInput, setYtHeightInput] = useState("360");

  const editorState = useEditorState({
    editor,
    selector: (ctx) => ({
      isImage: ctx.editor?.isActive("image") ?? false,
      isYoutube: ctx.editor?.isActive("youtube") ?? false,
      imgWidth: (ctx.editor?.getAttributes("image").width as string | null) ?? "",
      ytWidth: String((ctx.editor?.getAttributes("youtube").width as number | null) ?? 640),
      ytHeight: String((ctx.editor?.getAttributes("youtube").height as number | null) ?? 360),
    }),
  });

  useEffect(() => { if (editorState?.isImage) setImgWidthInput(editorState.imgWidth); }, [editorState?.isImage, editorState?.imgWidth]);
  useEffect(() => {
    if (editorState?.isYoutube) { setYtWidthInput(editorState.ytWidth); setYtHeightInput(editorState.ytHeight); }
  }, [editorState?.isYoutube, editorState?.ytWidth, editorState?.ytHeight]);

  const applyImageWidth = (w: string) => { if (!editor) return; editor.chain().focus().updateAttributes("image", { width: w || null }).run(); };
  const applyYtSize = (w: number, h: number) => { if (!editor) return; editor.chain().focus().updateAttributes("youtube", { width: w, height: h }).run(); };

  const openLinkModal = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    setUrlModal({
      title: "Link einfügen", placeholder: "https://", initial: prev ?? "https://",
      onConfirm: (url) => {
        if (url === "") editor.chain().focus().extendMarkRange("link").unsetLink().run();
        else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      },
    });
  }, [editor]);

  const openYoutubeModal = useCallback(() => {
    if (!editor) return;
    setUrlModal({
      title: "YouTube-Video einbetten", placeholder: "https://www.youtube.com/watch?v=...", initial: "https://www.youtube.com/watch?v=",
      onConfirm: (url) => { editor.chain().focus().setYoutubeVideo({ src: url, width: 640, height: 360 }).run(); },
    });
  }, [editor]);

  const openImageUrlModal = useCallback(() => {
    if (!editor) return;
    setUrlModal({
      title: "Bild-URL einfügen", placeholder: "https://beispiel.de/bild.jpg", initial: "https://",
      onConfirm: (url) => { editor.chain().focus().setImage({ src: url }).run(); },
    });
  }, [editor]);

  const handleImageFile = useCallback(async (file: File) => {
    if (!editor) return;
    const reader = new FileReader();
    reader.onload = () => { editor.chain().focus().setImage({ src: reader.result as string }).run(); };
    reader.readAsDataURL(file);
  }, [editor]);

  if (!editor) return null;

  return (
    <>
      {urlModal && <UrlInputModal config={urlModal} onClose={() => setUrlModal(null)} />}
      <div className="flex flex-wrap gap-1 p-2 border border-b-0 border-gray-300 rounded-t-lg bg-gray-50">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Fett"><strong>B</strong></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Kursiv"><em>I</em></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Unterstrichen"><span className="underline">U</span></ToolbarButton>
        <span className="border-l border-gray-300 mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Überschrift 1">H1</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Überschrift 2">H2</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Überschrift 3">H3</ToolbarButton>
        <span className="border-l border-gray-300 mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Aufzählung">• Liste</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Nummerierte Liste">1. Liste</ToolbarButton>
        <span className="border-l border-gray-300 mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Linksbündig">Links</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Zentriert">Mitte</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Rechtsbündig">Rechts</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} title="Blocksatz">Block</ToolbarButton>
        <span className="border-l border-gray-300 mx-1" />
        <ToolbarButton onClick={openLinkModal} active={editor.isActive("link")} title="Link einfügen">Link</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Zitat">❝</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Trennlinie">—</ToolbarButton>
        <span className="border-l border-gray-300 mx-1" />
        <ToolbarButton onClick={() => imgInputRef.current?.click()} active={false} title="Bild hochladen">Bild</ToolbarButton>
        <ToolbarButton onClick={openImageUrlModal} active={false} title="Bild per URL">Bild-URL</ToolbarButton>
        <ToolbarButton onClick={openYoutubeModal} active={editor.isActive("youtube")} title="YouTube einbetten">YouTube</ToolbarButton>
        <span className="border-l border-gray-300 mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} active={false} title="Rückgängig">↩</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} active={false} title="Wiederholen">↪</ToolbarButton>
        <span className="border-l border-gray-300 mx-1" />
        <ToolbarButton onClick={onToggleHtml} active={htmlMode} title="HTML-Quelltext">&lt;/&gt; HTML</ToolbarButton>
        <input ref={imgInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleImageFile(f); e.target.value = ""; }} />
      </div>
      {(editorState?.isImage || editorState?.isYoutube) && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 bg-blue-50 border border-b-0 border-blue-200 text-xs">
          {editorState.isImage && (
            <>
              <span className="text-blue-700 font-medium">Bildgröße:</span>
              <input type="text" value={imgWidthInput}
                onChange={(e) => setImgWidthInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") applyImageWidth(imgWidthInput); }}
                onBlur={() => applyImageWidth(imgWidthInput)}
                placeholder="400"
                className="w-16 border border-blue-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
              <span className="text-blue-500">px</span>
              {(["200", "400", "600"] as const).map((val) => (
                <button key={val} type="button" onMouseDown={(e) => { e.preventDefault(); setImgWidthInput(val); applyImageWidth(val); }}
                  className={`px-2 py-0.5 rounded border text-xs transition-colors ${imgWidthInput === val ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-600 border-blue-300 hover:bg-blue-100"}`}>{val}</button>
              ))}
              <button type="button" onMouseDown={(e) => { e.preventDefault(); setImgWidthInput("100%"); applyImageWidth("100%"); }}
                className={`px-2 py-0.5 rounded border text-xs transition-colors ${imgWidthInput === "100%" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-600 border-blue-300 hover:bg-blue-100"}`}>Voll</button>
            </>
          )}
          {editorState.isYoutube && (
            <>
              <span className="text-blue-700 font-medium">Videogröße:</span>
              <input type="number" min={100} max={1920} value={ytWidthInput} onChange={(e) => setYtWidthInput(e.target.value)}
                onBlur={() => { if (ytWidthInput && ytHeightInput) applyYtSize(Number(ytWidthInput), Number(ytHeightInput)); }}
                className="w-16 border border-blue-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
              <span className="text-blue-500">×</span>
              <input type="number" min={56} max={1080} value={ytHeightInput} onChange={(e) => setYtHeightInput(e.target.value)}
                onBlur={() => { if (ytWidthInput && ytHeightInput) applyYtSize(Number(ytWidthInput), Number(ytHeightInput)); }}
                className="w-16 border border-blue-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
              <span className="text-blue-500">px</span>
            </>
          )}
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   Haupt-Komponente
══════════════════════════════════════════════════════════════ */
export default function BlogEinreichenPage() {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [htmlMode, setHtmlMode] = useState(false);
  const [htmlSource, setHtmlSource] = useState("");
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    setLoggedIn(!!getStoredAccount());
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      TiptapLink.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      ResizableImage.configure({ inline: false, allowBase64: true }),
      Youtube.configure({ controls: true, nocookie: true }),
    ],
    content: "",
    editorProps: {
      attributes: { class: "prose prose-sm max-w-none min-h-[400px] p-4 focus:outline-none" },
    },
  });

  const toggleHtmlMode = useCallback(() => {
    if (!editor) return;
    if (!htmlMode) { setHtmlSource(editor.getHTML()); setHtmlMode(true); }
    else { editor.commands.setContent(htmlSource); setHtmlMode(false); }
  }, [editor, htmlMode, htmlSource]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setStatus("error"); setStatusMessage("Bitte gib einen Titel ein."); return; }
    const htmlContent = htmlMode ? htmlSource : editor?.getHTML() ?? "";
    if (!htmlContent || (htmlMode ? !htmlSource.trim() : editor?.isEmpty)) {
      setStatus("error"); setStatusMessage("Der Blog-Inhalt darf nicht leer sein."); return;
    }
    setStatus("sending");
    setStatusMessage("");
    try {
      const res = await fetch("/api/blog/einreichen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), htmlContent }),
      });
      const data = (await res.json()) as { message?: string };
      if (res.ok) {
        setStatus("success");
        setStatusMessage("Dein Blog wurde eingereicht und wartet auf Freigabe durch die Redaktion. Danke!");
        setTitle("");
        editor?.commands.clearContent();
        setTimeout(() => router.push("/blog"), 2000);
      } else {
        setStatus("error");
        setStatusMessage(data.message ?? "Fehler beim Einreichen.");
      }
    } catch {
      setStatus("error");
      setStatusMessage("Verbindungsfehler. Bitte versuche es erneut.");
    }
  }, [title, htmlMode, htmlSource, editor, router]);

  if (loggedIn === false) {
    return (
      <main className="top-centered-main">
        <section className="card gap-4">
          <h1>Blog einreichen</h1>
          <p className="text-arena-muted">Du musst angemeldet sein, um einen Blogbeitrag einzureichen.</p>
          <a href="/auth" className="btn btn-primary btn-sm w-fit">Jetzt anmelden</a>
        </section>
      </main>
    );
  }

  return (
    <main className="top-centered-main">
      <section className="card gap-5">
        <h1>Blog einreichen</h1>
        <p className="text-sm text-arena-muted">
          Schreibe deinen Beitrag und reiche ihn ein. Nach Prüfung durch die Redaktion wird er veröffentlicht.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block mb-1 font-medium text-sm">Titel</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Dein Blog-Titel …"
              className="input w-full"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium text-sm">Inhalt</label>
            <EditorToolbar editor={editor} htmlMode={htmlMode} onToggleHtml={toggleHtmlMode} />
            {htmlMode ? (
              <textarea
                value={htmlSource}
                onChange={(e) => setHtmlSource(e.target.value)}
                className="w-full min-h-[400px] p-4 border border-gray-300 rounded-b-lg font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y"
              />
            ) : (
              <div className="border border-gray-300 rounded-b-lg bg-white">
                <EditorContent editor={editor} />
              </div>
            )}
          </div>

          {status === "success" && (
            <div className="rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm p-3">
              {statusMessage}
            </div>
          )}
          {status === "error" && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
              {statusMessage}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={status === "sending" || status === "success"}
            >
              {status === "sending" ? "Wird eingereicht …" : "Einreichen"}
            </button>
            <button type="button" className="btn" onClick={() => router.push("/blog")}>
              Abbrechen
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
