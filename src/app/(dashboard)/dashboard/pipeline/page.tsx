import { NewDealCard } from "@/components/crm/new-deal-card";
import { PipelineKanban, type KanbanDeal } from "@/components/crm/pipeline-kanban";
import { CrmPageHeader } from "@/components/crm/page-header";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import {
  activeAccountWhere,
  activeContactWhere,
  activeDealWhere,
} from "@/lib/crm-scope";
import { KANBAN_STAGE_ORDER, STAGE_LABEL } from "@/lib/crm-constants";
import { formatMoney } from "@/lib/format";
import { requireSession } from "@/lib/require-session";
import { DealStage } from "@prisma/client";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pipeline",
};

const OPEN_PIPELINE_STAGES: DealStage[] = [
  DealStage.LEAD,
  DealStage.QUALIFIED,
  DealStage.PROPOSAL,
  DealStage.NEGOTIATION,
];

const CLOSED_STAGES = new Set<DealStage>([DealStage.WON, DealStage.LOST]);

function avgDaysSinceUpdate(rows: { updatedAt: Date }[]) {
  if (rows.length === 0) return null;
  const t = Date.now();
  const sum = rows.reduce(
    (s, r) => s + (t - r.updatedAt.getTime()) / 86_400_000,
    0,
  );
  return Math.round(sum / rows.length);
}

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: { owner?: string };
}) {
  const session = await requireSession();
  const companyId = session.user.companyId;
  const ownerFilterRaw = searchParams.owner;
  const ownerId =
    ownerFilterRaw && /^\d+$/.test(ownerFilterRaw) ? Number(ownerFilterRaw) : null;

  const [owners, deals, accounts, contacts] = await Promise.all([
    db.user.findMany({
      where: { companyId },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
    db.deal.findMany({
      where: {
        companyId,
        ...activeDealWhere,
        ...(ownerId != null && Number.isFinite(ownerId) ? { ownerId } : {}),
      },
      include: { account: true, owner: true },
      orderBy: [{ stage: "asc" }, { updatedAt: "desc" }],
    }),
    db.crmAccount.findMany({
      where: { companyId, ...activeAccountWhere },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.contact.findMany({
      where: { companyId, ...activeContactWhere },
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true },
      take: 200,
    }),
  ]);

  const openDeals = deals.filter((d) => !CLOSED_STAGES.has(d.stage));

  const columnTotals = KANBAN_STAGE_ORDER.map((stage) => {
    const inStage = deals.filter((d) => d.stage === stage);
    const sum = inStage.reduce(
      (acc, d) => acc + (d.value != null ? Number(d.value) : 0),
      0,
    );
    const weighted = inStage.reduce((acc, d) => {
      const v = d.value != null ? Number(d.value) : 0;
      const p = (d.probability ?? 0) / 100;
      return acc + v * p;
    }, 0);
    const stale = avgDaysSinceUpdate(inStage);
    return { stage, count: inStage.length, sum, weighted, stale };
  });

  const totalOpenValue = openDeals.reduce(
    (acc, d) => acc + (d.value != null ? Number(d.value) : 0),
    0,
  );
  const totalWeighted = openDeals.reduce((acc, d) => {
    const v = d.value != null ? Number(d.value) : 0;
    const p = (d.probability ?? 0) / 100;
    return acc + v * p;
  }, 0);

  const byOpenStage = Object.fromEntries(
    OPEN_PIPELINE_STAGES.map((s) => [s, openDeals.filter((d) => d.stage === s)]),
  ) as Record<DealStage, typeof openDeals>;

  const totalOpenDeals = openDeals.length;
  const funnelPct = OPEN_PIPELINE_STAGES.map((stage, i) => {
    const count = (byOpenStage[stage] ?? []).length;
    if (i === 0) {
      return {
        stage,
        label: "Share of open pipe",
        pct: totalOpenDeals ? Math.round((count / totalOpenDeals) * 100) : 0,
        count,
      };
    }
    const prev = (byOpenStage[OPEN_PIPELINE_STAGES[i - 1]] ?? []).length;
    return {
      stage,
      label: "Vs previous stage",
      pct: prev ? Math.round((count / prev) * 100) : 0,
      count,
    };
  });

  const kanbanDeals: KanbanDeal[] = deals.map((d) => ({
    id: d.id,
    title: d.title,
    stage: d.stage,
    value: d.value != null ? Number(d.value) : null,
    probability: d.probability,
    accountName: d.account.name,
    ownerFirstName: d.owner.firstName,
    ownerLastName: d.owner.lastName,
  }));

  return (
    <div>
      <CrmPageHeader
        title="Pipeline"
        description="Kanban board — drag deals between stages, or add a new opportunity and work it through the funnel."
      />

      {/* ── Summary bar ──────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-card dark:shadow-card-dark lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Open pipe value</p>
            <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">
              {formatMoney(totalOpenValue)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Weighted (open)</p>
            <p className="mt-0.5 text-xl font-bold tabular-nums text-teal-600 dark:text-teal-400">
              {formatMoney(totalWeighted)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deals in view</p>
            <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">{deals.length}</p>
          </div>
        </div>
        <form method="get" className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-muted-foreground">
            Owner
            <select
              name="owner"
              defaultValue={ownerId != null ? String(ownerId) : ""}
              className="ml-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
            >
              <option value="">All reps</option>
              {owners.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName ?? ""}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" variant="secondary" size="sm">
            Apply
          </Button>
          {ownerId != null ? (
            <Link href="/dashboard/pipeline" className="text-sm font-medium text-primary hover:underline">
              Clear
            </Link>
          ) : null}
        </form>
      </div>

      {/* ── Funnel conversion row ─────────────────────── */}
      <div className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {funnelPct.map(({ stage, label, pct, count }) => (
          <div
            key={stage}
            className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm dark:shadow-card-dark"
          >
            <p className="text-[12px] font-semibold text-foreground">{STAGE_LABEL[stage]}</p>
            <p className="text-[11px] text-muted-foreground">{label}</p>
            <p className="mt-1.5 text-xl font-bold tabular-nums text-foreground">
              {pct}%
              <span className="ml-2 text-xs font-normal text-muted-foreground">({count})</span>
            </p>
          </div>
        ))}
      </div>

      {/* ── Per-stage totals ──────────────────────────── */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {columnTotals.map(({ stage, count, sum, weighted, stale }) => (
          <div
            key={stage}
            className="rounded-xl border border-border bg-card p-4 shadow-sm dark:shadow-card-dark"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {STAGE_LABEL[stage]}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
              {count}
            </p>
            <p className="text-[12px] text-muted-foreground">{formatMoney(sum)} total</p>
            {!CLOSED_STAGES.has(stage) ? (
              <p className="text-[11px] font-medium text-teal-600 dark:text-teal-400">{formatMoney(weighted)} wtd</p>
            ) : (
              <p className="text-[11px] text-muted-foreground/60">Closed</p>
            )}
            {stale != null ? (
              <p className="mt-1 text-[10px] text-muted-foreground/50">~{stale}d since touch</p>
            ) : null}
          </div>
        ))}
      </div>

      <NewDealCard
        accounts={accounts}
        contacts={contacts}
        stages={OPEN_PIPELINE_STAGES}
        defaultStage={DealStage.LEAD}
        title="Quick add deal"
        description="Creates a new opportunity on the board (defaults to Lead). Needs an account."
      />

      <PipelineKanban deals={kanbanDeals} />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Table view, filters, and archiving on{" "}
        <Link href="/dashboard/deals" className="text-primary hover:underline">Deals</Link>.
        {" "}Bill customers from{" "}
        <Link href="/dashboard/invoices" className="text-primary hover:underline">Invoices</Link>.
      </p>
    </div>
  );
}
