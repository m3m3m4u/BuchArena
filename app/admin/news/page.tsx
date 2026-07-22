"use client";

import { useEditor, EditorContent, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { ProgressiveImg } from "@/app/components/progressive-image";
import { getStoredAccount } from "@/lib/client-account";

type NewsLayout = "text-only" | "image-left" | "image-right";

const LAYOUT_OPTIONS: { key: NewsLayout; label: string; description: string; preview: React.ReactNode }[] = [
  {
    key: "text-only",
    label: "Nur Text",
    description: "Klassischer Blog-Stil ohne Titelbild im Teaser.",
    preview: (
      <div className="border border-arena-border rounded p-2 flex flex-col gap-1 w-full bg-white text-[8px] leading-tight select-none">
        <div className="font-bold text-[9px] text-arena-blue">Titel des Beitrags</div>
        <div className="text-arena-muted">Dies ist ein reiner Text-Layout Teaser. Der Text erstreckt sich über die gesamte Breite des Beitrags...</div>
      </div>
    ),
  },
  {
    key: "image-left",
    label: "Bild links",
    description: "Teaser zeigt das Titelbild links neben dem Text.",
    preview: (
      <div className="border border-arena-border rounded p-2 grid grid-cols-[30px_1fr] gap-2 w-full bg-white text-[8px] leading-tight select-none">
        <div className="h-10 bg-arena-border rounded flex items-center justify-center text-[10px]">🖼️</div>
        <div className="flex flex-col gap-1">
          <div className="font-bold text-[9px] text-arena-blue">Titel des Beitrags</div>
          <div className="text-arena-muted">Das Bild befindet sich links...</div>
        </div>
      </div>
    ),
  },
  {
    key: "image-right",
    label: "Bild rechts",
    description: "Teaser zeigt das Titelbild rechts neben dem Text.",
    preview: (
      <div className="border border-arena-border rounded p-2 grid grid-cols-[1fr_30px] gap-2 w-full bg-white text-[8px] leading-tight select-none">
        <div className="flex flex-col gap-1">
          <div className="font-bold text-[9px] text-arena-blue">Titel des Beitrags</div>
          <div className="text-arena-muted">Das Bild befindet sich rechts...</div>
        </div>
        <div className="h-10 bg-arena-border rounded flex items-center justify-center text-[10px]">🖼️</div>
      </div>
    ),
  },
];

/* ── Resizable Image ── */
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
        parseHTML: (element: HTMLElement) => {
          const s = element.style;
          if (s.marginLeft === "auto" && s.marginRight === "auto") return "center";
          if (s.float === "left") return "left";
          if (s.float === "right") return "right";
          return (element.getAttribute("data-align") as string | null) ?? null;
        },
        renderHTML: () => ({}),
      },
    };
  },
  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    const { width, align, ...rest } = HTMLAttributes as {
      width?: string | null;
      align?: string | null;
      [key: string]: unknown;
    };
    const styles: string[] = [];
    if (width) {
      const w = String(width);
      styles.push(w.endsWith("%") ? `width: ${w}; max-width: 100%` : `width: ${w}px; max-width: 100%`);
    }
    if (align === "center") styles.push("display: block; margin-left: auto; margin-right: auto");
    else if (align === "left") styles.push("float: left; margin-right: 1rem; margin-bottom: 0.5rem");
    else if (align === "right") styles.push("float: right; margin-left: 1rem; margin-bottom: 0.5rem");
    const attrs: Record<string, unknown> = { ...rest };
    if (align) attrs["data-align"] = align;
    if (styles.length) attrs.style = styles.join("; ");
    return ["img", attrs];
  },
});

/* ── Toolbar-Button ── */
function ToolbarButton({
  onClick, active, title, children,
}: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`px-2 py-1 rounded text-sm font-bold border font-sans transition-colors min-h-[2rem] flex items-center justify-center cursor-pointer ${
        active
          ? "bg-arena-blue text-white border-arena-blue"
          : "bg-white text-arena-text border-arena-border hover:bg-arena-bg hover:text-arena-blue"
      }`}
    >
      {children}
    </button>
  );
}

/* ── URL-Modal ── */
type UrlModalConfig = { title: string; placeholder: string; initial: string; onConfirm: (url: string) => void };

function UrlInputModal({ config, onClose }: { config: UrlModalConfig; onClose: () => void }) {
  const [value, setValue] = useState(config.initial);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);
  const confirm = () => { if (value.trim()) config.onConfirm(value.trim()); onClose(); };
  return (
    <div className="overlay-backdrop font-sans"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card font-sans max-w-md w-full p-6 bg-white" onMouseDown={(e) => e.stopPropagation()}>
        <h3 className="font-sans text-base font-bold text-arena-blue tracking-tight m-0 mb-3">{config.title}</h3>
        <input
          ref={inputRef}
          type="url"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={config.placeholder}
          onKeyDown={(e) => { if (e.key === "Enter") confirm(); if (e.key === "Escape") onClose(); }}
          className="input-base w-full mb-4 font-sans"
        />
        <div className="flex justify-end gap-2 font-sans">
          <button type="button" onClick={onClose} className="btn font-sans">Abbrechen</button>
          <button type="button" onClick={confirm} className="btn btn-primary font-sans">Einfügen</button>
        </div>
      </div>
    </div>
  );
}

function EditorToolbar({ editor, htmlMode, onToggleHtml }: { editor: Editor | null; htmlMode: boolean; onToggleHtml: () => void }) {
  const imgInputRef = useRef<HTMLInputElement>(null);
  const [urlModal, setUrlModal] = useState<UrlModalConfig | null>(null);
  const [imgWidthInput, setImgWidthInput] = useState("");
  const [imgAlignActive, setImgAlignActive] = useState<string | null>(null);

  const editorState = useEditorState({
    editor,
    selector: (ctx) => ({
      isImage: ctx.editor?.isActive("image") ?? false,
      imgWidth: (ctx.editor?.getAttributes("image").width as string | null) ?? "",
      imgAlign: (ctx.editor?.getAttributes("image").align as string | null) ?? null,
    }),
  });

  useEffect(() => {
    if (editorState?.isImage) {
      setImgWidthInput(editorState.imgWidth);
      setImgAlignActive(editorState.imgAlign);
    }
  }, [editorState?.isImage, editorState?.imgWidth, editorState?.imgAlign]);

  function applyImageWidth(w: string) {
    if (!editor) return;
    editor.chain().focus().updateAttributes("image", { width: w || null }).run();
  }

  function applyImageAlign(a: string | null) {
    if (!editor) return;
    setImgAlignActive(a);
    editor.chain().focus().updateAttributes("image", { align: a }).run();
  }

  const openLinkModal = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    setUrlModal({
      title: "Link einfügen",
      placeholder: "https://",
      initial: prev ?? "https://",
      onConfirm: (url) => {
        if (url === "") editor.chain().focus().extendMarkRange("link").unsetLink().run();
        else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      },
    });
  }, [editor]);

  const openImageUrlModal = useCallback(() => {
    if (!editor) return;
    setUrlModal({
      title: "Bild-URL einfügen",
      placeholder: "https://beispiel.de/bild.jpg",
      initial: "https://",
      onConfirm: (url) => { editor.chain().focus().setImage({ src: url }).run(); },
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
      <div className="flex flex-wrap gap-1.5 p-2.5 border border-b-0 border-arena-border rounded-t-xl bg-arena-bg font-sans">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Fett"><strong>B</strong></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Kursiv"><em>I</em></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Unterstrichen"><span className="underline">U</span></ToolbarButton>
        <span className="border-l border-arena-border mx-1.5" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="H1">H1</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="H2">H2</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="H3">H3</ToolbarButton>
        <span className="border-l border-arena-border mx-1.5" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Aufzählung">• Liste</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Nummerierte Liste">1. Liste</ToolbarButton>
        <span className="border-l border-arena-border mx-1.5" />
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Linksbündig">Links</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Zentriert">Mitte</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Rechtsbündig">Rechts</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} title="Blocksatz">Block</ToolbarButton>
        <span className="border-l border-arena-border mx-1.5" />
        <ToolbarButton onClick={openLinkModal} active={editor.isActive("link")} title="Link einfügen">Link</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Zitat">❝</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Trennlinie">—</ToolbarButton>
        <span className="border-l border-arena-border mx-1.5" />
        <ToolbarButton onClick={() => imgInputRef.current?.click()} active={false} title="Bild hochladen">Bild</ToolbarButton>
        <ToolbarButton onClick={openImageUrlModal} active={false} title="Bild per URL">Bild-URL</ToolbarButton>
        <span className="border-l border-arena-border mx-1.5 ml-auto" />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} active={false} title="Rückgängig">↩</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} active={false} title="Wiederholen">↪</ToolbarButton>
        <span className="border-l border-arena-border mx-1.5" />
        <ToolbarButton onClick={onToggleHtml} active={htmlMode} title="HTML-Quelltext">&lt;/&gt; HTML</ToolbarButton>
        <input ref={imgInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleImageFile(f); e.target.value = ""; }} />
      </div>
      {editorState?.isImage && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-blue-50 border border-b-0 border-blue-200 text-xs font-sans">
          <span className="text-blue-700 font-bold">Bildgröße:</span>
          <input type="text" value={imgWidthInput}
            onChange={(e) => setImgWidthInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") applyImageWidth(imgWidthInput); }}
            onBlur={() => applyImageWidth(imgWidthInput)}
            placeholder="400"
            className="w-16 border border-blue-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
          <span className="text-blue-500">px</span>
          {(["200", "400", "600"] as const).map((val) => (
            <button key={val} type="button" onMouseDown={(e) => { e.preventDefault(); setImgWidthInput(val); applyImageWidth(val); }}
              className={`px-2 py-0.5 rounded border text-xs transition-colors cursor-pointer ${imgWidthInput === val ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-600 border-blue-300 hover:bg-blue-100"}`}>{val}</button>
          ))}
          <button type="button" onMouseDown={(e) => { e.preventDefault(); setImgWidthInput("100%"); applyImageWidth("100%"); }}
            className={`px-2 py-0.5 rounded border text-xs transition-colors cursor-pointer ${imgWidthInput === "100%" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-600 border-blue-300 hover:bg-blue-100"}`}>Voll</button>
          <span className="border-l border-blue-200 mx-1 self-stretch" />
          <span className="text-blue-700 font-bold">Ausrichtung:</span>
          {(["left", "center", "right", null] as const).map((a) => (
            <button key={String(a)} type="button"
              onMouseDown={(e) => { e.preventDefault(); applyImageAlign(a); }}
              className={`px-2 py-0.5 rounded border text-xs transition-colors cursor-pointer ${
                imgAlignActive === a ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-600 border-blue-300 hover:bg-blue-100"
              }`}>
              {a === "left" ? "Links" : a === "center" ? "Mitte" : a === "right" ? "Rechts" : "Normal"}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   Haupt-Komponente
══════════════════════════════════════════════════════════════ */
type NewsEntry = {
  _id: string;
  title: string;
  layout: NewsLayout;
  active: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export default function NewsAdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [view, setView] = useState<"list" | "editor">("list");

  // List
  const [posts, setPosts] = useState<NewsEntry[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  // Editor
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [layout, setLayout] = useState<NewsLayout>("text-only");
  const [imageUrl, setImageUrl] = useState("");
  const [imageRatio, setImageRatio] = useState(40);
  const [isActive, setIsActive] = useState(false);
  const [htmlMode, setHtmlMode] = useState(false);
  const [htmlSource, setHtmlSource] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const imgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const acc = getStoredAccount();
    setIsAdmin(acc?.role === "ADMIN" || acc?.role === "SUPERADMIN");
  }, []);

  const loadPosts = useCallback(async () => {
    setPostsLoading(true);
    try {
      const res = await fetch("/api/admin/news");
      const data = (await res.json()) as { posts?: NewsEntry[] };
      setPosts(data.posts ?? []);
    } finally {
      setPostsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void loadPosts();
  }, [isAdmin, loadPosts]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      LinkExtension.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      ResizableImage.configure({ inline: false, allowBase64: true }),
    ],
    content: "",
    editorProps: {
      attributes: { class: "prose prose-sm max-w-none min-h-[300px] p-4 focus:outline-none font-sans" },
    },
  });

  const toggleHtmlMode = useCallback(() => {
    if (!editor) return;
    if (!htmlMode) {
      setHtmlSource(editor.getHTML());
      setHtmlMode(true);
    } else {
      if (
        /<div[\s>]/i.test(htmlSource) &&
        !window.confirm(
          "Beim Wechsel in den visuellen Modus gehen <div>-Elemente und spezielles HTML verloren.\nNur im HTML-Modus speichern, um sie zu behalten.\nTrotzdem wechseln?"
        )
      ) {
        return;
      }
      editor.commands.setContent(htmlSource);
      setHtmlMode(false);
    }
  }, [editor, htmlMode, htmlSource]);

  function openNew() {
    setEditId(null);
    setTitle("");
    setLayout("text-only");
    setImageUrl("");
    setImageRatio(40);
    setIsActive(false);
    setHtmlMode(false);
    setHtmlSource("");
    setSaveStatus("");
    editor?.commands.clearContent();
    setView("editor");
  }

  async function openEdit(id: string) {
    const res = await fetch(`/api/admin/news/${id}`);
    const data = (await res.json()) as { post?: { _id: string; title: string; layout: NewsLayout; htmlContent: string; imageUrl: string | null; imageRatio: number; active: boolean } };
    if (!data.post) return;
    const p = data.post;
    setEditId(p._id);
    setTitle(p.title);
    setLayout(p.layout);
    setImageUrl(p.imageUrl ?? "");
    setImageRatio(p.imageRatio);
    setIsActive(p.active);
    setHtmlMode(false);
    setHtmlSource("");
    setSaveStatus("");
    editor?.commands.setContent(p.htmlContent);
    setView("editor");
  }

  async function handleSave(publish?: boolean) {
    if (!editor) return;
    if (!title.trim()) { setSaveStatus("❌ Titel ist erforderlich."); return; }
    const htmlContent = htmlMode ? htmlSource : editor.getHTML();
    if (!htmlContent || (!htmlMode && editor.isEmpty)) { setSaveStatus("❌ Inhalt ist erforderlich."); return; }

    setSaving(true);
    setSaveStatus("");
    try {
      const res = await fetch("/api/admin/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editId ?? undefined,
          title: title.trim(),
          layout,
          htmlContent,
          imageUrl: layout !== "text-only" ? imageUrl.trim() : undefined,
          imageRatio: layout !== "text-only" ? imageRatio : undefined,
          active: publish !== undefined ? publish : isActive,
        }),
      });
      const data = (await res.json()) as { message?: string; id?: string };
      if (res.ok) {
        if (!editId && data.id) setEditId(data.id);
        if (publish !== undefined) setIsActive(publish);
        setSaveStatus("✓ Gespeichert");
        void loadPosts();
        setTimeout(() => setSaveStatus(""), 3000);
      } else {
        setSaveStatus(`❌ ${data.message ?? "Fehler"}`);
      }
    } catch {
      setSaveStatus("❌ Netzwerkfehler.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(id: string, active: boolean) {
    await fetch(`/api/admin/news/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    setPosts((prev) => prev.map((p) => p._id === id ? { ...p, active } : p));
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Beitrag wirklich löschen?")) return;
    await fetch(`/api/admin/news/${id}`, { method: "DELETE" });
    setPosts((prev) => prev.filter((p) => p._id !== id));
    if (editId === id) setView("list");
  }

  async function handleImageFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  if (isAdmin === null) {
    return (
      <main className="centered-main font-sans">
        <section className="card font-sans text-center py-8">
          <p className="font-sans text-sm text-arena-muted">Wird geladen …</p>
        </section>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="centered-main font-sans">
        <div className="card font-sans max-w-md p-8 text-center bg-white">
          <h1 className="font-sans text-2xl font-bold text-arena-danger mb-3">Zugriff verweigert</h1>
          <p className="font-sans text-sm text-arena-muted mb-6">Diese Seite ist nur für Administratoren.</p>
          <Link href="/" className="btn btn-primary font-sans w-full">
            Zur Startseite
          </Link>
        </div>
      </main>
    );
  }

  const LAYOUT_LABELS: Record<NewsLayout, string> = {
    "text-only": "Nur Text",
    "image-left": "Bild links",
    "image-right": "Bild rechts",
  };

  return (
    <main className="centered-main font-sans">
      <div className="card font-sans">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4 font-sans border-b border-arena-border-light pb-3">
          <h1 className="font-sans text-2xl font-bold text-arena-blue tracking-tight m-0">📰 News-Beiträge</h1>
          {view === "list" ? (
            <button type="button" onClick={openNew} className="btn btn-sm btn-primary font-sans">
              + Neuer Beitrag
            </button>
          ) : (
            <button type="button" onClick={() => setView("list")} className="btn btn-sm font-sans">
              ← Zur Übersicht
            </button>
          )}
        </div>

        {/* ═══ LIST VIEW ═══ */}
        {view === "list" && (
          <>
            {postsLoading ? (
              <p className="font-sans text-sm text-arena-muted">Lade…</p>
            ) : posts.length === 0 ? (
              <p className="font-sans text-sm text-arena-muted">Noch keine Beiträge vorhanden.</p>
            ) : (
              <div className="overflow-x-auto border border-arena-border-light rounded-lg font-sans">
                <table className="w-full text-left border-collapse font-sans text-sm">
                  <thead>
                    <tr className="border-b border-arena-border-light bg-arena-bg font-bold text-arena-blue font-sans">
                      <th className="py-2.5 px-4 font-sans">Titel</th>
                      <th className="py-2.5 px-4 font-sans">Layout</th>
                      <th className="py-2.5 px-4 font-sans">Status</th>
                      <th className="py-2.5 px-4 font-sans">Erstellt von</th>
                      <th className="py-2.5 px-4 font-sans">Datum</th>
                      <th className="py-2.5 px-4 font-sans">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((p) => (
                      <tr key={p._id} className="border-b border-arena-border-light hover:bg-arena-bg-light transition-colors font-sans">
                        <td className="py-2.5 px-4 font-bold text-arena-blue max-w-xs truncate font-sans">{p.title}</td>
                        <td className="py-2.5 px-4 text-arena-muted text-xs font-sans">{LAYOUT_LABELS[p.layout]}</td>
                        <td className="py-2.5 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.active ? "bg-green-50 text-green-800 border border-green-200" : "bg-arena-bg text-arena-muted border border-arena-border"}`}>
                            {p.active ? "Aktiv" : "Inaktiv"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-arena-text font-sans">{p.createdBy}</td>
                        <td className="py-2.5 px-4 text-arena-muted whitespace-nowrap font-sans">
                          {new Date(p.updatedAt).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex gap-2 font-sans">
                            <button type="button" onClick={() => void openEdit(p._id)} className="btn btn-sm font-sans">Bearbeiten</button>
                            <button
                              type="button"
                              onClick={() => void handleToggleActive(p._id, !p.active)}
                              className={`btn btn-sm font-sans ${p.active ? "border-arena-blue text-arena-blue hover:bg-arena-bg" : "bg-green-600 border-green-600 text-white"}`}
                            >
                              {p.active ? "Deaktivieren" : "Aktivieren"}
                            </button>
                            <button type="button" onClick={() => void handleDelete(p._id)} className="btn btn-sm btn-danger font-sans">Löschen</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ═══ EDITOR VIEW ═══ */}
        {view === "editor" && (
          <div className="grid gap-5 w-full font-sans">
            {/* Titel */}
            <div>
              <label className="block text-sm font-bold text-arena-blue mb-1 font-sans">Titel</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titel des Beitrags…"
                maxLength={200}
                className="input-base w-full font-sans"
              />
            </div>

            {/* Layout-Auswahl */}
            <div>
              <label className="block text-sm font-bold text-arena-blue mb-2 font-sans">Layout</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {LAYOUT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setLayout(opt.key)}
                    className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      layout === opt.key ? "border-arena-blue bg-blue-50/40" : "border-arena-border bg-white hover:border-arena-blue/50"
                    }`}
                  >
                    <div className="mb-3">{opt.preview}</div>
                    <div className="text-sm font-bold text-arena-blue">{opt.label}</div>
                    <div className="text-xs text-arena-muted mt-1">{opt.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Bild-Einstellungen (nur bei Image-Layouts) */}
            {layout !== "text-only" && (
              <div className="p-4 bg-blue-50/40 border border-blue-200 rounded-xl grid gap-4 font-sans">
                <h2 className="text-sm font-bold text-blue-900 m-0">🖼️ Titelbild</h2>
                <div>
                  <label className="block text-xs font-bold text-blue-950 mb-1">Bild hochladen oder URL eingeben</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://… oder Base64 nach Upload"
                      className="flex-1 input-base bg-white border-blue-200 text-xs min-h-[2.25rem] focus:border-blue-400"
                    />
                    <button
                      type="button"
                      onClick={() => imgInputRef.current?.click()}
                      className="btn btn-sm border-blue-300 bg-white text-blue-600 hover:bg-blue-100 whitespace-nowrap min-h-[2.25rem] px-3 font-sans"
                    >
                      📁 Datei
                    </button>
                    <input
                      ref={imgInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleImageFile(f); e.target.value = ""; }}
                    />
                  </div>
                  {imageUrl && (
                    <div className="mt-3 flex justify-center border border-blue-100 rounded-lg p-2 bg-white">
                      <ProgressiveImg src={imageUrl} alt="Vorschau" className="max-h-40 rounded-lg object-contain" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-blue-950 mb-1">
                    Bildbreite: <span className="font-bold text-blue-700">{imageRatio}%</span>
                    <span className="text-blue-500 ml-1">(Text: {100 - imageRatio}%)</span>
                  </label>
                  <input
                    type="range"
                    min={20}
                    max={80}
                    step={5}
                    value={imageRatio}
                    onChange={(e) => setImageRatio(Number(e.target.value))}
                    className="w-full accent-arena-blue"
                  />
                  <div className="flex justify-between text-[10px] text-blue-950 mt-0.5 font-bold">
                    <span>20% Bild</span>
                    <span>80% Bild</span>
                  </div>
                </div>
              </div>
            )}

            {/* Textinhalt */}
            <div>
              <label className="block text-sm font-bold text-arena-blue mb-1 font-sans">Inhalt</label>
              <div className="border border-arena-border rounded-xl overflow-hidden shadow-sm font-sans bg-white">
                <EditorToolbar editor={editor} htmlMode={htmlMode} onToggleHtml={toggleHtmlMode} />
                {htmlMode ? (
                  <textarea
                    value={htmlSource}
                    onChange={(e) => setHtmlSource(e.target.value)}
                    className="w-full min-h-[300px] p-4 font-mono text-sm bg-white focus:outline-none resize-y"
                    spellCheck={false}
                  />
                ) : (
                  <div className="bg-white">
                    <EditorContent editor={editor} />
                  </div>
                )}
              </div>
            </div>

            {/* Aktiv/Inaktiv */}
            <div className="flex items-center gap-3 font-sans">
              <label className="flex items-center gap-2 cursor-pointer select-none font-sans text-sm font-bold text-arena-blue">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-arena-border text-arena-blue focus:ring-arena-blue-light"
                />
                Beitrag sofort aktivieren (im Header sichtbar)
              </label>
            </div>

            {/* Speichern */}
            <div className="flex items-center gap-2 flex-wrap font-sans border-t border-arena-border-light pt-4 mt-2">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="btn btn-primary font-sans bg-arena-blue border-arena-blue text-white"
              >
                {saving ? "Speichert…" : "Speichern"}
              </button>
              {!isActive && (
                <button
                  type="button"
                  onClick={() => void handleSave(true)}
                  disabled={saving}
                  className="btn btn-primary font-sans"
                >
                  Speichern & aktivieren
                </button>
              )}
              {isActive && (
                <button
                  type="button"
                  onClick={() => void handleSave(false)}
                  disabled={saving}
                  className="btn font-sans border-arena-blue text-arena-blue font-bold hover:bg-arena-bg"
                >
                  Speichern & deaktivieren
                </button>
              )}
              {saveStatus && (
                <span className={`text-sm font-bold ml-2 ${saveStatus.includes("✓") ? "text-green-700" : "text-arena-danger"}`}>
                  {saveStatus}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
