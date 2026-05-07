"use client";

import { cn } from "@/lib/utils";
import {
  Activity,
  Bell,
  Building2,
  ChevronRight,
  FileText,
  Handshake,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Kanban,
  Menu,
  MessageCircle,
  MessageSquare,
  Package,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  UserCircle2,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { Session } from "next-auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { HeaderThemeToggle, ThemeToggle } from "./ThemeToggle";

type NavItem = { href: string; label: string; icon: React.ElementType; badge?: string | number };
type NavGroup = { title: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    title: "Main",
    items: [
      { href: "/dashboard",                 label: "Overview",          icon: LayoutDashboard },
      { href: "/dashboard/pipeline",        label: "Sales Pipeline",    icon: Kanban },
      { href: "/dashboard/service-pipeline",label: "Service Pipeline",  icon: Wrench },
    ],
  },
  {
    title: "Sales & CRM",
    items: [
      { href: "/dashboard/accounts",   label: "Clients",    icon: Building2 },
      { href: "/dashboard/contacts",   label: "Contacts",   icon: Users },
      { href: "/dashboard/deals",      label: "Deals",      icon: Handshake },
      { href: "/dashboard/activities", label: "Activities", icon: ListTodo },
      { href: "/dashboard/employees",  label: "Employees",  icon: UserCircle2 },
    ],
  },
  {
    title: "Finance & Ops",
    items: [
      { href: "/dashboard/invoices",   label: "Invoices",   icon: FileText },
      { href: "/dashboard/inventory",  label: "Inventory",  icon: Package },
    ],
  },
  {
    title: "Communication",
    items: [
      { href: "/dashboard/messages",    label: "Team Chat",   icon: MessageSquare },
      { href: "/dashboard/client-chat", label: "Client Chat", icon: MessageCircle },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default function Layout({
  session,
  children,
}: {
  session: Session | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const publicPaths = ["/login", "/register", "/forgot-password", "/reset-password", "/auth"];
  const isPublic = pathname && publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isPublic) return <>{children}</>;
  if (!session?.user) return <>{children}</>;

  const linkActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || Boolean(pathname?.startsWith(`${href}/`));
  };

  const userInitials = session.user?.name
    ? session.user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const pageLabel = pathname === "/dashboard"
    ? "Today's snapshot"
    : pathname?.replace("/dashboard/", "").split("/").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" › ") ?? "";

  const NavContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-col gap-5 px-2.5">
      {navGroups.map((group) => (
        <div key={group.title}>
          <p className="mb-1.5 px-2 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600 select-none">
            {group.title}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map(({ href, label, icon: Icon, badge }) => {
              const active = linkActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150",
                    active
                      ? "bg-teal-500/12 text-teal-300"
                      : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
                  )}
                >
                  {/* Left accent bar */}
                  {active && (
                    <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-teal-400 to-emerald-500 shadow-[0_0_8px_rgba(45,212,191,0.6)]" />
                  )}

                  {/* Icon container */}
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-all duration-150",
                      active
                        ? "bg-gradient-to-br from-teal-500/25 to-emerald-500/15 text-teal-300 shadow-[0_0_12px_rgba(45,212,191,0.2)]"
                        : "text-zinc-500 group-hover:text-zinc-300",
                    )}
                  >
                    <Icon className="h-[14px] w-[14px]" strokeWidth={2} />
                  </span>

                  <span className="flex-1 truncate">{label}</span>

                  {badge != null && (
                    <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-teal-500/20 px-1.5 text-[10px] font-bold text-teal-300">
                      {badge}
                    </span>
                  )}
                  {active && (
                    <ChevronRight className="h-3 w-3 shrink-0 text-teal-600/60" strokeWidth={2.5} />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-app-sheen">

      {/* ── Desktop sidebar ─────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] flex-col bg-sidebar border-r border-sidebar-border lg:flex">
        {/* ambient teal top-left glow */}
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_150%_80%_at_0%_0%,rgba(45,212,191,0.09),transparent_55%)]"
          aria-hidden
        />

        {/* Brand header */}
        <div className="relative flex h-[3.75rem] shrink-0 items-center gap-3 border-b border-sidebar-border px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 via-teal-500 to-emerald-600 shadow-[0_0_18px_rgba(45,212,191,0.4)]">
            <Sparkles className="h-[18px] w-[18px] text-white" strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold tracking-tight text-white">Luminar CRM</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="relative h-1.5 w-1.5 rounded-full bg-teal-400 live-dot" />
              <p className="text-[10px] font-medium text-zinc-500">Revenue workspace</p>
            </div>
          </div>
          <ThemeToggle compact />
        </div>

        {/* Search shortcut */}
        <div className="relative px-3.5 pt-3 pb-1.5">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg border border-zinc-800/70 bg-zinc-900/50 px-3 py-2 text-[11.5px] text-zinc-500 transition-all hover:border-zinc-700/80 hover:bg-zinc-900/80 hover:text-zinc-400"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 text-left">Quick search…</span>
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-medium text-zinc-600">⌘K</span>
          </button>
        </div>

        {/* Nav */}
        <div className="relative flex-1 overflow-y-auto py-2 sidebar-scroll">
          <NavContent />
        </div>

        {/* Footer */}
        <div className="relative border-t border-sidebar-border p-3">
          {/* Quick stats */}
          <div className="mb-3 grid grid-cols-2 gap-1.5">
            <div className="flex items-center gap-1.5 rounded-lg bg-zinc-900/60 px-2.5 py-2 ring-1 ring-zinc-800/50">
              <TrendingUp className="h-3 w-3 text-emerald-400" />
              <div className="min-w-0">
                <p className="text-[9px] text-zinc-600 leading-none">Revenue</p>
                <p className="mt-0.5 text-[11px] font-semibold text-zinc-300 leading-none">Active</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-zinc-900/60 px-2.5 py-2 ring-1 ring-zinc-800/50">
              <Activity className="h-3 w-3 text-teal-400" />
              <div className="min-w-0">
                <p className="text-[9px] text-zinc-600 leading-none">Pipeline</p>
                <p className="mt-0.5 text-[11px] font-semibold text-zinc-300 leading-none">On track</p>
              </div>
            </div>
          </div>

          {/* User card */}
          <div className="flex items-center gap-2.5 rounded-lg bg-zinc-900/60 px-3 py-2.5 ring-1 ring-zinc-800/50">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-700 text-[11px] font-bold text-white ring-2 ring-teal-900/60 shadow-[0_0_10px_rgba(45,212,191,0.2)]">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold text-zinc-100 leading-tight">
                {session.user?.name}
              </p>
              <p className="truncate text-[10px] text-zinc-500 leading-tight">
                {session.user?.email}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: "/login" })}
              title="Sign out"
              className="shrink-0 rounded-md p-1.5 text-zinc-600 transition-all hover:bg-red-500/10 hover:text-red-400"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile backdrop ──────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
          aria-hidden
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile drawer ────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(100%,280px)] flex-col bg-sidebar border-r border-sidebar-border shadow-2xl transition-transform duration-200 ease-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 shadow-glow">
              <Sparkles className="h-4 w-4 text-white" strokeWidth={1.8} />
            </div>
            <span className="text-[15px] font-bold text-white">Luminar CRM</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-4 sidebar-scroll">
          <NavContent onNavigate={() => setMobileOpen(false)} />
        </div>
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3 rounded-lg bg-zinc-900/60 px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-700 text-[11px] font-bold text-white">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-zinc-100">{session.user?.name}</p>
              <p className="truncate text-[10px] text-zinc-500">{session.user?.email}</p>
            </div>
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: "/login" })}
              className="shrink-0 rounded-md p-1.5 text-zinc-600 hover:text-red-400"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────── */}
      <div className="flex min-h-screen flex-1 flex-col lg:pl-[240px]">

        {/* Top header */}
        <header className="sticky top-0 z-30 flex h-[3.75rem] shrink-0 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="hidden h-5 w-px bg-border lg:block" />
            <div className="hidden items-center gap-1.5 lg:flex">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <p className="truncate text-[13px] font-medium text-muted-foreground">
                {pageLabel}
              </p>
            </div>
            <p className="truncate text-[14px] font-semibold text-foreground lg:hidden">
            Luminar CRM
            </p>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground sm:flex"
            >
              <Search className="h-3.5 w-3.5" />
              Search
              <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground/70">⌘K</span>
            </button>
            <HeaderThemeToggle />
            <button
              type="button"
              className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-teal-500 ring-2 ring-background shadow-[0_0_6px_rgba(45,212,191,0.7)]" />
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-700 text-[11px] font-bold text-white ring-2 ring-teal-100/20 shadow-[0_0_12px_rgba(45,212,191,0.25)]">
              {userInitials}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
