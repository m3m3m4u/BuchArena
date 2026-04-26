"use client";

import { useEditor, EditorContent, useEditorState, type Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import { useEffect, useState, useCallback, useRef } from "react";
import { getStoredAccount } from "@/lib/client-account";

/* ══════════════════════════════════════════════════════════════
   Erweitertes Image-Node mit width-Attribut
══════════════════════════════════════════════════════════════ */

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const sw = element.style.width;
          if (sw.endsWith("%")) return sw;
          if (sw.endsWith("px")) return sw.slice(0, -2);
          return element.getAttribute("width") ?? null;
        },
        renderHTML: () => ({}),
      },
      align: {
        default: null,
        parseHTML: (el: HTMLElement) => {
          const s = el.style;
          if (s.marginLeft === "auto" && s.marginRight === "auto") return "center";
          if (s.float === "left") return "left";
          if (s.float === "right") return "right";
          return (el.getAttribute("data-align") as string | null) ?? null;
        },
        renderHTML: () => ({}),
      },
    };
  },
  renderHTML({ node, HTMLAttributes }: { node: { attrs: Record<string, unknown> }; HTMLAttributes: Record<string, unknown> }) {
    const width = node.attrs.width as string | null;
    const align = node.attrs.align as string | null;

    const attrs: Record<string, unknown> = { ...HTMLAttributes };
    if (align) attrs["data-align"] = align;
    // E-Mail-kompatible Attribute direkt ausgeben (kein CSS float/margin)
    attrs.style = "display:block;max-width:100%;height:auto;";
    if (width) {
      const w = String(width);
      attrs.width = w.endsWith("%") ? w : w.replace("px", "");
    }
    if (align === "left") {
      attrs.align = "left";
      attrs.style = "display:block;max-width:100%;height:auto;margin-right:16px;margin-bottom:8px;";
    } else if (align === "right") {
      attrs.align = "right";
      attrs.style = "display:block;max-width:100%;height:auto;margin-left:16px;margin-bottom:8px;";
    } else {
      attrs.style = "display:block;max-width:100%;height:auto;margin-bottom:12px;";
    }

    // Zentriert: in <div> einwickeln
    if (align === "center") {
      return ["div", { style: "text-align:center;margin:0 auto;" }, ["img", attrs]];
    }
    return ["img", attrs];
  },
});

/* ══════════════════════════════════════════════════════════════
   E-Mail-Vorschau (600px-Container wie echter E-Mail-Client)
══════════════════════════════════════════════════════════════ */

function EmailPreview({ html }: { html: string }) {
  const doc = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box;}
body{margin:0;padding:16px;background:#f3f4f6;font-family:system-ui,-apple-system,Arial,sans-serif;font-size:15px;color:#1f2937;line-height:1.6;}
.wrap{max-width:600px;margin:0 auto;background:#fff;padding:28px 32px;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.08);}
img{max-width:100%;height:auto;}
h1{font-size:1.6em;margin:.2em 0 .5em;}
h2{font-size:1.3em;margin:.2em 0 .5em;}
h3{font-size:1.1em;margin:.2em 0 .5em;}
p{margin:0 0 .9em;}
a{color:#2563eb;}
blockquote{border-left:3px solid #e5e7eb;margin:0 0 1em;padding-left:1em;color:#6b7280;}
ul,ol{margin:0 0 1em;padding-left:1.5em;}
hr{border:none;border-top:1px solid #e5e7eb;margin:1.5em 0;}
</style></head>
<body><div class="wrap">${html}</div></body></html>`;

  return (
    <iframe
      srcDoc={doc}
      title="E-Mail-Vorschau"
      className="w-full bg-white border-x border-b border-gray-300 rounded-b-lg"
      style={{ minHeight: "500px" }}
      sandbox="allow-same-origin"
    />
  );
}

/* ══════════════════════════════════════════════════════════════
   Toolbar
══════════════════════════════════════════════════════════════ */

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

/* ── URL-Input-Overlay ── */
type UrlModalConfig = {
  title: string;
  placeholder: string;
  initial: string;
  onConfirm: (url: string) => void;
};

function UrlInputModal({ config, onClose }: { config: UrlModalConfig; onClose: () => void }) {
  const [value, setValue] = useState(config.initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const confirm = () => {
    if (value.trim()) config.onConfirm(value.trim());
    onClose();
  };

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
          onKeyDown={(e) => {
            if (e.key === "Enter") confirm();
            if (e.key === "Escape") onClose();
          }}
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

function EditorToolbar({ editor, htmlMode, onToggleHtml, showPreview, onTogglePreview }: { editor: Editor | null; htmlMode: boolean; onToggleHtml: () => void; showPreview: boolean; onTogglePreview: () => void }) {
  const imgInputRef = useRef<HTMLInputElement>(null);
  const [urlModal, setUrlModal] = useState<UrlModalConfig | null>(null);

  const [imgWidthInput, setImgWidthInput] = useState("");
  const [imgAlignActive, setImgAlignActive] = useState<string | null>(null);
  const [ytWidthInput, setYtWidthInput] = useState("640");
  const [ytHeightInput, setYtHeightInput] = useState("360");

  const imgNodePosRef = useRef(-1);

  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      const sel = ctx.editor?.state.selection;
      const isImage = sel instanceof NodeSelection && sel.node.type.name === "image";
      const imgAttrs = isImage ? (sel as NodeSelection).node.attrs : {};
      const isYoutube = ctx.editor?.isActive("youtube") ?? false;
      return {
        isImage,
        imgNodePos: isImage ? sel!.from : -1,
        isYoutube,
        imgWidth: (imgAttrs.width as string | null) ?? "",
        imgAlign: (imgAttrs.align as string | null) ?? null,
        ytWidth: String((ctx.editor?.getAttributes("youtube").width as number | null) ?? 640),
        ytHeight: String((ctx.editor?.getAttributes("youtube").height as number | null) ?? 360),
      };
    },
  });

  useEffect(() => {
    if (editorState?.isImage) {
      imgNodePosRef.current = editorState.imgNodePos;
      setImgWidthInput(editorState.imgWidth);
      setImgAlignActive(editorState.imgAlign);
    }
  }, [editorState?.isImage, editorState?.imgNodePos, editorState?.imgWidth, editorState?.imgAlign]);

  useEffect(() => {
    if (editorState?.isYoutube) {
      setYtWidthInput(editorState.ytWidth);
      setYtHeightInput(editorState.ytHeight);
    }
  }, [editorState?.isYoutube, editorState?.ytWidth, editorState?.ytHeight]);

  function applyImageAttrs(patch: Record<string, unknown>) {
    if (!editor || imgNodePosRef.current < 0) return;
    const pos = imgNodePosRef.current;
    const node = editor.state.doc.nodeAt(pos);
    if (!node) return;
    editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, null, { ...node.attrs, ...patch }));
  }

  function applyImageWidth(w: string) { applyImageAttrs({ width: w || null }); }

  function applyImageAlign(a: string | null) {
    setImgAlignActive(a);
    applyImageAttrs({ align: a });
  }

  function applyYtSize(w: number, h: number) {
    if (!editor) return;
    editor.chain().focus().updateAttributes("youtube", { width: w, height: h }).run();
  }

  const openLinkModal = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    setUrlModal({
      title: "Link einfügen",
      placeholder: "https://",
      initial: prev ?? "https://",
      onConfirm: (url) => {
        if (url === "") {
          editor.chain().focus().extendMarkRange("link").unsetLink().run();
        } else {
          editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        }
      },
    });
  }, [editor]);

  const openYoutubeModal = useCallback(() => {
    if (!editor) return;
    setUrlModal({
      title: "YouTube-Video einbetten",
      placeholder: "https://www.youtube.com/watch?v=...",
      initial: "https://www.youtube.com/watch?v=",
      onConfirm: (url) => {
        editor.chain().focus().setYoutubeVideo({ src: url, width: 640, height: 360 }).run();
      },
    });
  }, [editor]);

  const openImageUrlModal = useCallback(() => {
    if (!editor) return;
    setUrlModal({
      title: "Bild-URL einfügen",
      placeholder: "https://beispiel.de/bild.jpg",
      initial: "https://",
      onConfirm: (url) => {
        editor.chain().focus().setImage({ src: url }).run();
      },
    });
  }, [editor]);

  const handleImageFile = useCallback(async (file: File) => {
    if (!editor) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/editor/upload-image", { method: "POST", body: formData });
      const data = (await res.json()) as { imageUrl?: string; message?: string };
      if (!res.ok || !data.imageUrl) throw new Error(data.message ?? "Upload fehlgeschlagen.");
      editor.chain().focus().setImage({ src: data.imageUrl }).run();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Bild-Upload fehlgeschlagen.");
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <>
      {urlModal && <UrlInputModal config={urlModal} onClose={() => setUrlModal(null)} />}
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
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Linksbündig">Links</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Zentriert">Mitte</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Rechtsbündig">Rechts</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} title="Blocksatz">Block</ToolbarButton>
        <span className="border-l border-gray-300 mx-1" />
        <ToolbarButton onClick={openLinkModal} active={editor.isActive("link")} title="Link einfügen">🔗 Link</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Zitat">❝</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Trennlinie">—</ToolbarButton>
        <span className="border-l border-gray-300 mx-1" />
        <ToolbarButton onClick={() => imgInputRef.current?.click()} active={false} title="Bild hochladen">🖼 Bild</ToolbarButton>
        <ToolbarButton onClick={openImageUrlModal} active={false} title="Bild per URL">🔗 Bild-URL</ToolbarButton>
        <ToolbarButton onClick={openYoutubeModal} active={editor.isActive("youtube")} title="YouTube-Video einbetten">▶ YouTube</ToolbarButton>
        <span className="border-l border-gray-300 mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} active={false} title="Rückgängig">↩</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} active={false} title="Wiederholen">↪</ToolbarButton>
        <span className="border-l border-gray-300 mx-1" />
        <ToolbarButton onClick={onToggleHtml} active={htmlMode} title="HTML-Quelltext bearbeiten">&lt;/&gt; HTML</ToolbarButton>
        <ToolbarButton onClick={onTogglePreview} active={showPreview} title="E-Mail-Vorschau (600px)">👁 Vorschau</ToolbarButton>
        <input
          ref={imgInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImageFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {/* Größensteuerung für Bilder und YouTube */}
      {(editorState?.isImage || editorState?.isYoutube) && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 bg-blue-50 border border-b-0 border-blue-200 text-xs">
          {editorState.isImage && (
            <>
              <span className="text-blue-700 font-medium">🖼️ Bildgröße:</span>
              <input
                type="text"
                value={imgWidthInput}
                onChange={(e) => setImgWidthInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { applyImageWidth(imgWidthInput); } }}
                onBlur={() => applyImageWidth(imgWidthInput)}
                placeholder="400"
                className="w-16 border border-blue-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
              />
              <span className="text-blue-500">px</span>
              <span className="border-l border-blue-200 h-4 mx-0.5" />
              {(["200", "400", "600"] as const).map((val) => (
                <button
                  key={val}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); setImgWidthInput(val); applyImageWidth(val); }}
                  className={`px-2 py-0.5 rounded border text-xs transition-colors ${
                    imgWidthInput === val
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-blue-600 border-blue-300 hover:bg-blue-100"
                  }`}
                >
                  {val}
                </button>
              ))}
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); setImgWidthInput("100%"); applyImageWidth("100%"); }}
                className={`px-2 py-0.5 rounded border text-xs transition-colors ${
                  imgWidthInput === "100%"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-blue-600 border-blue-300 hover:bg-blue-100"
                }`}
              >
                Voll
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); setImgWidthInput(""); applyImageWidth(""); }}
                className="px-2 py-0.5 rounded border text-xs bg-white text-gray-500 border-gray-300 hover:bg-gray-100 transition-colors"
              >
                Original
              </button>
              <span className="border-l border-blue-200 mx-1 self-stretch" />
              <span className="text-blue-700 font-medium">Ausrichtung:</span>
              {(["left", "center", "right", null] as const).map((a) => (
                <button key={String(a)} type="button"
                  onMouseDown={(e) => { e.preventDefault(); applyImageAlign(a); }}
                  className={`px-2 py-0.5 rounded border text-xs transition-colors ${
                    imgAlignActive === a ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-600 border-blue-300 hover:bg-blue-100"
                  }`}>
                  {a === "left" ? "Links" : a === "center" ? "Mitte" : a === "right" ? "Rechts" : "Normal"}
                </button>
              ))}
            </>
          )}
          {editorState.isYoutube && (
            <>
              <span className="text-blue-700 font-medium">▶️ Videogröße:</span>
              <input
                type="number"
                min={100}
                max={1920}
                value={ytWidthInput}
                onChange={(e) => setYtWidthInput(e.target.value)}
                onBlur={() => { if (ytWidthInput && ytHeightInput) applyYtSize(Number(ytWidthInput), Number(ytHeightInput)); }}
                onKeyDown={(e) => { if (e.key === "Enter" && ytWidthInput && ytHeightInput) applyYtSize(Number(ytWidthInput), Number(ytHeightInput)); }}
                className="w-16 border border-blue-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
              />
              <span className="text-blue-500">×</span>
              <input
                type="number"
                min={56}
                max={1080}
                value={ytHeightInput}
                onChange={(e) => setYtHeightInput(e.target.value)}
                onBlur={() => { if (ytWidthInput && ytHeightInput) applyYtSize(Number(ytWidthInput), Number(ytHeightInput)); }}
                onKeyDown={(e) => { if (e.key === "Enter" && ytWidthInput && ytHeightInput) applyYtSize(Number(ytWidthInput), Number(ytHeightInput)); }}
                className="w-16 border border-blue-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
              />
              <span className="text-blue-500">px</span>
              <span className="border-l border-blue-200 h-4 mx-0.5" />
              {([[640, 360], [800, 450], [1024, 576]] as const).map(([w, h]) => (
                <button
                  key={`${w}x${h}`}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); setYtWidthInput(String(w)); setYtHeightInput(String(h)); applyYtSize(w, h); }}
                  className={`px-2 py-0.5 rounded border text-xs transition-colors ${
                    ytWidthInput === String(w) && ytHeightInput === String(h)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-blue-600 border-blue-300 hover:bg-blue-100"
                  }`}
                >
                  {w}×{h}
                </button>
              ))}
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

type ArchiveEntry = {
  _id: string;
  subject: string;
  batchId: string;
  recipientCount: number;
  sentBy: string;
  createdAt: string;
};

type DraftEntry = {
  _id: string;
  subject: string;
  savedBy: string;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export default function NewsletterAdminPage() {
  const [tab, setTab] = useState<"erstellen" | "entwürfe" | "archiv" | "abonnenten">("erstellen");
  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [sendProgress, setSendProgress] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const [htmlMode, setHtmlMode] = useState(false);
  const [htmlSource, setHtmlSource] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const [testEmail, setTestEmail] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  const [archive, setArchive] = useState<ArchiveEntry[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [previewEntry, setPreviewEntry] = useState<{ subject: string; htmlContent: string } | null>(null);

  const [drafts, setDrafts] = useState<DraftEntry[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState("");
  const [draftStatusMsg, setDraftStatusMsg] = useState("");
  const [draftSaving, setDraftSaving] = useState(false);

  useEffect(() => {
    const acc = getStoredAccount();
    setIsAdmin(acc?.role === "ADMIN" || acc?.role === "SUPERADMIN");
  }, []);

  const loadArchive = useCallback(async () => {
    setArchiveLoading(true);
    try {
      const res = await fetch("/api/newsletter/archive");
      const data = (await res.json()) as { archive?: ArchiveEntry[] };
      setArchive(data.archive ?? []);
    } finally {
      setArchiveLoading(false);
    }
  }, []);

  const loadDrafts = useCallback(async () => {
    setDraftsLoading(true);
    try {
      const res = await fetch("/api/newsletter/drafts");
      const data = (await res.json()) as { drafts?: DraftEntry[] };
      setDrafts(data.drafts ?? []);
    } finally {
      setDraftsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "archiv") void loadArchive();
    if (tab === "entwürfe") void loadDrafts();
  }, [tab, loadArchive, loadDrafts]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      ResizableImage.configure({ inline: false, allowBase64: true }),
      Youtube.configure({ controls: true, nocookie: true }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[400px] p-4 focus:outline-none",
      },
      handleClickOn(view, _pos, node, nodePos) {
        if (node.type.name !== "image") return false;
        try {
          view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, nodePos)));
          return true;
        } catch { return false; }
      },
    },
  });

  const toggleHtmlMode = useCallback(() => {
    if (!editor) return;
    if (!htmlMode) {
      setHtmlSource(editor.getHTML());
      setHtmlMode(true);
      setShowPreview(false);
    } else {
      editor.commands.setContent(htmlSource);
      setHtmlMode(false);
    }
  }, [editor, htmlMode, htmlSource]);

  const togglePreviewMode = useCallback(() => {
    if (!editor) return;
    if (!showPreview && htmlMode) {
      // HTML-Modus verlassen wenn Vorschau geöffnet wird
      editor.commands.setContent(htmlSource);
      setHtmlMode(false);
    }
    setShowPreview((v) => !v);
  }, [editor, showPreview, htmlMode, htmlSource]);

  const handleSend = useCallback(async () => {
    if (!editor) return;
    const htmlContent = htmlMode ? htmlSource : editor.getHTML();
    if (!subject.trim()) { setStatus("error"); setStatusMessage("Bitte gib einen Betreff ein."); return; }
    if (!htmlContent || (htmlMode ? !htmlSource.trim() : editor.isEmpty)) { setStatus("error"); setStatusMessage("Der Newsletter-Inhalt darf nicht leer sein."); return; }
    const confirmed = window.confirm("Newsletter wirklich an alle aktiven Abonnenten senden? Diese Aktion kann nicht rückgängig gemacht werden.");
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
                setCurrentDraftId(null);
                setDraftNote("");
              }
            } catch { /* ignore */ }
          }, 5000);
        } else {
          setStatus("success");
          setStatusMessage(data.message ?? `${total} Einträge in der Warteschlange.`);
          setSubject("");
          editor.commands.clearContent();
          setCurrentDraftId(null);
          setDraftNote("");
        }
      } else {
        setStatus("error");
        setStatusMessage(data.message ?? "Unbekannter Fehler.");
      }
    } catch {
      setStatus("error");
      setStatusMessage("Netzwerkfehler – bitte versuche es erneut.");
    }
  }, [editor, subject, htmlMode, htmlSource]);

  const handleTestSend = useCallback(async () => {
    if (!editor) return;
    const htmlContent = htmlMode ? htmlSource : editor.getHTML();
    if (!subject.trim()) { setTestStatus("error"); setTestMessage("Bitte zuerst einen Betreff eingeben."); return; }
    if (!htmlContent || (htmlMode ? !htmlSource.trim() : editor.isEmpty)) { setTestStatus("error"); setTestMessage("Der Newsletter-Inhalt darf nicht leer sein."); return; }
    if (!testEmail.trim()) { setTestStatus("error"); setTestMessage("Bitte eine Test-E-Mail-Adresse eingeben."); return; }
    setTestStatus("sending");
    setTestMessage("");
    try {
      const res = await fetch("/api/newsletter/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testEmail: testEmail.trim(), subject: subject.trim(), htmlContent }),
      });
      const data = (await res.json()) as { message?: string };
      if (res.ok) { setTestStatus("success"); setTestMessage(data.message ?? "Testzusendung gesendet."); }
      else { setTestStatus("error"); setTestMessage(data.message ?? "Unbekannter Fehler."); }
    } catch {
      setTestStatus("error");
      setTestMessage("Netzwerkfehler – bitte versuche es erneut.");
    }
  }, [editor, subject, testEmail, htmlMode, htmlSource]);

  const loadPreview = useCallback(async (id: string) => {
    const res = await fetch(`/api/newsletter/archive/${id}`);
    const data = (await res.json()) as { entry?: { subject: string; htmlContent: string } };
    if (data.entry) setPreviewEntry(data.entry);
  }, []);

  const handleSaveDraft = useCallback(async () => {
    if (!editor) return;
    const htmlContent = htmlMode ? htmlSource : editor.getHTML();
    if (!subject.trim() && (htmlMode ? !htmlSource.trim() : editor.isEmpty)) {
      setDraftStatusMsg("Bitte Betreff oder Inhalt eingeben.");
      return;
    }
    setDraftSaving(true);
    setDraftStatusMsg("");
    try {
      const res = await fetch("/api/newsletter/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentDraftId ?? undefined,
          subject: subject.trim(),
          htmlContent,
          note: draftNote.trim(),
        }),
      });
      const data = (await res.json()) as { message?: string; id?: string };
      if (res.ok) {
        if (!currentDraftId && data.id) setCurrentDraftId(data.id);
        setDraftStatusMsg("✓ Entwurf gespeichert");
        setTimeout(() => setDraftStatusMsg(""), 3000);
      } else {
        setDraftStatusMsg(data.message ?? "Fehler beim Speichern.");
      }
    } catch {
      setDraftStatusMsg("Netzwerkfehler.");
    } finally {
      setDraftSaving(false);
    }
  }, [editor, subject, currentDraftId, draftNote, htmlMode, htmlSource]);

  const loadDraftIntoEditor = useCallback(async (id: string) => {
    const res = await fetch(`/api/newsletter/drafts/${id}`);
    const data = (await res.json()) as { draft?: { subject: string; htmlContent: string; note: string } };
    if (data.draft && editor) {
      setSubject(data.draft.subject);
      editor.commands.setContent(data.draft.htmlContent);
      setDraftNote(data.draft.note);
      setCurrentDraftId(id);
      setHtmlMode(false);
      setTab("erstellen");
    }
  }, [editor]);

  const deleteDraft = useCallback(async (id: string) => {
    if (!window.confirm("Entwurf wirklich löschen?")) return;
    await fetch(`/api/newsletter/drafts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setDrafts((prev) => prev.filter((d) => d._id !== id));
    if (currentDraftId === id) setCurrentDraftId(null);
  }, [currentDraftId]);

  const loadIntoEditor = useCallback(async (id: string) => {
    const res = await fetch(`/api/newsletter/archive/${id}`);
    const data = (await res.json()) as { entry?: { subject: string; htmlContent: string } };
    if (data.entry && editor) {
      setSubject(data.entry.subject);
      editor.commands.setContent(data.entry.htmlContent);
      setHtmlMode(false);
      setTab("erstellen");
    }
  }, [editor]);

  const deleteArchiveEntry = useCallback(async (id: string) => {
    if (!window.confirm("Archiv-Eintrag wirklich löschen?")) return;
    await fetch(`/api/newsletter/archive/${id}`, { method: "DELETE" });
    setArchive((prev) => prev.filter((e) => e._id !== id));
  }, []);

  if (isAdmin === null) return <div className="p-8 text-gray-500">Lade…</div>;
  if (!isAdmin) return <div className="p-8 text-red-600 font-semibold">Kein Zugriff.</div>;

  const tabs: { id: "erstellen" | "entwürfe" | "archiv" | "abonnenten"; label: string }[] = [
    { id: "erstellen", label: "✏️ Erstellen" },
    { id: "entwürfe", label: `📝 Entwürfe${drafts.length > 0 ? ` (${drafts.length})` : ""}` },
    { id: "archiv", label: "📦 Archiv" },
    { id: "abonnenten", label: "👥 Abonnenten" },
  ];

  return (
    <main className="w-[min(1100px,100%)] mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Newsletter</h1>

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? "border-blue-600 text-blue-600 bg-white"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "erstellen" && (
        <div>
          {currentDraftId && (
            <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between text-sm">
              <span className="text-indigo-700">Du bearbeitest einen gespeicherten Entwurf.</span>
              <button
                type="button"
                onClick={() => { setCurrentDraftId(null); setDraftNote(""); }}
                className="text-indigo-500 hover:text-indigo-700 underline text-xs"
              >
                Entwurf trennen
              </button>
            </div>
          )}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="nl-subject">Betreff</label>
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

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Inhalt</label>
            <div className="border border-gray-300 rounded-lg overflow-hidden shadow-sm">
              <EditorToolbar editor={editor} htmlMode={htmlMode} onToggleHtml={toggleHtmlMode} showPreview={showPreview} onTogglePreview={togglePreviewMode} />
              {showPreview ? (
                <EmailPreview html={editor?.getHTML() ?? ""} />
              ) : htmlMode ? (
                <textarea
                  value={htmlSource}
                  onChange={(e) => setHtmlSource(e.target.value)}
                  className="w-full min-h-[400px] p-4 font-mono text-sm bg-white focus:outline-none resize-y"
                  spellCheck={false}
                />
              ) : (
                <EditorContent editor={editor} className="bg-white" />
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Abmelde-Link wird automatisch angehängt. Die Vorschau zeigt das Layout im 600px-E-Mail-Container.
            </p>
          </div>

          {/* Entwurf speichern */}
          <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <h2 className="text-sm font-semibold text-indigo-800 mb-2">&#128452; Entwurf speichern</h2>
            <p className="text-xs text-indigo-700 mb-3">Speichert den aktuellen Stand in der Datenbank, damit andere Admins weiterarbeiten können.</p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
                placeholder="Optionale Notiz für das Team (z. B. „wartet noch auf Grafik“)"
                className="flex-1 border border-indigo-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={draftSaving}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {draftSaving ? "Speichert…" : currentDraftId ? "Entwurf aktualisieren" : "Als Entwurf speichern"}
              </button>
            </div>
            {draftStatusMsg && (
              <p className={`text-sm ${ draftStatusMsg.startsWith("✓") ? "text-green-700" : "text-red-600" }`}>{draftStatusMsg}</p>
            )}
          </div>

          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h2 className="text-sm font-semibold text-yellow-800 mb-2">🧪 Testzusendung</h2>
            <p className="text-xs text-yellow-700 mb-3">Sendet den Entwurf direkt (ohne Queue) an eine Adresse zur Vorschau.</p>
            <div className="flex gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@beispiel.de"
                className="flex-1 border border-yellow-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                onKeyDown={(e) => { if (e.key === "Enter") void handleTestSend(); }}
              />
              <button type="button" onClick={handleTestSend} disabled={testStatus === "sending"}
                className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap">
                {testStatus === "sending" ? "Wird gesendet…" : "Test senden"}
              </button>
            </div>
            {testStatus === "success" && <p className="mt-2 text-sm text-green-700">✓ {testMessage}</p>}
            {testStatus === "error" && <p className="mt-2 text-sm text-red-600">✗ {testMessage}</p>}
          </div>

          {status === "sending" && sendProgress && sendProgress.total > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-sm">
              <div className="flex justify-between mb-1">
                <span>Wird versendet…</span>
                <span className="font-semibold">{sendProgress.sent + sendProgress.failed} / {sendProgress.total}</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.round(((sendProgress.sent + sendProgress.failed) / sendProgress.total) * 100)}%` }} />
              </div>
              {sendProgress.failed > 0 && <p className="mt-1 text-xs text-red-600">{sendProgress.failed} fehlgeschlagen</p>}
            </div>
          )}
          {status === "success" && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">✓ {statusMessage}</div>}
          {status === "error" && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">✗ {statusMessage}</div>}

          <button type="button" onClick={handleSend} disabled={status === "sending"}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {status === "sending" ? "Wird versendet…" : "Newsletter senden"}
          </button>
        </div>
      )}

      {tab === "entwürfe" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Gespeicherte Entwürfe</h2>
            <button type="button" onClick={loadDrafts} className="text-sm text-blue-600 hover:underline">Aktualisieren</button>
          </div>
          {draftsLoading ? (
            <p className="text-gray-400 text-sm">Lade Entwürfe…</p>
          ) : drafts.length === 0 ? (
            <p className="text-gray-400 text-sm">Noch keine Entwürfe gespeichert.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 font-medium">
                  <tr>
                    <th className="px-4 py-2 text-left">Betreff</th>
                    <th className="px-4 py-2 text-left">Notiz</th>
                    <th className="px-4 py-2 text-left">Zuletzt von</th>
                    <th className="px-4 py-2 text-left">Geändert</th>
                    <th className="px-4 py-2 text-left">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {drafts.map((draft) => (
                    <tr key={draft._id} className={`hover:bg-gray-50 ${currentDraftId === draft._id ? "bg-indigo-50" : ""}`}>
                      <td className="px-4 py-2 font-medium text-gray-800 max-w-xs truncate">
                        {draft.subject || <span className="text-gray-400 italic">Kein Betreff</span>}
                        {currentDraftId === draft._id && <span className="ml-2 text-xs text-indigo-600 font-normal">(in Bearbeitung)</span>}
                      </td>
                      <td className="px-4 py-2 text-gray-500 max-w-xs truncate">{draft.note || "—"}</td>
                      <td className="px-4 py-2 text-gray-500">{draft.savedBy}</td>
                      <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                        {new Date(draft.updatedAt).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <button type="button" onClick={() => void loadDraftIntoEditor(draft._id)} className="text-indigo-600 hover:underline text-xs">Bearbeiten</button>
                          <button type="button" onClick={() => void deleteDraft(draft._id)} className="text-red-500 hover:underline text-xs">Löschen</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "archiv" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Gesendete Newsletter</h2>
            <button type="button" onClick={loadArchive} className="text-sm text-blue-600 hover:underline">Aktualisieren</button>
          </div>
          {archiveLoading ? (
            <p className="text-gray-400 text-sm">Lade Archiv…</p>
          ) : archive.length === 0 ? (
            <p className="text-gray-400 text-sm">Noch keine Newsletter verschickt.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 font-medium">
                  <tr>
                    <th className="px-4 py-2 text-left">Betreff</th>
                    <th className="px-4 py-2 text-left">Empfänger</th>
                    <th className="px-4 py-2 text-left">Gesendet von</th>
                    <th className="px-4 py-2 text-left">Datum</th>
                    <th className="px-4 py-2 text-left">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {archive.map((entry) => (
                    <tr key={entry._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-800 max-w-xs truncate">{entry.subject}</td>
                      <td className="px-4 py-2 text-gray-600">{entry.recipientCount}</td>
                      <td className="px-4 py-2 text-gray-500">{entry.sentBy}</td>
                      <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <button type="button" onClick={() => void loadPreview(entry._id)} className="text-blue-600 hover:underline text-xs">Vorschau</button>
                          <button type="button" onClick={() => void loadIntoEditor(entry._id)} className="text-green-600 hover:underline text-xs">Wiederverwenden</button>
                          <button type="button" onClick={() => void deleteArchiveEntry(entry._id)} className="text-red-500 hover:underline text-xs">Löschen</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {previewEntry && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPreviewEntry(null)}>
              <div className="bg-white rounded-xl shadow-2xl w-[min(860px,95vw)] max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-800 truncate">{previewEntry.subject}</h3>
                  <button type="button" onClick={() => setPreviewEntry(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: previewEntry.htmlContent }} />
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "abonnenten" && (
        <div>
          <SubscriberManager />
        </div>
      )}
    </main>
  );
}

/* ══════════════════════════════════════════════════════════════
   Abonnenten-Verwaltung (extern + registrierte Nutzer)
══════════════════════════════════════════════════════════════ */

type Subscriber = {
  _id: string;
  email: string;
  status: "active" | "unsubscribed";
  createdAt: string;
};

type RegisteredOptIn = {
  username: string;
  email: string;
  createdAt?: string | null;
};

function SubscriberManager() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [registeredOptIns, setRegisteredOptIns] = useState<RegisteredOptIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [addStatus, setAddStatus] = useState("");
  const [activeSection, setActiveSection] = useState<"extern" | "registriert">("extern");

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    try {
      const subRes = await fetch("/api/newsletter/subscribers");
      if (subRes.ok) {
        const subData = (await subRes.json()) as { subscribers?: Subscriber[] };
        setSubscribers(subData.subscribers ?? []);
      }
    } catch { /* ignore */ }
    try {
      const userRes = await fetch("/api/admin/users", { method: "POST" });
      if (userRes.ok) {
        const userData = (await userRes.json()) as { users?: (RegisteredOptIn & { newsletterOptIn?: boolean })[] };
        setRegisteredOptIns((userData.users ?? []).filter((u) => u.newsletterOptIn));
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { void fetchSubscribers(); }, [fetchSubscribers]);

  const handleAdd = async () => {
    if (!newEmail.trim()) return;
    const res = await fetch("/api/newsletter/subscribers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail.trim() }),
    });
    const data = (await res.json()) as { message?: string };
    setAddStatus(data.message ?? "");
    if (res.ok || res.status === 201) { setNewEmail(""); void fetchSubscribers(); }
  };

  const activeExt = subscribers.filter((s) => s.status === "active").length;
  const totalAll = activeExt + registeredOptIns.length;

  return (
    <div>
      {/* Zusammenfassung */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-blue-600 text-white rounded-lg p-3 text-center">
          <div className="text-2xl font-bold leading-tight">{totalAll}</div>
          <div className="text-xs opacity-85">Gesamt aktiv</div>
        </div>
        <div className="bg-blue-500 text-white rounded-lg p-3 text-center">
          <div className="text-2xl font-bold leading-tight">{activeExt}</div>
          <div className="text-xs opacity-85">Externe Anmeldungen</div>
        </div>
        <div className="bg-blue-400 text-white rounded-lg p-3 text-center">
          <div className="text-2xl font-bold leading-tight">{registeredOptIns.length}</div>
          <div className="text-xs opacity-85">Registrierte Nutzer</div>
        </div>
      </div>

      {/* Tabs zwischen den zwei Quellen */}
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        <button
          type="button"
          onClick={() => setActiveSection("extern")}
          className={`px-4 py-2 text-sm font-medium rounded-t border-b-2 -mb-px transition-colors ${
            activeSection === "extern" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Externe Anmeldungen ({subscribers.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSection("registriert")}
          className={`px-4 py-2 text-sm font-medium rounded-t border-b-2 -mb-px transition-colors ${
            activeSection === "registriert" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Registrierte Nutzer ({registeredOptIns.length})
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Lade Abonnenten…</p>
      ) : activeSection === "extern" ? (
        <>
          {/* Neue externe E-Mail hinzufügen */}
          <div className="flex gap-2 mb-3">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="neue@email.de"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => { if (e.key === "Enter") void handleAdd(); }}
            />
            <button type="button" onClick={handleAdd}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors whitespace-nowrap">
              Hinzufügen
            </button>
          </div>
          {addStatus && <p className="text-sm text-gray-600 mb-3">{addStatus}</p>}
          {subscribers.length === 0 ? (
            <p className="text-gray-400 text-sm">Noch keine externen Anmeldungen.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 font-medium">
                  <tr>
                    <th className="px-4 py-2 text-left">E-Mail</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Angemeldet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subscribers.map((sub) => (
                    <tr key={sub._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-800">{sub.email}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          sub.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          {sub.status === "active" ? "Aktiv" : "Abgemeldet"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-500">{new Date(sub.createdAt).toLocaleDateString("de-DE")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-3">Registrierte Nutzer, die Newsletter-Benachrichtigungen in ihrem Profil aktiviert haben.</p>
          {registeredOptIns.length === 0 ? (
            <p className="text-gray-400 text-sm">Keine registrierten Nutzer mit Newsletter-Opt-in.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 font-medium">
                  <tr>
                    <th className="px-4 py-2 text-left">Benutzername</th>
                    <th className="px-4 py-2 text-left">E-Mail</th>
                    <th className="px-4 py-2 text-left">Registriert</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {registeredOptIns.map((u) => (
                    <tr key={u.username} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-800">{u.username}</td>
                      <td className="px-4 py-2 text-gray-600 break-all">{u.email}</td>
                      <td className="px-4 py-2 text-gray-500">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString("de-DE") : "–"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
