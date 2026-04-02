"use client";

import { useEditor, EditorContent, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
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
        renderHTML: () => ({}), // merged in node renderHTML below
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
        renderHTML: () => ({}), // merged in node renderHTML below
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

/* ══════════════════════════════════════════════════════════════
   Toolbar
══════════════════════════════════════════════════════════════ */
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
      className={`px-2 py-1 rounded text-sm font-medium border transition-colors ${
        active ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

type UrlModalConfig = { title: string; placeholder: string; initial: string; onConfirm: (url: string) => void };

function UrlInputModal({ config, onClose }: { config: UrlModalConfig; onClose: () => void }) {
  const [value, setValue] = useState(config.initial);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);
  const confirm = () => { if (value.trim()) config.onConfirm(value.trim()); onClose(); };
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-xl shadow-2xl w-[min(480px,95vw)] p-5">
        <h3 className="text-base font-semibold text-gray-800 mb-3">{config.title}</h3>
        <input ref={inputRef} type="url" value={value} onChange={(e) => setValue(e.target.value)}
          placeholder={config.placeholder}
          onKeyDown={(e) => { if (e.key === "Enter") confirm(); if (e.key === "Escape") onClose(); }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4" />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-1.5 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-gray-50">Abbrechen</button>
          <button type="button" onClick={confirm} className="px-4 py-1.5 rounded-lg text-sm bg-blue-600 text-white font-medium hover:bg-blue-700">Einfügen</button>
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
        <ToolbarButton onClick={openLinkModal} active={editor.isActive("link")} title="Link einfügen">🔗 Link</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Zitat">❝</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Trennlinie">—</ToolbarButton>
        <span className="border-l border-gray-300 mx-1" />
        <ToolbarButton onClick={() => imgInputRef.current?.click()} active={false} title="Bild hochladen">🖼 Bild</ToolbarButton>
        <ToolbarButton onClick={openImageUrlModal} active={false} title="Bild per URL">🔗 Bild-URL</ToolbarButton>
        <span className="border-l border-gray-300 mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} active={false} title="Rückgängig">↩</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} active={false} title="Wiederholen">↪</ToolbarButton>
        <span className="border-l border-gray-300 mx-1" />
        <ToolbarButton onClick={onToggleHtml} active={htmlMode} title="HTML-Quelltext">&lt;/&gt; HTML</ToolbarButton>
        <input ref={imgInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleImageFile(f); e.target.value = ""; }} />
      </div>
      {editorState?.isImage && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 bg-blue-50 border border-b-0 border-blue-200 text-xs">
          <span className="text-blue-700 font-medium">🖼️ Bildgröße:</span>
          <input type="text" value={imgWidthInput}
            onChange={(e) => setImgWidthInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") applyImageWidth(imgWidthInput); }}
            onBlur={() => applyImageWidth(imgWidthInput)}
            placeholder="400"
            className="w-16 border border-blue-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
          <span className="text-blue-500">px</span>
          {(["200", "400", "600"] as const).map((val) => (
            <button key={val} type="button"
              onMouseDown={(e) => { e.preventDefault(); setImgWidthInput(val); applyImageWidth(val); }}
              className={`px-2 py-0.5 rounded border text-xs transition-colors ${imgWidthInput === val ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-600 border-blue-300 hover:bg-blue-100"}`}>
              {val}
            </button>
          ))}
          <button type="button" onMouseDown={(e) => { e.preventDefault(); setImgWidthInput("100%"); applyImageWidth("100%"); }}
            className={`px-2 py-0.5 rounded border text-xs transition-colors ${imgWidthInput === "100%" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-600 border-blue-300 hover:bg-blue-100"}`}>
            Voll
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
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   Layout-Selector
══════════════════════════════════════════════════════════════ */
type NewsLayout = "text-only" | "image-left" | "image-right";

const LAYOUT_OPTIONS: { key: NewsLayout; label: string; description: string; preview: React.ReactNode }[] = [
  {
    key: "text-only",
    label: "Nur Text",
    description: "Kein Bild, nur Textinhalt",
    preview: (
      <div className="space-y-1">
        <div className="h-2 bg-gray-300 rounded w-full" />
        <div className="h-2 bg-gray-300 rounded w-5/6" />
        <div className="h-2 bg-gray-300 rounded w-4/5" />
      </div>
    ),
  },
  {
    key: "image-left",
    label: "Bild links, Text rechts",
    description: "Bild auf der linken Seite",
    preview: (
      <div className="flex gap-1.5">
        <div className="w-2/5 h-8 bg-blue-200 rounded" />
        <div className="flex-1 space-y-1">
          <div className="h-2 bg-gray-300 rounded w-full" />
          <div className="h-2 bg-gray-300 rounded w-5/6" />
          <div className="h-2 bg-gray-300 rounded w-4/5" />
        </div>
      </div>
    ),
  },
  {
    key: "image-right",
    label: "Text links, Bild rechts",
    description: "Bild auf der rechten Seite",
    preview: (
      <div className="flex gap-1.5">
        <div className="flex-1 space-y-1">
          <div className="h-2 bg-gray-300 rounded w-full" />
          <div className="h-2 bg-gray-300 rounded w-5/6" />
          <div className="h-2 bg-gray-300 rounded w-4/5" />
        </div>
        <div className="w-2/5 h-8 bg-blue-200 rounded" />
      </div>
    ),
  },
];

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
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      ResizableImage.configure({ inline: false, allowBase64: true }),
    ],
    content: "",
    editorProps: {
      attributes: { class: "prose prose-sm max-w-none min-h-[300px] p-4 focus:outline-none" },
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

  if (isAdmin === null) return <div className="p-8 text-gray-500">Lade…</div>;
  if (!isAdmin) return <div className="p-8 text-red-600 font-semibold">Kein Zugriff.</div>;

  const LAYOUT_LABELS: Record<NewsLayout, string> = {
    "text-only": "Nur Text",
    "image-left": "Bild links",
    "image-right": "Bild rechts",
  };

  return (
    <main className="w-[min(1100px,100%)] mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📰 News-Beiträge</h1>
        {view === "list" ? (
          <button type="button" onClick={openNew}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            + Neuer Beitrag
          </button>
        ) : (
          <button type="button" onClick={() => setView("list")}
            className="px-4 py-2 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">
            ← Zur Übersicht
          </button>
        )}
      </div>

      {/* ═══ LIST VIEW ═══ */}
      {view === "list" && (
        <>
          {postsLoading ? (
            <p className="text-gray-400 text-sm">Lade…</p>
          ) : posts.length === 0 ? (
            <p className="text-gray-400 text-sm">Noch keine Beiträge vorhanden.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 font-medium">
                  <tr>
                    <th className="px-4 py-2 text-left">Titel</th>
                    <th className="px-4 py-2 text-left">Layout</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Erstellt von</th>
                    <th className="px-4 py-2 text-left">Datum</th>
                    <th className="px-4 py-2 text-left">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {posts.map((p) => (
                    <tr key={p._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-800 max-w-xs truncate">{p.title}</td>
                      <td className="px-4 py-2 text-gray-500 text-xs">{LAYOUT_LABELS[p.layout]}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${p.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {p.active ? "Aktiv" : "Inaktiv"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-500">{p.createdBy}</td>
                      <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                        {new Date(p.updatedAt).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <button type="button" onClick={() => void openEdit(p._id)} className="text-blue-600 hover:underline text-xs">Bearbeiten</button>
                          <button type="button" onClick={() => void handleToggleActive(p._id, !p.active)}
                            className={`text-xs hover:underline ${p.active ? "text-yellow-600" : "text-green-600"}`}>
                            {p.active ? "Deaktivieren" : "Aktivieren"}
                          </button>
                          <button type="button" onClick={() => void handleDelete(p._id)} className="text-red-500 hover:underline text-xs">Löschen</button>
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
        <div className="space-y-6">
          {/* Titel */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Titel des Beitrags…" maxLength={200}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Layout-Auswahl */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Layout</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {LAYOUT_OPTIONS.map((opt) => (
                <button key={opt.key} type="button" onClick={() => setLayout(opt.key)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    layout === opt.key ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
                  }`}>
                  <div className="mb-3">{opt.preview}</div>
                  <div className="text-sm font-semibold text-gray-800">{opt.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{opt.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Bild-Einstellungen (nur bei Image-Layouts) */}
          {layout !== "text-only" && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-4">
              <h2 className="text-sm font-semibold text-blue-800">🖼️ Bild</h2>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bild hochladen oder URL eingeben</label>
                <div className="flex gap-2">
                  <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://… oder Base64 nach Upload"
                    className="flex-1 border border-blue-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <button type="button" onClick={() => imgInputRef.current?.click()}
                    className="px-3 py-2 rounded-lg border border-blue-300 bg-white text-sm text-blue-600 hover:bg-blue-100 whitespace-nowrap">
                    📁 Datei
                  </button>
                  <input ref={imgInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleImageFile(f); e.target.value = ""; }} />
                </div>
                {imageUrl && (
                  <div className="mt-2 flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="Vorschau" className="max-h-40 rounded-lg object-contain" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Bildbreite: <span className="font-bold text-blue-700">{imageRatio}%</span>
                  <span className="text-gray-400 ml-1">(Text: {100 - imageRatio}%)</span>
                </label>
                <input type="range" min={20} max={80} step={5} value={imageRatio}
                  onChange={(e) => setImageRatio(Number(e.target.value))}
                  className="w-full" />
                <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                  <span>20% Bild</span>
                  <span>80% Bild</span>
                </div>
              </div>
            </div>
          )}

          {/* Textinhalt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Inhalt</label>
            <div className="border border-gray-300 rounded-lg overflow-hidden shadow-sm">
              <EditorToolbar editor={editor} htmlMode={htmlMode} onToggleHtml={toggleHtmlMode} />
              {htmlMode ? (
                <textarea value={htmlSource} onChange={(e) => setHtmlSource(e.target.value)}
                  className="w-full min-h-[300px] p-4 font-mono text-sm bg-white focus:outline-none resize-y"
                  spellCheck={false} />
              ) : (
                <EditorContent editor={editor} className="bg-white" />
              )}
            </div>
          </div>

          {/* Aktiv/Inaktiv */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-sm font-medium text-gray-700">Beitrag sofort aktivieren (im Header sichtbar)</span>
            </label>
          </div>

          {/* Speichern */}
          <div className="flex items-center gap-3 flex-wrap">
            <button type="button" onClick={() => void handleSave()} disabled={saving}
              className="bg-gray-700 text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-gray-800 disabled:opacity-50 transition-colors">
              {saving ? "Speichert…" : "Speichern"}
            </button>
            {!isActive && (
              <button type="button" onClick={() => void handleSave(true)} disabled={saving}
                className="bg-green-600 text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-50 transition-colors">
                Speichern & aktivieren
              </button>
            )}
            {isActive && (
              <button type="button" onClick={() => void handleSave(false)} disabled={saving}
                className="bg-yellow-500 text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-yellow-600 disabled:opacity-50 transition-colors">
                Speichern & deaktivieren
              </button>
            )}
            {saveStatus && (
              <span className={`text-sm ${saveStatus.startsWith("✓") ? "text-green-700" : "text-red-600"}`}>
                {saveStatus}
              </span>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
