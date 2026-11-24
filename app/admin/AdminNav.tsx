"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Squares2X2Icon,
  UsersIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  TrophyIcon,
  SparklesIcon,
  GiftIcon,
  NewspaperIcon,
  PencilSquareIcon,
  MicrophoneIcon,
  EnvelopeIcon,
  MusicalNoteIcon,
  DocumentTextIcon,
  FilmIcon,
  ShareIcon,
  ChartBarIcon,
  ArrowTopRightOnSquareIcon,
  ShieldCheckIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import type { LoggedInAccount } from "@/lib/client-account";

export type AdminTab =
  | "overview"
  | "bdw"
  | "analytics"
  | "nachrichten"
  | "buchzirkel"
  | "users"
  | "katalog";

export type AdminCategory =
  | "overview"
  | "community"
  | "content"
  | "social"
  | "actions"
  | "analytics";

export interface AdminTool {
  id: string;
  title: string;
  shortDesc: string;
  category: AdminCategory;
  type: "tab" | "link";
  tabKey?: AdminTab;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  superAdminOnly?: boolean;
}

export const ADMIN_CATEGORIES: {
  id: AdminCategory;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}[] = [
  {
    id: "overview",
    label: "Übersicht",
    shortLabel: "Übersicht",
    icon: Squares2X2Icon,
    description: "Zentrale Übersicht & Schnellzugriff",
  },
  {
    id: "community",
    label: "Community & User",
    shortLabel: "Community",
    icon: UsersIcon,
    description: "Benutzerverwaltung, Buchzirkel & Rundnachrichten",
  },
  {
    id: "content",
    label: "Redaktion & Medien",
    shortLabel: "Redaktion",
    icon: NewspaperIcon,
    description: "News, Blog, Podcasts, Newsletter & Musik",
  },
  {
    id: "social",
    label: "Social Media & Einsendungen",
    shortLabel: "Social Media",
    icon: FilmIcon,
    description: "Buch-Präsentationen, Reels, Galerie & Vorlagen",
  },
  {
    id: "actions",
    label: "Aktionen & Katalog",
    shortLabel: "Aktionen",
    icon: TrophyIcon,
    description: "Buch der Woche, Gewinnspiele, Katalog & KI",
  },
  {
    id: "analytics",
    label: "Statistik & Analyse",
    shortLabel: "Analyse",
    icon: ChartBarIcon,
    description: "Besucherzahlen, Trends, Top-Seiten & Referrer",
  },
];

export const ADMIN_TOOLS: AdminTool[] = [
  // Community & User
  {
    id: "users",
    title: "User-Übersicht",
    shortDesc: "Accounts, Rollen, Moderation, Passwörter & Spam-Schutz",
    category: "community",
    type: "tab",
    tabKey: "users",
    icon: UsersIcon,
  },
  {
    id: "buchzirkel",
    title: "Buchzirkel",
    shortDesc: "Lesezirkel moderieren, Bewerbungen prüfen & Status verwalten",
    category: "community",
    type: "tab",
    tabKey: "buchzirkel",
    icon: BookOpenIcon,
  },
  {
    id: "nachrichten",
    title: "Rundnachrichten",
    shortDesc: "Systemnachrichten & Broadcasts an alle oder Rollen versenden",
    category: "community",
    type: "tab",
    tabKey: "nachrichten",
    icon: ChatBubbleLeftRightIcon,
  },

  // Redaktion & Medien
  {
    id: "news",
    title: "News",
    shortDesc: "Aktuelle Meldungen mit Layouts & Teasern verfassen",
    category: "content",
    type: "link",
    href: "/admin/news",
    icon: NewspaperIcon,
  },
  {
    id: "blog",
    title: "Blog",
    shortDesc: "Community- & Autorenbeiträge sichten, freigeben & bearbeiten",
    category: "content",
    type: "link",
    href: "/admin/blog",
    icon: PencilSquareIcon,
  },
  {
    id: "podcast",
    title: "Podcast",
    shortDesc: "Episoden anlegen, Audiodateien hochladen & verwalten",
    category: "content",
    type: "link",
    href: "/admin/podcast",
    icon: MicrophoneIcon,
  },
  {
    id: "newsletter",
    title: "Newsletter",
    shortDesc: "Kampagnen gestalten, Entwürfe speichern & Abonnenten einsehen",
    category: "content",
    type: "link",
    href: "/admin/newsletter",
    icon: EnvelopeIcon,
  },
  {
    id: "musik",
    title: "Hintergrundmusik",
    shortDesc: "Audiotracks & Playlists für Social Media verwalten",
    category: "content",
    type: "link",
    href: "/admin/musik",
    icon: MusicalNoteIcon,
  },

  // Social Media & Einsendungen
  {
    id: "werbebudget",
    title: "100 € Werbebudget",
    shortDesc: "Monatliche Bewerbungen und Nachweise verwalten",
    category: "social",
    type: "link",
    href: "/admin/werbebudget",
    icon: TrophyIcon,
  },
  {
    id: "einreichungen",
    title: "Buch-Einreichungen",
    shortDesc: "PPTX/PDF-Präsentationen von Autoren prüfen & herunterladen",
    category: "social",
    type: "link",
    href: "/admin/einreichungen",
    icon: DocumentTextIcon,
  },
  {
    id: "reel-einreichungen",
    title: "Reel-Einreichungen",
    shortDesc: "Eingesendete Video-Reels sichten, freigeben oder ablehnen",
    category: "social",
    type: "link",
    href: "/admin/reel-einreichungen",
    icon: FilmIcon,
  },
  {
    id: "social-media",
    title: "Social-Media-Galerie",
    shortDesc: "Galerie-Beiträge & Social Feed steuern",
    category: "social",
    type: "link",
    href: "/admin/social-media",
    icon: ShareIcon,
  },
  {
    id: "social-media-content",
    title: "Fertige Social-Inhalte",
    shortDesc: "Grafiken, Vorlagen & Posting-Inhalte verwalten",
    category: "social",
    type: "link",
    href: "/admin/social-media-content",
    icon: SparklesIcon,
  },

  // Aktionen & Katalog
  {
    id: "bdw",
    title: "Buch der Woche",
    shortDesc: "Gewichtete Zufallsauslosung, Lesezeichen & Gewinner bestimmen",
    category: "actions",
    type: "tab",
    tabKey: "bdw",
    icon: TrophyIcon,
  },
  {
    id: "gewinnspiele",
    title: "Gewinnspiele",
    shortDesc: "Verlosungen, Teilnehmer & Buch-Einreichungen konfigurieren",
    category: "actions",
    type: "link",
    href: "/admin/gewinnspiele",
    icon: GiftIcon,
  },
  {
    id: "katalog",
    title: "Katalog & KI",
    shortDesc: "Katalog-Sichtbarkeit steuern & unbeanspruchte KI-Autoren filtern",
    category: "actions",
    type: "tab",
    tabKey: "katalog",
    icon: SparklesIcon,
  },
  {
    id: "buecher",
    title: "Bücherverwaltung",
    shortDesc: "Alle Bücher filtern und direkt die Detailseiten öffnen",
    category: "actions",
    type: "link",
    href: "/admin/buecher",
    icon: BookOpenIcon,
  },

  // Analyse
  {
    id: "analytics",
    title: "Besucher-Analyse",
    shortDesc: "Tägliche Aufrufe, Unique Visitors, Referrer & Top-Seiten",
    category: "analytics",
    type: "tab",
    tabKey: "analytics",
    icon: ChartBarIcon,
  },
];

interface AdminNavProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  activeCategory: AdminCategory;
  onSelectCategory: (cat: AdminCategory) => void;
  account: LoggedInAccount | null;
}

export function AdminNav({
  currentTab,
  onSelectTab,
  activeCategory,
  onSelectCategory,
  account,
}: AdminNavProps) {
  const router = useRouter();
  const [quickJumpVal, setQuickJumpVal] = useState("");

  const visibleTools = ADMIN_TOOLS.filter(
    (t) => !t.superAdminOnly || account?.username === "Kopernikus" || account?.role === "SUPERADMIN"
  );

  const categoryTools = visibleTools.filter((t) => t.category === activeCategory);

  const handleQuickJump = (val: string) => {
    setQuickJumpVal(val);
    if (!val) return;
    const tool = visibleTools.find((t) => t.id === val);
    if (!tool) return;

    if (tool.type === "tab" && tool.tabKey) {
      onSelectCategory(tool.category);
      onSelectTab(tool.tabKey);
    } else if (tool.type === "link" && tool.href) {
      router.push(tool.href);
    }
    // reset selection
    setTimeout(() => setQuickJumpVal(""), 300);
  };

  return (
    <div className="font-sans mb-6">
      {/* ── Kopfzeile: Titel, Rolle & Schnellwähler ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-arena-border-light">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-arena-blue/10 text-arena-blue flex items-center justify-center border border-arena-blue/15 shadow-xs">
            <ShieldCheckIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-sans text-2xl font-bold text-arena-blue tracking-tight m-0">
                Admin-Zentrale
              </h1>
              {account?.role && (
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-arena-yellow/20 text-arena-blue border border-arena-yellow/40">
                  {account.role}
                </span>
              )}
            </div>
            <p className="text-xs text-arena-muted m-0 mt-0.5">
              Angemeldet als{" "}
              <strong className="text-arena-blue">{account?.username ?? "Admin"}</strong> • Schneller Zugriff auf alle BuchArena-Verwaltungsbereiche
            </p>
          </div>
        </div>

        {/* Direkt-Sprung Dropdown */}
        <div className="relative min-w-[220px] sm:max-w-[280px]">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-arena-border-light bg-slate-50/80 hover:bg-white text-xs transition-colors shadow-2xs">
            <MagnifyingGlassIcon className="w-4 h-4 text-arena-muted shrink-0" />
            <select
              aria-label="Gehe direkt zu Modul"
              value={quickJumpVal}
              onChange={(e) => handleQuickJump(e.target.value)}
              className="bg-transparent border-none text-arena-blue text-xs font-medium focus:outline-hidden w-full cursor-pointer"
            >
              <option value="" disabled>
                Schnellzugriff: Modul wählen…
              </option>
              <option value="overview">🧭 Übersicht (Dashboard)</option>
              <optgroup label="👥 Community & User">
                <option value="users">User-Übersicht</option>
                <option value="buchzirkel">Buchzirkel</option>
                <option value="nachrichten">Rundnachrichten</option>
              </optgroup>
              <optgroup label="✍️ Redaktion & Medien">
                <option value="news">News-Beiträge ↗</option>
                <option value="blog">Blog-Verwaltung ↗</option>
                <option value="podcast">Podcast ↗</option>
                <option value="newsletter">Newsletter ↗</option>
                <option value="musik">Hintergrundmusik ↗</option>
              </optgroup>
              <optgroup label="📱 Social Media & Einsendungen">
                <option value="einreichungen">Buch-Einreichungen (PPTX) ↗</option>
                <option value="reel-einreichungen">Reel-Einreichungen (Videos) ↗</option>
                <option value="social-media">Social-Media-Galerie ↗</option>
                <option value="social-media-content">Fertige Social-Inhalte ↗</option>
              </optgroup>
              <optgroup label="🏆 Aktionen & Katalog">
                <option value="bdw">Buch der Woche</option>
                <option value="gewinnspiele">Gewinnspiele ↗</option>
                <option value="katalog">Katalog & KI</option>
                <option value="buecher">Bücherverwaltung ↗</option>
              </optgroup>
              <optgroup label="📊 Analyse">
                <option value="analytics">Besucher-Analyse</option>
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {/* ── Ebene 1: Haupt-Kategorien ── */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-slate-100/80 border border-slate-200/80 mb-3 shadow-2xs">
        {ADMIN_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          const count = visibleTools.filter((t) => t.category === cat.id).length;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                onSelectCategory(cat.id);
                if (cat.id === "overview") {
                  onSelectTab("overview");
                } else if (cat.id === "community" && currentTab !== "users" && currentTab !== "buchzirkel" && currentTab !== "nachrichten") {
                  onSelectTab("users");
                } else if (cat.id === "actions" && currentTab !== "bdw" && currentTab !== "katalog") {
                  onSelectTab("bdw");
                } else if (cat.id === "analytics") {
                  onSelectTab("analytics");
                }
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                isActive
                  ? "bg-white text-arena-blue shadow-xs border border-slate-200/90 font-bold"
                  : "text-slate-600 hover:text-arena-blue hover:bg-white/60 border border-transparent"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-arena-blue" : "text-slate-400"}`} />
              <span>{cat.shortLabel}</span>
              {count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? "bg-arena-blue/10 text-arena-blue" : "bg-slate-200/70 text-slate-500"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Ebene 2: Werkzeuge der aktiven Kategorie ── */}
      {activeCategory !== "overview" && (
        <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-white border border-arena-border-light shadow-2xs">
          <span className="text-[11px] font-bold text-arena-muted uppercase tracking-wider px-1 shrink-0">
            Werkzeuge:
          </span>

          {categoryTools.map((tool) => {
            const Icon = tool.icon;
            const isTabActive = tool.type === "tab" && currentTab === tool.tabKey;

            if (tool.type === "tab" && tool.tabKey) {
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => onSelectTab(tool.tabKey!)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                    isTabActive
                      ? "bg-arena-blue text-white shadow-xs font-bold"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-arena-blue border border-slate-200"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isTabActive ? "text-arena-yellow" : "text-slate-500"}`} />
                  <span>{tool.title}</span>
                </button>
              );
            }

            return (
              <Link
                key={tool.id}
                href={tool.href || "#"}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-arena-blue border border-slate-200 transition-all duration-150 group"
              >
                <Icon className="w-3.5 h-3.5 text-slate-500 group-hover:text-arena-blue shrink-0" />
                <span>{tool.title}</span>
                <ArrowTopRightOnSquareIcon className="w-3 h-3 text-slate-400 group-hover:text-arena-blue shrink-0 opacity-70" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface AdminOverviewDashboardProps {
  onSelectTab: (tab: AdminTab) => void;
  onSelectCategory: (cat: AdminCategory) => void;
  account: LoggedInAccount | null;
  stats: {
    totalUsers: number;
    authorsCount: number;
    totalBuchzirkel: number;
    nextDraw?: string;
    bdwTitle?: string;
    todayViews?: number;
    spamCount?: number;
  };
}

export function AdminOverviewDashboard({
  onSelectTab,
  onSelectCategory,
  account,
  stats,
}: AdminOverviewDashboardProps) {
  const router = useRouter();

  const visibleTools = ADMIN_TOOLS.filter(
    (t) => !t.superAdminOnly || account?.username === "Kopernikus" || account?.role === "SUPERADMIN"
  );

  return (
    <div className="grid gap-6 font-sans">
      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* KPI: Community */}
        <div
          onClick={() => {
            onSelectCategory("community");
            onSelectTab("users");
          }}
          className="p-3.5 rounded-xl border border-blue-200/80 bg-blue-50/40 hover:bg-blue-50/80 transition-all cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-xs font-semibold">Community & User</span>
            <UsersIcon className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-arena-blue tracking-tight">
            {stats.totalUsers}
          </div>
          <p className="text-[11px] text-slate-600 m-0 mt-0.5">
            {stats.authorsCount} Autoren • {stats.totalBuchzirkel} Buchzirkel
          </p>
        </div>

        {/* KPI: Buch der Woche */}
        <div
          onClick={() => {
            onSelectCategory("actions");
            onSelectTab("bdw");
          }}
          className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/40 hover:bg-amber-50/80 transition-all cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <span className="text-xs font-semibold">Buch der Woche</span>
            <TrophyIcon className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-sm font-bold text-arena-blue truncate tracking-tight">
            {stats.bdwTitle ? `„${stats.bdwTitle}“` : "Aktiv"}
          </div>
          <p className="text-[11px] text-amber-900/80 m-0 mt-0.5 truncate">
            Ziehung: {stats.nextDraw || "Sonntag"}
          </p>
        </div>

        {/* KPI: Sicherheit / Spam */}
        <div
          onClick={() => {
            onSelectCategory("community");
            onSelectTab("users");
          }}
          className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center justify-between text-slate-700 mb-1">
            <span className="text-xs font-semibold">Sicherheit</span>
            <ShieldCheckIcon className="w-4 h-4 text-slate-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-arena-blue tracking-tight">
            {stats.spamCount ?? 0}
          </div>
          <p className="text-[11px] text-slate-500 m-0 mt-0.5">
            Spam-Verdachtsfälle markiert
          </p>
        </div>

        {/* KPI: Analyse */}
        <div
          onClick={() => {
            onSelectCategory("analytics");
            onSelectTab("analytics");
          }}
          className="p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/40 hover:bg-emerald-50/80 transition-all cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-xs font-semibold">Besucher heute</span>
            <ChartBarIcon className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-arena-blue tracking-tight">
            {stats.todayViews !== undefined ? stats.todayViews : "–"}
          </div>
          <p className="text-[11px] text-emerald-800/80 m-0 mt-0.5">
            Klick für detaillierte Analyse
          </p>
        </div>
      </div>

      {/* ── Themenbereiche als übersichtliche Karten ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ADMIN_CATEGORIES.filter((c) => c.id !== "overview").map((cat) => {
          const CatIcon = cat.icon;
          const tools = visibleTools.filter((t) => t.category === cat.id);

          return (
            <div
              key={cat.id}
              className="rounded-xl border border-arena-border-light bg-white p-4 shadow-xs flex flex-col justify-between"
            >
              <div>
                {/* Header des Fachbereichs */}
                <div className="flex items-center justify-between gap-2 pb-2.5 mb-3 border-b border-arena-border-light">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-arena-blue/10 text-arena-blue flex items-center justify-center">
                      <CatIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-arena-blue m-0">
                        {cat.label}
                      </h2>
                      <p className="text-[11px] text-arena-muted m-0">
                        {cat.description}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-arena-muted bg-slate-100 px-2 py-0.5 rounded-full">
                    {tools.length} Module
                  </span>
                </div>

                {/* Raster der Werkzeuge */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {tools.map((tool) => {
                    const ToolIcon = tool.icon;
                    const isTab = tool.type === "tab";

                    const handleClick = () => {
                      if (isTab && tool.tabKey) {
                        onSelectCategory(tool.category);
                        onSelectTab(tool.tabKey);
                      } else if (tool.href) {
                        router.push(tool.href);
                      }
                    };

                    return (
                      <div
                        key={tool.id}
                        onClick={handleClick}
                        className="p-2.5 rounded-lg border border-slate-200/90 hover:border-arena-blue/40 bg-slate-50/60 hover:bg-blue-50/30 transition-all cursor-pointer group flex flex-col justify-between"
                      >
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <div className="flex items-center gap-1.5">
                            <ToolIcon className="w-3.5 h-3.5 text-slate-500 group-hover:text-arena-blue shrink-0" />
                            <span className="text-xs font-bold text-arena-blue group-hover:underline">
                              {tool.title}
                            </span>
                          </div>
                          {isTab ? (
                            <span className="text-[10px] font-semibold text-slate-400 group-hover:text-arena-blue shrink-0">
                              Tab →
                            </span>
                          ) : (
                            <ArrowTopRightOnSquareIcon className="w-3 h-3 text-slate-400 group-hover:text-arena-blue shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 m-0 line-clamp-2 leading-tight">
                          {tool.shortDesc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Reusable Header für Subpages (/admin/news, /admin/blog, etc.)
 */
export function AdminSubpageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 pb-3 mb-4 border-b border-arena-border-light font-sans">
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-arena-blue bg-slate-100 hover:bg-slate-200 transition-colors"
          title="Zurück zum Admin-Dashboard"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          <span>Admin-Zentrale</span>
        </Link>
        <span className="text-slate-300">/</span>
        <div>
          <h1 className="font-sans text-xl font-bold text-arena-blue tracking-tight m-0">
            {title}
          </h1>
          {subtitle && (
            <p className="font-sans text-xs text-arena-muted m-0 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
