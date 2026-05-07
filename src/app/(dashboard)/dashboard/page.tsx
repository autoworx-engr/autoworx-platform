import { CrmPageHeader } from "@/components/crm/page-header";
import { LOW_STOCK_THRESHOLD } from "@/lib/crm-constants";
import {
  activeAccountWhere,
  activeContactWhere,
  activeDealWhere,
  activeInvoiceWhere,
  activeProductWhere,
} from "@/lib/crm-scope";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { requireSession } from "@/lib/require-session";
import { DealStage, InvoiceStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  FileText,
  Handshake,
  Package,
  Target,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Overview" };

const activityTypeConfig: Record<string, { icon: LucideIcon; bg: string; text: string }> = {
  CALL:    { icon: Activity,      bg: "bg-blue-100 dark:bg-blue-950/60",   text: "text-blue-600 dark:text-blue-400" },
  EMAIL:   { icon: FileText,      bg: "bg-violet-100 dark:bg-violet-950/60", text: "text-violet-600 dark:text-violet-400" },
  MEETING: { icon: Users,         bg: "bg-teal-100 dark:bg-teal-950/60",   text: "text-teal-600 dark:text-teal-400" },
  TASK:    { icon: ClipboardList, bg: "bg-amber-100 dark:bg-amber-950/60", text: "text-amber-600 dark:text-amber-400" },
  NOTE:    { icon: FileText,      bg: "bg-zinc-100 dark:bg-zinc-800",      text: "text-zinc-500 dark:text-zinc-400" },
};

export default async function DashboardHomePage() {
  const session = await requireSession();
  const companyId = session.user.companyId;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    accounts, contacts, openDeals, activitiesDue,
    openRows, wonAgg, recentActivities, lowStockSkus,
    arSent, draftInvoiceCount,
  ] = await Promise.all([
    db.crmAccount.count({ where: { companyId, ...activeAccountWhere } }),
    db.contact.count({ where: { companyId, ...activeContactWhere } }),
    db.deal.count({ where: { companyId, ...activeDealWhere, stage: { notIn: [DealStage.WON, DealStage.LOST] } } }),
    db.activity.count({ where: { companyId, completedAt: null, dueAt: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } } }),
    db.deal.findMany({ where: { companyId, ...activeDealWhere, stage: { notIn: [DealStage.WON, DealStage.LOST] } }, select: { value: true, probability: true } }),
    db.deal.aggregate({ where: { companyId, ...activeDealWhere, stage: DealStage.WON, closedAt: { gte: monthStart } }, _sum: { value: true } }),
    db.activity.findMany({ where: { companyId }, orderBy: { createdAt: "desc" }, take: 8, include: { user: true, deal: { select: { id: true, title: true } } } }),
    db.product.count({ where: { companyId, ...activeProductWhere, qtyOnHand: { lte: LOW_STOCK_THRESHOLD } } }),
    db.invoice.aggregate({ where: { companyId, ...activeInvoiceWhere, status: InvoiceStatus.SENT }, _sum: { total: true } }),
    db.invoice.count({ where: { companyId, ...activeInvoiceWhere, status: InvoiceStatus.DRAFT } }),
  ]);

  const weightedPipeline = openRows.reduce((s, d) => s + (d.value != null ? Number(d.value) : 0) * ((d.probability ?? 0) / 100), 0);
  const rawPipe         = openRows.reduce((s, d) => s + (d.value != null ? Number(d.value) : 0), 0);
  const wonMtd          = wonAgg._sum.value != null ? Number(wonAgg._sum.value) : 0;
  const arSentTotal     = arSent._sum.total != null ? Number(arSent._sum.total) : 0;

  return (
    <div className="animate-fade-up space-y-7">
      <CrmPageHeader
        title="Overview"
        description="Pipeline, revenue, billing, inventory signals and latest activity at a glance."
      />

      {/* ── Primary KPI strip ──────────────────────────────── */}
      <section>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Key metrics
        </p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Accounts"
            value={accounts}
            icon={Building2}
            gradient="from-blue-500/10 via-blue-500/5 to-transparent"
            iconBg="bg-blue-500/10 dark:bg-blue-500/15"
            iconColor="text-blue-600 dark:text-blue-400"
            border="border-blue-200/60 dark:border-blue-900/50"
            glow="dark:shadow-[0_0_32px_rgba(59,130,246,0.08)]"
            href="/dashboard/accounts"
          />
          <StatCard
            label="Contacts"
            value={contacts}
            icon={Users}
            gradient="from-violet-500/10 via-violet-500/5 to-transparent"
            iconBg="bg-violet-500/10 dark:bg-violet-500/15"
            iconColor="text-violet-600 dark:text-violet-400"
            border="border-violet-200/60 dark:border-violet-900/50"
            glow="dark:shadow-[0_0_32px_rgba(139,92,246,0.08)]"
            href="/dashboard/contacts"
          />
          <StatCard
            label="Open Deals"
            value={openDeals}
            icon={Handshake}
            gradient="from-teal-500/10 via-teal-500/5 to-transparent"
            iconBg="bg-teal-500/10 dark:bg-teal-500/15"
            iconColor="text-teal-600 dark:text-teal-400"
            border="border-teal-200/60 dark:border-teal-900/50"
            glow="dark:shadow-[0_0_32px_rgba(20,184,166,0.1)]"
            href="/dashboard/deals"
          />
          <StatCard
            label="Due in 7 Days"
            value={activitiesDue}
            icon={ClipboardList}
            gradient={activitiesDue > 0 ? "from-amber-500/12 via-amber-500/5 to-transparent" : "from-zinc-500/5 to-transparent"}
            iconBg={activitiesDue > 0 ? "bg-amber-500/12 dark:bg-amber-500/15" : "bg-zinc-100 dark:bg-zinc-800"}
            iconColor={activitiesDue > 0 ? "text-amber-600 dark:text-amber-400" : "text-zinc-400"}
            border={activitiesDue > 0 ? "border-amber-200/60 dark:border-amber-900/50" : "border-border"}
            glow={activitiesDue > 0 ? "dark:shadow-[0_0_32px_rgba(245,158,11,0.08)]" : ""}
            href="/dashboard/activities"
            alert={activitiesDue > 0}
          />
        </div>
      </section>

      {/* ── Revenue strip ──────────────────────────────────── */}
      <section>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Pipeline & revenue
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <RevenueCard
            label="Open Pipeline"
            sublabel="Total open deal value"
            value={formatMoney(rawPipe)}
            icon={Target}
            accent="zinc"
          />
          <RevenueCard
            label="Weighted Forecast"
            sublabel="Value × probability"
            value={formatMoney(weightedPipeline)}
            icon={TrendingUp}
            accent="teal"
            highlight
          />
          <RevenueCard
            label="Won This Month"
            sublabel="Closed-won (MTD)"
            value={formatMoney(wonMtd)}
            icon={CheckCircle2}
            accent="emerald"
          />
        </div>
      </section>

      {/* ── Alerts strip ───────────────────────────────────── */}
      <section>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Alerts & billing
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <AlertCard
            label="Low Stock SKUs"
            sublabel={`≤ ${LOW_STOCK_THRESHOLD} units on hand`}
            value={lowStockSkus}
            href="/dashboard/inventory"
            linkLabel="View inventory"
            icon={Package}
            warn={lowStockSkus > 0}
          />
          <AlertCard
            label="AR Outstanding"
            sublabel="Sent & awaiting payment"
            value={formatMoney(arSentTotal)}
            href="/dashboard/invoices?status=SENT"
            linkLabel="Open register"
            icon={DollarSign}
            warn={false}
          />
          <AlertCard
            label="Draft Invoices"
            sublabel="Awaiting finalisation"
            value={draftInvoiceCount}
            href="/dashboard/invoices?status=DRAFT"
            linkLabel="Finish billing"
            icon={FileText}
            warn={draftInvoiceCount > 0}
          />
        </div>
      </section>

      {/* ── Recent activity feed ───────────────────────────── */}
      <section>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card dark:shadow-card-dark">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/40">
                <Activity className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              </div>
              <h2 className="text-[14px] font-semibold text-foreground">Recent Activity</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {recentActivities.length}
              </span>
            </div>
            <Link
              href="/dashboard/activities"
              className="flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
            >
              Full log
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Rows */}
          {recentActivities.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14">
              <Activity className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No activity logged yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentActivities.map((a) => {
                const cfg = activityTypeConfig[a.type] ?? activityTypeConfig.NOTE;
                const TypeIcon = cfg.icon;
                const initials = `${a.user.firstName?.[0] ?? ""}${a.user.lastName?.[0] ?? ""}`.toUpperCase();
                return (
                  <div
                    key={a.id}
                    className="flex items-start gap-4 px-5 py-3.5 transition-colors hover:bg-muted/30"
                  >
                    {/* Type icon */}
                    <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", cfg.bg, cfg.text)}>
                      <TypeIcon className="h-3.5 w-3.5" strokeWidth={2} />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-foreground leading-snug">{a.subject}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {a.type}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/40 text-[8px] font-bold text-teal-700 dark:text-teal-400">
                            {initials}
                          </span>
                          {a.user.firstName} {a.user.lastName ?? ""}
                        </div>
                        <span className="text-[11px] text-muted-foreground/50">·</span>
                        <span className="text-[11px] text-muted-foreground">{formatDate(a.createdAt)}</span>
                      </div>
                    </div>

                    {/* Deal link */}
                    {a.deal ? (
                      <Link
                        href={`/dashboard/deals/${a.deal.id}`}
                        className="mt-0.5 shrink-0 flex items-center gap-1 rounded-md border border-teal-200/60 dark:border-teal-800/40 bg-teal-50/60 dark:bg-teal-900/20 px-2 py-1 text-[11px] font-medium text-teal-700 dark:text-teal-400 transition-colors hover:bg-teal-100/60 dark:hover:bg-teal-900/40"
                      >
                        {a.deal.title}
                        <ArrowUpRight className="h-2.5 w-2.5" />
                      </Link>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────────────────────── */

function StatCard({
  label, value, icon: Icon, gradient, iconBg, iconColor, border, glow, href, alert,
}: {
  label: string; value: number; icon: LucideIcon;
  gradient: string; iconBg: string; iconColor: string;
  border: string; glow: string; href: string; alert?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-card-hover",
        "shadow-card dark:shadow-card-dark",
        border, glow,
      )}
    >
      {/* Gradient wash */}
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", gradient)} />

      <div className="relative p-5">
        <div className="mb-4 flex items-start justify-between">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", iconBg)}>
            <Icon className={cn("h-5 w-5", iconColor)} strokeWidth={1.75} />
          </div>
          <div className="flex items-center gap-1.5">
            {alert && (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" strokeWidth={2} />
            )}
            <ArrowUpRight className="h-4 w-4 text-muted-foreground/30 transition-colors group-hover:text-primary" />
          </div>
        </div>

        {/* Big number */}
        <p className={cn(
          "text-[2.25rem] font-bold tabular-nums leading-none tracking-tight text-foreground",
          "group-hover:text-gradient-teal transition-all duration-200",
        )}>
          {value.toLocaleString()}
        </p>

        <p className="mt-2 text-[12px] font-medium text-muted-foreground">{label}</p>

        {/* Hover reveal */}
        <p className="mt-2 text-[11px] font-semibold text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          View all →
        </p>
      </div>
    </Link>
  );
}

function RevenueCard({
  label, sublabel, value, icon: Icon, accent, highlight,
}: {
  label: string; sublabel: string; value: string; icon: LucideIcon;
  accent: "zinc" | "teal" | "emerald"; highlight?: boolean;
}) {
  const styles = {
    zinc:    { icon: "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400", val: "text-foreground", border: "border-border", bg: "" },
    teal:    { icon: "bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400", val: "text-teal-700 dark:text-teal-300", border: "border-teal-200/60 dark:border-teal-800/40", bg: "bg-gradient-to-br from-teal-50/60 to-transparent dark:from-teal-900/10 dark:to-transparent" },
    emerald: { icon: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400", val: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200/60 dark:border-emerald-800/40", bg: "" },
  };
  const s = styles[accent];

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border bg-card p-5 shadow-card dark:shadow-card-dark",
      s.border,
      highlight && "ring-1 ring-teal-300/40 dark:ring-teal-700/30 dark:shadow-[0_0_40px_rgba(20,184,166,0.08)]",
    )}>
      {highlight && <div className={cn("pointer-events-none absolute inset-0", s.bg)} />}

      <div className="relative">
        <div className={cn("mb-3 flex h-9 w-9 items-center justify-center rounded-xl", s.icon)}>
          <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
        </div>
        <p className={cn("text-[1.75rem] font-bold tabular-nums leading-tight", s.val)}>
          {value}
        </p>
        <p className="mt-1 text-[13px] font-semibold text-foreground">{label}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{sublabel}</p>
      </div>
    </div>
  );
}

function AlertCard({
  label, sublabel, value, href, linkLabel, icon: Icon, warn,
}: {
  label: string; sublabel: string; value: number | string;
  href: string; linkLabel: string; icon: LucideIcon; warn: boolean;
}) {
  const warnStyles = {
    card:    warn ? "border-amber-200/70 dark:border-amber-900/40" : "border-border",
    bg:      warn ? "from-amber-50/50 dark:from-amber-900/10 to-transparent" : "from-transparent to-transparent",
    icon:    warn ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400" : "bg-muted text-muted-foreground",
    glow:    warn ? "dark:shadow-[0_0_32px_rgba(245,158,11,0.07)]" : "",
  };

  return (
    <div className={cn(
      "group relative overflow-hidden rounded-xl border bg-card p-5 shadow-card dark:shadow-card-dark",
      warnStyles.card, warnStyles.glow,
    )}>
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", warnStyles.bg)} />

      <div className="relative">
        <div className="mb-3 flex items-center gap-2.5">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", warnStyles.icon)}>
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </div>
          {warn && typeof value === "number" && value > 0 && (
            <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400" strokeWidth={2} />
          )}
        </div>

        <p className="text-[1.75rem] font-bold tabular-nums leading-none text-foreground">{value}</p>
        <p className="mt-1.5 text-[13px] font-semibold text-foreground">{label}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{sublabel}</p>

        <Link
          href={href}
          className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-primary transition-colors hover:underline"
        >
          {linkLabel}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
