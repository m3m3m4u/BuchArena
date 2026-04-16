"use client";

import {
  useEditor,
  EditorContent,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import TiptapLink from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import { useEffect, useState, useCallback, useRef } from "react";
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
    const styles: string[] = [];
    if (width) {
      const w = String(width);
      styles.push(w.endsWith("%") ? `width: ${w}; max-width: 100%` : `width: ${w}px; max-width: 100%`);
    }
    if (align === "center") styles.push("display: block; margin-left: auto; margin-right: auto");
    else if (align === "left") styles.push("float: left; margin-right: 1rem; margin-bottom: 0.5rem");
    else if (align === "right") styles.push("float: right; margin-left: 1rem; margin-bottom: 0.5rem");
    const attrs: Record<string, unknown> = { ...HTMLAttributes };
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
      className={`px-2 py-1 rounded text-sm font-medium border transition-colors ${
        active ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-xl shadow-2xl w-[min(480px,95vw)] p-5">
        <h3 className="text-base font-semibold text-gray-800 mb-3">{config.title}</h3>
        <input ref={inputRef} type="url" value={value} onChange={(e) => setValue(e.target.value)}
          placeholder={config.placeholder}
          onKeyDown={(e) => { if (e.key === "Enter") confirm(); if (e.key === "Escape") onClose(); }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4" />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-gray-50">Abbrechen</button>
          <button type="button" onClick={confirm}
            className="px-4 py-1.5 rounded-lg text-sm bg-blue-600 text-white font-medium hover:bg-blue-700">Einfügen</button>
        </div>
      </div>
    </div>
  );
}

/* ── Toolbar ── */
function EditorToolbar({
  editor, htmlMode, onToggleHtml,
}: { editor: Editor | null; htmlMode: boolean; onToggleHtml: () => void }) {
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
    if (editorState?.isYoutube) { setYtWidthInput(editorState.ytWidth); setYtHeightInput(editorState.ytHeight); }
  }, [editorState?.isYoutube, editorState?.ytWidth, editorState?.ytHeight]);

  const applyImageAttrs = (patch: Record<string, unknown>) => {
    if (!editor || imgNodePosRef.current < 0) return;
    const pos = imgNodePosRef.current;
    const node = editor.state.doc.nodeAt(pos);
    if (!node) return;
    editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, null, { ...node.attrs, ...patch }));
  };
  const applyImageWidth = (w: string) => applyImageAttrs({ width: w || null });
  const applyImageAlign = (a: string | null) => { setImgAlignActive(a); applyImageAttrs({ align: a }); };
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
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Fett"><strong>B</strong></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Kursiv"><em>I</em></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Unterstrichen"><span className="underline">U</span></ToolbarButton>
        <span className="border-l border-gray-300 mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="H1">H1</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="H2">H2</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="H3">H3</ToolbarButton>
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
              <span className="text-blue-700 font-medium">Videogröße:</span>
              <input type="number" min={100} max={1920} value={ytWidthInput}
                onChange={(e) => setYtWidthInput(e.target.value)}
                onBlur={() => { if (ytWidthInput && ytHeightInput) applyYtSize(Number(ytWidthInput), Number(ytHeightInput)); }}
                className="w-16 border border-blue-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
              <span className="text-blue-500">×</span>
              <input type="number" min={56} max={1080} value={ytHeightInput}
                onChange={(e) => setYtHeightInput(e.target.value)}
                onBlur={() => { if (ytWidthInput && ytHeightInput) applyYtSize(Number(ytWidthInput), Number(ytHeightInput)); }}
                className="w-16 border border-blue-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
              <span className="text-blue-500">px</span>
              {([[640, 360], [800, 450], [1024, 576]] as const).map(([w, h]) => (
                <button key={`${w}x${h}`} type="button"
                  onMouseDown={(e) => { e.preventDefault(); setYtWidthInput(String(w)); setYtHeightInput(String(h)); applyYtSize(w, h); }}
                  className={`px-2 py-0.5 rounded border text-xs transition-colors ${ytWidthInput === String(w) && ytHeightInput === String(h) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-600 border-blue-300 hover:bg-blue-100"}`}>
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
   Typen
══════════════════════════════════════════════════════════════ */
type BlogStatus = "pending" | "approved" | "rejected";

type BlogEntry = {
  _id: string;
  title: string;
  excerpt: string;
  status: BlogStatus;
  authorUsername: string;
  authorDisplayName: string;
  rejectionNote: string | null;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

/* ── Status-Badge ── */
function StatusBadge({ status }: { status: BlogStatus }) {
  const map: Record<BlogStatus, { label: string; className: string }> = {
    pending:  { label: "Ausstehend", className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
    approved: { label: "Freigegeben", className: "bg-green-100 text-green-800 border-green-300" },
    rejected: { label: "Abgelehnt", className: "bg-red-100 text-red-800 border-red-300" },
  };
  const { label, className } = map[status];
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${className}`}>{label}</span>;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
    + " " + d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

/* ══════════════════════════════════════════════════════════════
   Haupt-Komponente
══════════════════════════════════════════════════════════════ */
export default function BlogAdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [view, setView] = useState<"list" | "editor">("list");
  const [statusFilter, setStatusFilter] = useState<BlogStatus>("pending");

  // Liste
  const [posts, setPosts] = useState<BlogEntry[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  // Editor
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStatus, setEditStatus] = useState<BlogStatus>("approved");
  const [rejectionNote, setRejectionNote] = useState("");
  const [htmlMode, setHtmlMode] = useState(false);
  const [htmlSource, setHtmlSource] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const acc = getStoredAccount();
    setIsAdmin(acc?.role === "ADMIN" || acc?.role === "SUPERADMIN");
  }, []);

  const loadPosts = useCallback(async (filter: BlogStatus) => {
    setPostsLoading(true);
    try {
      const res = await fetch(`/api/admin/blog?status=${filter}`);
      const data = (await res.json()) as { posts?: BlogEntry[] };
      setPosts(data.posts ?? []);
    } finally {
      setPostsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void loadPosts(statusFilter);
  }, [isAdmin, statusFilter, loadPosts]);

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
    if (!htmlMode) { setHtmlSource(editor.getHTML()); setHtmlMode(true); }
    else { editor.commands.setContent(htmlSource); setHtmlMode(false); }
  }, [editor, htmlMode, htmlSource]);

  /** Beitrag in Editor laden */
  const openEdit = useCallback(async (id: string) => {
    setSaveStatus("");
    setHtmlMode(false);
    const res = await fetch(`/api/admin/blog/${id}`);
    const data = (await res.json()) as { post?: BlogEntry & { htmlContent: string } };
    if (!data.post) return;
    setEditId(id);
    setEditTitle(data.post.title);
    setEditStatus(data.post.status);
    setRejectionNote(data.post.rejectionNote ?? "");
    editor?.commands.setContent(data.post.htmlContent);
    setView("editor");
  }, [editor]);

  /** Neuen Blog (von Admin) anlegen */
  const openNew = useCallback(() => {
    setEditId(null);
    setEditTitle("");
    setEditStatus("approved");
    setRejectionNote("");
    setHtmlMode(false);
    setHtmlSource("");
    editor?.commands.clearContent();
    setSaveStatus("");
    setView("editor");
  }, [editor]);

  /** Speichern */
  const handleSave = useCallback(async () => {
    const htmlContent = htmlMode ? htmlSource : editor?.getHTML() ?? "";
    if (!editTitle.trim()) { setSaveStatus("Titel ist erforderlich."); return; }
    if (!htmlContent.trim() || editor?.isEmpty) { setSaveStatus("Inhalt ist erforderlich."); return; }
    setSaving(true);
    setSaveStatus("");
    try {
      const res = await fetch("/api/admin/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editId ?? undefined,
          title: editTitle.trim(),
          htmlContent,
          status: editStatus,
          rejectionNote: editStatus === "rejected" ? rejectionNote : undefined,
        }),
      });
      const data = (await res.json()) as { message?: string };
      if (res.ok) {
        setSaveStatus("Gespeichert ✓");
        setView("list");
        void loadPosts(statusFilter);
      } else {
        setSaveStatus(data.message ?? "Fehler beim Speichern.");
      }
    } finally {
      setSaving(false);
    }
  }, [htmlMode, htmlSource, editor, editTitle, editId, editStatus, rejectionNote, loadPosts, statusFilter]);

  /** Nur Status ändern (schnelle Freigabe/Ablehnung) */
  const handleStatusChange = useCallback(async (id: string, newStatus: BlogStatus, note?: string) => {
    await fetch("/api/admin/blog", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus, rejectionNote: note }),
    });
    void loadPosts(statusFilter);
  }, [loadPosts, statusFilter]);

  /** Löschen */
  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm("Beitrag wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) return;
    await fetch(`/api/admin/blog?id=${id}`, { method: "DELETE" });
    void loadPosts(statusFilter);
  }, [loadPosts, statusFilter]);

  /* ── Zugriffskontrolle ── */
  if (isAdmin === null) return <div className="p-8 text-sm text-gray-500">Wird geladen …</div>;
  if (!isAdmin) return <div className="p-8 text-sm text-red-600">Kein Zugriff.</div>;

  /* ── Editor-Ansicht ── */
  if (view === "editor") {
    return (
      <div className="w-[min(1100px,100%)] mx-auto px-4 py-8 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <button type="button" className="btn btn-sm" onClick={() => setView("list")}>← Zurück</button>
          <h1 className="text-xl font-bold">{editId ? "Beitrag bearbeiten" : "Neuer Blog-Beitrag"}</h1>
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium">Titel</label>
          <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
            className="input w-full" placeholder="Titel …" />
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium">Status</label>
          <div className="flex gap-2">
            {(["pending", "approved", "rejected"] as BlogStatus[]).map((s) => (
              <button key={s} type="button"
                onClick={() => setEditStatus(s)}
                className={`px-3 py-1.5 rounded text-sm font-medium border transition-colors ${
                  editStatus === s
                    ? s === "approved" ? "bg-green-600 text-white border-green-600"
                      : s === "rejected" ? "bg-red-600 text-white border-red-600"
                      : "bg-yellow-500 text-white border-yellow-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}>
                {s === "pending" ? "Ausstehend" : s === "approved" ? "Freigeben" : "Ablehnen"}
              </button>
            ))}
          </div>
        </div>

        {editStatus === "rejected" && (
          <div>
            <label className="block mb-1 text-sm font-medium">Ablehnungsgrund (optional)</label>
            <textarea value={rejectionNote} onChange={(e) => setRejectionNote(e.target.value)}
              rows={2}
              className="input w-full resize-y text-sm"
              placeholder="Grund für Ablehnung …" />
          </div>
        )}

        <div>
          <label className="block mb-1 text-sm font-medium">Inhalt</label>
          <EditorToolbar editor={editor} htmlMode={htmlMode} onToggleHtml={toggleHtmlMode} />
          {htmlMode ? (
            <textarea value={htmlSource} onChange={(e) => setHtmlSource(e.target.value)}
              className="w-full min-h-[400px] p-4 border border-gray-300 rounded-b-lg font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y" />
          ) : (
            <div className="border border-gray-300 rounded-b-lg bg-white">
              <EditorContent editor={editor} />
            </div>
          )}
        </div>

        {saveStatus && (
          <p className={`text-sm ${saveStatus.includes("✓") ? "text-green-700" : "text-red-600"}`}>{saveStatus}</p>
        )}

        <div className="flex gap-3">
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Speichert …" : "Speichern"}
          </button>
          <button type="button" className="btn" onClick={() => setView("list")}>Abbrechen</button>
        </div>
      </div>
    );
  }

  /* ── Listen-Ansicht ── */
  return (
    <div className="w-[min(1100px,100%)] mx-auto px-4 py-8 flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold">Blog-Verwaltung</h1>
        <button type="button" className="btn btn-primary btn-sm" onClick={openNew}>
          Neuer Beitrag
        </button>
      </div>

      {/* Status-Filter */}
      <div className="flex gap-2 flex-wrap">
        {(["pending", "approved", "rejected"] as BlogStatus[]).map((s) => (
          <button key={s} type="button"
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded text-sm font-medium border transition-colors ${
              statusFilter === s
                ? "bg-arena-blue text-white border-arena-blue"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}>
            {s === "pending" ? "Ausstehend" : s === "approved" ? "Freigegeben" : "Abgelehnt"}
          </button>
        ))}
      </div>

      {postsLoading && <p className="text-sm text-gray-400">Wird geladen …</p>}

      {!postsLoading && posts.length === 0 && (
        <p className="text-sm text-gray-400">Keine Beiträge in dieser Kategorie.</p>
      )}

      <div className="flex flex-col gap-3">
        {posts.map((post) => (
          <div key={post._id} className="border border-gray-200 rounded-xl p-4 bg-white flex flex-col gap-2 shadow-sm">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-semibold text-gray-800 text-sm">{post.title}</span>
                <span className="text-xs text-gray-400">
                  von <strong>{post.authorDisplayName}</strong>
                  {post.authorUsername !== post.authorDisplayName && ` (@${post.authorUsername})`}
                  {" · "}{formatDate(post.createdAt)}
                </span>
                {post.excerpt && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{post.excerpt}</p>}
                {post.rejectionNote && (
                  <p className="text-xs text-red-500 mt-0.5">Ablehnungsgrund: {post.rejectionNote}</p>
                )}
              </div>
              <StatusBadge status={post.status} />
            </div>

            <div className="flex gap-2 flex-wrap mt-1">
              <button type="button" className="btn btn-sm" onClick={() => void openEdit(post._id)}>
                Bearbeiten
              </button>
              {post.status !== "approved" && (
                <button type="button"
                  className="px-3 py-1 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700 border border-green-600 transition-colors"
                  onClick={() => void handleStatusChange(post._id, "approved")}>
                  Freigeben
                </button>
              )}
              {post.status !== "rejected" && (
                <button type="button"
                  className="px-3 py-1 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700 border border-red-600 transition-colors"
                  onClick={() => {
                    const note = window.prompt("Ablehnungsgrund (optional):", "") ?? "";
                    void handleStatusChange(post._id, "rejected", note);
                  }}>
                  Ablehnen
                </button>
              )}
              {post.status !== "pending" && (
                <button type="button"
                  className="px-3 py-1 rounded text-xs font-medium bg-yellow-500 text-white hover:bg-yellow-600 border border-yellow-500 transition-colors"
                  onClick={() => void handleStatusChange(post._id, "pending")}>
                  Zurücksetzen
                </button>
              )}
              <button type="button"
                className="px-3 py-1 rounded text-xs font-medium bg-white text-red-600 border border-red-300 hover:bg-red-50 transition-colors ml-auto"
                onClick={() => void handleDelete(post._id)}>
                Löschen
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
