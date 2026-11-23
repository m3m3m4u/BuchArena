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
import Link from "next/link";
import { getStoredAccount } from "@/lib/client-account";
import { extractYoutubeId } from "@/lib/podcast-utils";
import { ROLLE_LABELS, type KooperationsRolle } from "@/lib/kooperationen";

/* ── Resizable Image (aus Blog-Admin übernommen) ── */
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

/* ── Editor-Toolbar ── */
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
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Zitat">Zitat</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Trennlinie">---</ToolbarButton>
        <span className="border-l border-gray-300 mx-1" />
        <ToolbarButton onClick={() => imgInputRef.current?.click()} active={false} title="Bild hochladen">Bild</ToolbarButton>
        <ToolbarButton onClick={openImageUrlModal} active={false} title="Bild per URL">Bild-URL</ToolbarButton>
        <ToolbarButton onClick={openYoutubeModal} active={editor.isActive("youtube")} title="YouTube einbetten">YouTube</ToolbarButton>
        <span className="border-l border-gray-300 mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} active={false} title="Rückgängig">Undo</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} active={false} title="Wiederholen">Redo</ToolbarButton>
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
type LinkedProfile = {
  username: string;
  profileType: KooperationsRolle;
  displayName: string;
  profileImage?: string;
  profilePath?: string;
  roleLabel?: string;
};

type UserSearchResult = {
  username: string;
  displayName: string;
  profileImage: string;
  availableRoles: KooperationsRolle[];
};

const ALL_PROFILE_ROLES: KooperationsRolle[] = [
  "autor",
  "sprecher",
  "blogger",
  "testleser",
  "lektor",
  "verlag",
];

type Folge = {
  _id: string;
  title: string;
  text: string;
  youtubeUrl: string;
  audioUrl?: string;
  audioFileName?: string;
  audioFileSize?: number;
  coverUrl?: string;
  linkedProfiles?: LinkedProfile[];
  published: boolean;
  views: number;
  createdAt: string;
  updatedAt: string;
};

function formatBytes(n?: number): string {
  if (!n) return "";
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
    + " " + d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

/* ══════════════════════════════════════════════════════════════
   Haupt-Komponente
══════════════════════════════════════════════════════════════ */
export default function PodcastAdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"startseite" | "folgen">("startseite");

  /* ── Startseite ── */
  const [htmlMode, setHtmlMode] = useState(false);
  const [htmlSource, setHtmlSource] = useState("");
  const [startSaveStatus, setStartSaveStatus] = useState("");
  const [startSaving, setStartSaving] = useState(false);

  /* ── Folgen-Liste ── */
  const [folgen, setFolgen] = useState<Folge[]>([]);
  const [folgenLoading, setFolgenLoading] = useState(false);

  /* ── Folge-Formular ── */
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editText, setEditText] = useState("");
  const [editYoutubeUrl, setEditYoutubeUrl] = useState("");
  const [editAudioUrl, setEditAudioUrl] = useState("");
  const [editAudioFileName, setEditAudioFileName] = useState("");
  const [editAudioFileSize, setEditAudioFileSize] = useState(0);
  const [editCoverUrl, setEditCoverUrl] = useState("");
  const [editLinkedProfiles, setEditLinkedProfiles] = useState<LinkedProfile[]>([]);
  const [profileSearchQuery, setProfileSearchQuery] = useState("");
  const [profileSearchResults, setProfileSearchResults] = useState<UserSearchResult[]>([]);
  const [profileSearching, setProfileSearching] = useState(false);
  const profileSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [audioUploading, setAudioUploading] = useState(false);
  const [audioUploadProgress, setAudioUploadProgress] = useState(0);
  const [audioUploadError, setAudioUploadError] = useState("");
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverUploadError, setCoverUploadError] = useState("");
  const [editPublished, setEditPublished] = useState(true);
  const [folgeSaveStatus, setFolgeSaveStatus] = useState("");
  const [folgeSaving, setFolgeSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const acc = getStoredAccount();
    setIsAdmin(acc?.role === "ADMIN" || acc?.role === "SUPERADMIN");
  }, []);

  /* ── Tiptap-Editor (Startseite) ── */
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
      attributes: { class: "prose prose-sm max-w-none min-h-[300px] p-4 focus:outline-none" },
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

  /* ── Startseiten-Inhalt laden ── */
  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/podcast/startseite")
      .then((r) => r.json())
      .then((d: { htmlContent?: string }) => {
        const content = d.htmlContent ?? "";
        editor?.commands.setContent(content);
        setHtmlSource(content);
      })
      .catch(() => {});
  }, [isAdmin, editor]);

  const handleSaveStartseite = useCallback(async () => {
    const htmlContent = htmlMode ? htmlSource : editor?.getHTML() ?? "";
    setStartSaving(true);
    setStartSaveStatus("");
    try {
      const res = await fetch("/api/podcast/startseite", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ htmlContent }),
      });
      const data = (await res.json()) as { message?: string };
      setStartSaveStatus(res.ok ? "Gespeichert." : (data.message ?? "Fehler."));
    } finally {
      setStartSaving(false);
    }
  }, [editor, htmlMode, htmlSource]);

  /* ── Folgen laden ── */
  const loadFolgen = useCallback(async () => {
    setFolgenLoading(true);
    try {
      // Admin-seitig: alle Folgen (auch unveröffentlichte)
      const res = await fetch("/api/admin/podcast/folgen");
      const data = (await res.json()) as { folgen?: Folge[] };
      setFolgen(data.folgen ?? []);
    } finally {
      setFolgenLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin && tab === "folgen") void loadFolgen();
  }, [isAdmin, tab, loadFolgen]);

  /* ── Profil-Suche (debounced) ── */
  useEffect(() => {
    if (profileSearchTimeout.current) clearTimeout(profileSearchTimeout.current);
    const q = profileSearchQuery.trim();
    if (!q) {
      setProfileSearchResults([]);
      setProfileSearching(false);
      return;
    }
    profileSearchTimeout.current = setTimeout(async () => {
      setProfileSearching(true);
      try {
        const res = await fetch(`/api/admin/podcast/search-users?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = (await res.json()) as { users?: UserSearchResult[] };
          setProfileSearchResults(data.users ?? []);
        }
      } catch {
        /* ignore */
      } finally {
        setProfileSearching(false);
      }
    }, 250);
    return () => {
      if (profileSearchTimeout.current) clearTimeout(profileSearchTimeout.current);
    };
  }, [profileSearchQuery]);

  const addLinkedProfile = (user: UserSearchResult) => {
    const defaultRole = user.availableRoles[0] ?? "autor";
    setEditLinkedProfiles((prev) => {
      if (prev.some((p) => p.username === user.username && p.profileType === defaultRole)) {
        return prev;
      }
      return [
        ...prev,
        {
          username: user.username,
          profileType: defaultRole,
          displayName: user.displayName,
          profileImage: user.profileImage,
        },
      ];
    });
    setProfileSearchQuery("");
    setProfileSearchResults([]);
  };

  const updateLinkedProfileRole = (index: number, profileType: KooperationsRolle) => {
    setEditLinkedProfiles((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, profileType } : item)),
    );
  };

  const removeLinkedProfile = (index: number) => {
    setEditLinkedProfiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  /* ── Folge-Formular öffnen ── */
  const openNew = () => {
    setEditId(null);
    setEditTitle("");
    setEditText("");
    setEditYoutubeUrl("");
    setEditAudioUrl("");
    setEditAudioFileName("");
    setEditAudioFileSize(0);
    setEditCoverUrl("");
    setEditLinkedProfiles([]);
    setProfileSearchQuery("");
    setProfileSearchResults([]);
    setAudioUploadError("");
    setCoverUploadError("");
    setEditPublished(true);
    setFolgeSaveStatus("");
    setShowForm(true);
  };

  const openEdit = (f: Folge) => {
    setEditId(f._id);
    setEditTitle(f.title);
    setEditText(f.text);
    setEditYoutubeUrl(f.youtubeUrl);
    setEditAudioUrl(f.audioUrl ?? "");
    setEditAudioFileName(f.audioFileName ?? "");
    setEditAudioFileSize(f.audioFileSize ?? 0);
    setEditCoverUrl(f.coverUrl ?? "");
    setEditLinkedProfiles(f.linkedProfiles ?? []);
    setProfileSearchQuery("");
    setProfileSearchResults([]);
    setAudioUploadError("");
    setCoverUploadError("");
    setEditPublished(f.published);
    setFolgeSaveStatus("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setFolgeSaveStatus("");
  };

  /* ── MP3-Upload (direkt bis 40 MB, darüber in 10-MB-Chunks) ── */
  const handleAudioUpload = async (file: File) => {
    setAudioUploadError("");
    if (!file.name.toLowerCase().endsWith(".mp3") && !file.type.includes("mpeg") && !file.type.includes("mp3")) {
      setAudioUploadError("Bitte eine MP3-Datei auswählen.");
      return;
    }
    if (file.size > 250 * 1024 * 1024) {
      setAudioUploadError("Die MP3-Datei darf maximal 250 MB groß sein.");
      return;
    }

    setAudioUploading(true);
    setAudioUploadProgress(0);

    try {
      const DIRECT_LIMIT = 40 * 1024 * 1024;
      if (file.size <= DIRECT_LIMIT) {
        await new Promise<void>((resolve, reject) => {
          const fd = new FormData();
          fd.append("file", file);
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/podcast/upload-audio");
          xhr.upload.addEventListener("progress", (ev) => {
            if (ev.lengthComputable) {
              setAudioUploadProgress(Math.round((ev.loaded / ev.total) * 100));
            }
          });
          xhr.addEventListener("load", () => {
            try {
              const data = JSON.parse(xhr.responseText) as {
                audioUrl?: string;
                fileName?: string;
                fileSize?: number;
                message?: string;
              };
              if (xhr.status >= 200 && xhr.status < 300 && data.audioUrl) {
                setEditAudioUrl(data.audioUrl);
                setEditAudioFileName(data.fileName ?? file.name);
                setEditAudioFileSize(data.fileSize ?? file.size);
                resolve();
              } else {
                reject(new Error(data.message ?? "MP3-Upload fehlgeschlagen."));
              }
            } catch {
              reject(new Error("Ungültige Serverantwort."));
            }
          });
          xhr.addEventListener("error", () => reject(new Error("Netzwerkfehler beim Upload.")));
          xhr.addEventListener("timeout", () => reject(new Error("Timeout beim Upload.")));
          xhr.timeout = 10 * 60 * 1000;
          xhr.send(fd);
        });
      } else {
        const CHUNK_SIZE = 10 * 1024 * 1024;
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunkBlob = file.slice(start, end);

          const fd = new FormData();
          fd.append("uploadId", uploadId);
          fd.append("chunkIndex", String(i));
          fd.append("totalChunks", String(totalChunks));
          fd.append("originalName", file.name);
          fd.append("fileSize", String(file.size));
          fd.append("mimeType", file.type || "audio/mpeg");
          fd.append("chunk", chunkBlob, file.name);

          const res = await fetch("/api/podcast/upload-audio", {
            method: "POST",
            body: fd,
          });
          const data = (await res.json()) as {
            audioUrl?: string;
            fileName?: string;
            fileSize?: number;
            message?: string;
          };
          if (!res.ok) {
            throw new Error(data.message ?? "MP3-Chunk-Upload fehlgeschlagen.");
          }
          setAudioUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
          if (i === totalChunks - 1 && data.audioUrl) {
            setEditAudioUrl(data.audioUrl);
            setEditAudioFileName(data.fileName ?? file.name);
            setEditAudioFileSize(data.fileSize ?? file.size);
          }
        }
      }
    } catch (err) {
      setAudioUploadError(err instanceof Error ? err.message : "MP3-Upload fehlgeschlagen.");
    } finally {
      setAudioUploading(false);
      setAudioUploadProgress(0);
    }
  };

  /* ── Vorschaubild-Upload ── */
  const handleCoverUpload = async (file: File) => {
    setCoverUploadError("");
    if (!file.type.startsWith("image/")) {
      setCoverUploadError("Bitte eine Bilddatei auswählen.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setCoverUploadError("Das Vorschaubild darf maximal 10 MB groß sein.");
      return;
    }
    setCoverUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/podcast/upload-image", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as { imageUrl?: string; message?: string };
      if (!res.ok || !data.imageUrl) {
        throw new Error(data.message ?? "Vorschaubild-Upload fehlgeschlagen.");
      }
      setEditCoverUrl(data.imageUrl);
    } catch (err) {
      setCoverUploadError(err instanceof Error ? err.message : "Vorschaubild-Upload fehlgeschlagen.");
    } finally {
      setCoverUploading(false);
    }
  };

  /* ── Folge speichern ── */
  const handleSaveFolge = async () => {
    if (!editTitle.trim()) { setFolgeSaveStatus("Titel ist erforderlich."); return; }
    setFolgeSaving(true);
    setFolgeSaveStatus("");
    const payload = {
      title: editTitle.trim(),
      text: editText.trim(),
      youtubeUrl: editYoutubeUrl.trim(),
      audioUrl: editAudioUrl.trim(),
      audioFileName: editAudioFileName.trim(),
      audioFileSize: editAudioFileSize,
      coverUrl: editCoverUrl.trim(),
      linkedProfiles: editLinkedProfiles.map((p) => ({
        username: p.username,
        profileType: p.profileType,
      })),
      published: editPublished,
    };
    try {
      let res: Response;
      if (editId) {
        res = await fetch(`/api/podcast/folgen/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/podcast/folgen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      const data = (await res.json()) as { message?: string };
      if (res.ok) {
        setFolgeSaveStatus("Gespeichert.");
        closeForm();
        void loadFolgen();
      } else {
        setFolgeSaveStatus(data.message ?? "Fehler beim Speichern.");
      }
    } finally {
      setFolgeSaving(false);
    }
  };

  /* ── Folge löschen ── */
  const handleDelete = async (id: string) => {
    if (!window.confirm("Folge wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) return;
    await fetch(`/api/podcast/folgen?id=${id}`, { method: "DELETE" });
    void loadFolgen();
  };

  /* ── Veröffentlichungsstatus schnell umschalten ── */
  const togglePublished = async (f: Folge) => {
    await fetch(`/api/podcast/folgen/${f._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !f.published }),
    });
    void loadFolgen();
  };

  /* ── Zugriffskontrolle ── */
  if (isAdmin === null) return <div className="p-8 text-sm text-gray-500">Wird geladen …</div>;
  if (!isAdmin) return <div className="p-8 text-sm text-red-600">Kein Zugriff.</div>;

  return (
    <div className="w-[min(1100px,100%)] mx-auto px-4 py-8 flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <Link href="/admin" className="btn btn-sm font-sans" title="Zurück zur Admin-Zentrale">
            ← Admin
          </Link>
          <h1 className="text-xl font-bold m-0">Podcast-Verwaltung</h1>
        </div>
      </div>

      {/* Tab-Switcher */}
      <div className="flex gap-2 border-b border-gray-200 pb-0">
        {(["startseite", "folgen"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t
                ? "border-arena-blue text-arena-blue"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t === "startseite" ? "Startseite" : "Folgen"}
          </button>
        ))}
      </div>

      {/* ── Tab: Startseite ── */}
      {tab === "startseite" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-500">
            Gestalte die Einführungsseite des Podcasts. Dieser Inhalt erscheint ganz oben auf <strong>/podcast</strong>.
          </p>
          <div>
            <label className="block mb-1 text-sm font-medium">Inhalt</label>
            <EditorToolbar editor={editor} htmlMode={htmlMode} onToggleHtml={toggleHtmlMode} />
            {htmlMode ? (
              <textarea
                value={htmlSource}
                onChange={(e) => setHtmlSource(e.target.value)}
                className="w-full min-h-[300px] p-4 border border-gray-300 rounded-b-lg font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y"
              />
            ) : (
              <div className="border border-gray-300 rounded-b-lg bg-white">
                <EditorContent editor={editor} />
              </div>
            )}
          </div>
          {startSaveStatus && (
            <p className={`text-sm ${startSaveStatus === "Gespeichert." ? "text-green-700" : "text-red-600"}`}>
              {startSaveStatus}
            </p>
          )}
          <div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveStartseite}
              disabled={startSaving}
            >
              {startSaving ? "Speichert …" : "Startseite speichern"}
            </button>
          </div>
        </div>
      )}

      {/* ── Tab: Folgen ── */}
      {tab === "folgen" && (
        <div className="flex flex-col gap-4">
          {/* Formular */}
          {showForm && (
            <div className="border border-gray-200 rounded-xl p-5 bg-gray-50 flex flex-col gap-4">
              <h2 className="text-base font-semibold">{editId ? "Folge bearbeiten" : "Neue Folge"}</h2>

              <div>
                <label className="block mb-1 text-sm font-medium">Titel</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="input w-full"
                  placeholder="Titel der Folge …"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium">Beschreibung</label>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={4}
                  className="input w-full resize-y text-sm"
                  placeholder="Kurze Beschreibung der Folge …"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium">YouTube-Link (optional)</label>
                <input
                  type="url"
                  value={editYoutubeUrl}
                  onChange={(e) => setEditYoutubeUrl(e.target.value)}
                  className="input w-full"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                {editYoutubeUrl && extractYoutubeId(editYoutubeUrl) && (
                  <p className="text-xs text-green-700 mt-1">
                    Video-ID erkannt: <code>{extractYoutubeId(editYoutubeUrl)}</code>
                  </p>
                )}
                {editYoutubeUrl && !extractYoutubeId(editYoutubeUrl) && (
                  <p className="text-xs text-red-600 mt-1">Ungültiger YouTube-Link.</p>
                )}
              </div>

              {/* ── MP3-Upload ── */}
              <div className="border border-gray-200 rounded-lg p-3.5 bg-white flex flex-col gap-2">
                <label className="text-sm font-medium">Podcast-Audio (MP3)</label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept=".mp3,audio/mpeg"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleAudioUpload(f);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={audioUploading}
                    onClick={() => audioInputRef.current?.click()}
                  >
                    {audioUploading
                      ? `Lädt hoch … ${audioUploadProgress}%`
                      : editAudioUrl
                        ? "MP3 ersetzen"
                        : "MP3 hochladen"}
                  </button>
                  <span className="text-xs text-gray-500">Max. 250 MB (.mp3)</span>
                </div>
                {audioUploading && (
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-arena-blue transition-all duration-200"
                      style={{ width: `${audioUploadProgress}%` }}
                    />
                  </div>
                )}
                {audioUploadError && (
                  <p className="text-xs text-red-600 m-0">{audioUploadError}</p>
                )}
                {editAudioUrl && (
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
                      <span className="truncate">
                        {editAudioFileName || "MP3 hochgeladen"}
                        {editAudioFileSize > 0 && ` (${formatBytes(editAudioFileSize)})`}
                      </span>
                      <button
                        type="button"
                        className="text-red-600 hover:underline flex-shrink-0"
                        onClick={() => {
                          setEditAudioUrl("");
                          setEditAudioFileName("");
                          setEditAudioFileSize(0);
                        }}
                      >
                        Entfernen
                      </button>
                    </div>
                    <audio controls className="w-full h-9" src={editAudioUrl} />
                  </div>
                )}
              </div>

              {/* ── Vorschaubild-Upload ── */}
              <div className="border border-gray-200 rounded-lg p-3.5 bg-white flex flex-col gap-2">
                <label className="text-sm font-medium">Vorschaubild</label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleCoverUpload(f);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={coverUploading}
                    onClick={() => coverInputRef.current?.click()}
                  >
                    {coverUploading
                      ? "Lädt hoch …"
                      : editCoverUrl
                        ? "Vorschaubild ersetzen"
                        : "Vorschaubild hochladen"}
                  </button>
                  <span className="text-xs text-gray-500">JPEG, PNG, WebP oder GIF (max. 10 MB)</span>
                </div>
                {coverUploadError && (
                  <p className="text-xs text-red-600 m-0">{coverUploadError}</p>
                )}
                {editCoverUrl && (
                  <div className="flex items-start gap-3 pt-1">
                    <img
                      src={editCoverUrl}
                      alt="Vorschaubild"
                      className="w-32 h-20 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline"
                      onClick={() => setEditCoverUrl("")}
                    >
                      Entfernen
                    </button>
                  </div>
                )}
              </div>

              {/* ── Verlinkte Profile ── */}
              <div className="border border-gray-200 rounded-lg p-3.5 bg-white flex flex-col gap-2.5">
                <label className="text-sm font-medium">Verlinkte Profile (optional)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={profileSearchQuery}
                    onChange={(e) => setProfileSearchQuery(e.target.value)}
                    placeholder="Profil suchen (Name oder Benutzername) …"
                    className="input w-full text-sm"
                  />
                  {(profileSearching || profileSearchResults.length > 0) && profileSearchQuery.trim() && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {profileSearching && (
                        <div className="px-3 py-2 text-xs text-gray-500">Suche …</div>
                      )}
                      {!profileSearching && profileSearchResults.map((u) => (
                        <button
                          key={u.username}
                          type="button"
                          onClick={() => addLinkedProfile(u)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2.5 border-b last:border-b-0 border-gray-100"
                        >
                          {u.profileImage ? (
                            <img
                              src={u.profileImage}
                              alt={u.displayName}
                              className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-gray-200"
                            />
                          ) : (
                            <span className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                              {(u.displayName || u.username).charAt(0).toUpperCase()}
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-800 truncate">{u.displayName}</div>
                            <div className="text-xs text-gray-400 truncate">
                              @{u.username} · {u.availableRoles.map((r) => ROLLE_LABELS[r]).join(", ")}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {!profileSearching && profileSearchQuery.trim().length > 0 && profileSearchResults.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1 mb-0">Keine passenden Profile gefunden.</p>
                  )}
                </div>

                {editLinkedProfiles.length > 0 && (
                  <div className="flex flex-col gap-2 pt-1">
                    {editLinkedProfiles.map((p, idx) => (
                      <div
                        key={`${p.username}-${idx}`}
                        className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {p.profileImage ? (
                            <img
                              src={p.profileImage}
                              alt={p.displayName}
                              className="w-6 h-6 rounded-full object-cover flex-shrink-0 border border-gray-200"
                            />
                          ) : (
                            <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                              {(p.displayName || p.username).charAt(0).toUpperCase()}
                            </span>
                          )}
                          <span className="text-sm font-medium text-gray-800 truncate">{p.displayName}</span>
                          <span className="text-xs text-gray-400 truncate">@{p.username}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <select
                            value={p.profileType}
                            onChange={(e) => updateLinkedProfileRole(idx, e.target.value as KooperationsRolle)}
                            className="input text-xs py-1 px-2"
                          >
                            {ALL_PROFILE_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {ROLLE_LABELS[r]}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => removeLinkedProfile(idx)}
                            className="text-xs text-red-600 hover:underline px-1"
                            title="Entfernen"
                          >
                            Entfernen
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="folge-published"
                  type="checkbox"
                  checked={editPublished}
                  onChange={(e) => setEditPublished(e.target.checked)}
                  className="w-4 h-4 accent-arena-blue"
                />
                <label htmlFor="folge-published" className="text-sm font-medium cursor-pointer">
                  Veröffentlicht
                </label>
              </div>

              {folgeSaveStatus && (
                <p className={`text-sm ${folgeSaveStatus === "Gespeichert." ? "text-green-700" : "text-red-600"}`}>
                  {folgeSaveStatus}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleSaveFolge}
                  disabled={folgeSaving || audioUploading || coverUploading}
                >
                  {folgeSaving ? "Speichert …" : "Speichern"}
                </button>
                <button type="button" className="btn btn-sm" onClick={closeForm}>Abbrechen</button>
              </div>
            </div>
          )}

          {!showForm && (
            <div className="flex justify-end">
              <button type="button" className="btn btn-primary btn-sm" onClick={openNew}>
                Neue Folge
              </button>
            </div>
          )}

          {/* Folgen-Liste */}
          {folgenLoading && <p className="text-sm text-gray-400">Wird geladen …</p>}

          {!folgenLoading && folgen.length === 0 && (
            <p className="text-sm text-gray-400">Noch keine Folgen vorhanden.</p>
          )}

          <div className="flex flex-col gap-3">
            {folgen.map((f) => {
              const ytId = extractYoutubeId(f.youtubeUrl);
              return (
                <div key={f._id} className="border border-gray-200 rounded-xl p-4 bg-white flex flex-col gap-2 shadow-sm">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3 min-w-0">
                      {f.coverUrl && (
                        <img
                          src={f.coverUrl}
                          alt={f.title}
                          className="w-20 h-14 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                        />
                      )}
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-semibold text-gray-800 text-sm">{f.title}</span>
                        <span className="text-xs text-gray-400">
                          {formatDate(f.createdAt)} · {f.views} Aufruf{f.views !== 1 ? "e" : ""}
                          {ytId && <> · Video-ID: <code className="font-mono">{ytId}</code></>}
                          {f.audioUrl && (
                            <> · <span className="text-arena-blue font-medium">MP3{f.audioFileSize ? ` (${formatBytes(f.audioFileSize)})` : ""}</span></>
                          )}
                        </span>
                        {f.text && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{f.text}</p>}
                        {f.linkedProfiles && f.linkedProfiles.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {f.linkedProfiles.map((p) => (
                              <span
                                key={`${p.username}-${p.profileType}`}
                                className="inline-flex items-center gap-1 text-[0.7rem] px-2 py-0.5 rounded-full bg-blue-50 text-arena-blue border border-blue-200"
                              >
                                {p.displayName} ({p.roleLabel ?? ROLLE_LABELS[p.profileType]})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => togglePublished(f)}
                        className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-colors ${
                          f.published
                            ? "bg-green-100 text-green-800 border-green-300 hover:bg-green-200"
                            : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200"
                        }`}
                      >
                        {f.published ? "Veröffentlicht" : "Entwurf"}
                      </button>
                      <button type="button" className="btn btn-sm" onClick={() => openEdit(f)}>Bearbeiten</button>
                      <button
                        type="button"
                        className="btn btn-sm text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => handleDelete(f._id)}
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
