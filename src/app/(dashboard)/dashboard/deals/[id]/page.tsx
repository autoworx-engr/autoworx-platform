import { archiveDeal, updateDeal } from "@/actions/crm/deals";
import { authOptions } from "@/authOptions";
import { CrmPageHeader } from "@/components/crm/page-header";
import { StageBadge } from "@/components/crm/stage-badge";
import { InvoiceStatusBadge } from "@/components/crm/invoice-status";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { activeDealWhere, activeInvoiceWhere } from "@/lib/crm-scope";
import { requireSession } from "@/lib/require-session";
import { KANBAN_STAGE_ORDER as STAGE_ORDER, STAGE_LABEL } from "@/lib/crm-constants";
import { DealStage } from "@prisma/client";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.companyId;
  const { id } = await params;
  const n = Number(id);
  if (companyId == null || !Number.isFinite(n)) return { title: "Deal" };
  const row = await db.deal.findFirst({
    where: { id: n, companyId, ...activeDealWhere },
    select: { title: true },
  });
  return { title: row?.title ?? "Deal" };
}

export default async function DealDetailPage({ params }: Props) {
  const session = await requireSession();
  const companyId = session.user.companyId;
  const { id } = await params;
  const dealId = Number(id);
  if (!Number.isFinite(dealId)) notFound();

  const [deal, accounts, contacts, team] = await Promise.all([
    db.deal.findFirst({
      where: { id: dealId, companyId, ...activeDealWhere },
      include: {
        account: true,
        contact: true,
        owner: true,
        invoices: {
          where: activeInvoiceWhere,
          orderBy: { createdAt: "desc" },
          take: 12,
        },
      },
    }),
    db.crmAccount.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.contact.findMany({
      where: { companyId, deletedAt: null },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
      take: 300,
    }),
    db.user.findMany({
      where: { companyId },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
  ]);

  if (!deal) notFound();

  const closeYmd =
    deal.expectedCloseDate != null
      ? deal.expectedCloseDate.toISOString().slice(0, 10)
      : "";

  return (
    <div>
      <CrmPageHeader title={deal.title} description="Opportunity detail and forecast fields.">
        <div className="flex flex-wrap items-center gap-2">
          <StageBadge stage={deal.stage} />
          <form action={archiveDeal}>
            <input type="hidden" name="id" value={deal.id} />
            <Button
              type="submit"
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50"
            >
              Archive
            </Button>
          </form>
        </div>
      </CrmPageHeader>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Value
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {formatMoney(deal.value != null ? Number(deal.value) : null)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Probability
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {deal.probability ?? 0}%
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Expected close
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {formatDate(deal.expectedCloseDate)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Closed
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {formatDate(deal.closedAt)}
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="border-border shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle>Edit deal</CardTitle>
            <CardDescription>
              Stage drives closed date; lost deals capture a reason for reporting.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateDeal} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={deal.id} />
              <input
                name="title"
                required
                defaultValue={deal.title}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 sm:col-span-2"
              />
              <select
                name="accountId"
                required
                defaultValue={deal.accountId}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 sm:col-span-2"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <select
                name="contactId"
                defaultValue={deal.contactId ?? ""}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 sm:col-span-2"
              >
                <option value="">No contact</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName ?? ""}
                  </option>
                ))}
              </select>
              <select
                name="ownerId"
                defaultValue={deal.ownerId}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 sm:col-span-2"
              >
                {team.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName ?? ""}
                  </option>
                ))}
              </select>
              <input
                name="value"
                type="number"
                step="0.01"
                min="0"
                defaultValue={deal.value != null ? Number(deal.value) : ""}
                placeholder="Amount"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
              />
              <input
                name="probability"
                type="number"
                min={0}
                max={100}
                defaultValue={deal.probability ?? 0}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
              />
              <select
                name="stage"
                defaultValue={deal.stage}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 sm:col-span-2"
              >
                {STAGE_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABEL[s]}
                  </option>
                ))}
              </select>
              <input
                name="expectedCloseDate"
                type="date"
                defaultValue={closeYmd}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 sm:col-span-2"
              />
              <input
                name="source"
                defaultValue={deal.source ?? ""}
                placeholder="Lead source"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
              />
              <input
                name="lostReason"
                defaultValue={deal.lostReason ?? ""}
                placeholder="Lost reason (if lost)"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
              />
              <textarea
                name="description"
                defaultValue={deal.description ?? ""}
                placeholder="Context, next steps, product interest…"
                rows={5}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 sm:col-span-2"
              />
              <div className="sm:col-span-2">
                <Button type="submit">
                  Save deal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/dashboard/accounts/${deal.account.id}`}
                className="text-base font-semibold text-teal-700 hover:underline"
              >
                {deal.account.name}
              </Link>
            </CardContent>
          </Card>
          {deal.contact ? (
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle>Primary contact</CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/dashboard/contacts/${deal.contact.id}`}
                  className="font-semibold text-teal-700 hover:underline"
                >
                  {deal.contact.firstName} {deal.contact.lastName ?? ""}
                </Link>
                {deal.contact.email ? (
                  <p className="mt-1 text-sm text-muted-foreground">{deal.contact.email}</p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>Bill against this opportunity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {deal.invoices.length === 0 ? (
                <p className="text-muted-foreground">No invoices linked.</p>
              ) : (
                deal.invoices.map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/dashboard/invoices/${inv.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40/80 px-3 py-2 hover:border-border"
                  >
                    <span className="font-mono text-xs">{inv.number}</span>
                    <span className="flex items-center gap-2">
                      <InvoiceStatusBadge status={inv.status} />
                      <span className="tabular-nums text-xs font-medium">
                        {formatMoney(Number(inv.total))}
                      </span>
                    </span>
                  </Link>
                ))
              )}
              <Link
                href="/dashboard/invoices"
                className="mt-2 inline-block text-xs font-medium text-teal-600 hover:underline"
              >
                New invoice →
              </Link>
            </CardContent>
          </Card>
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>Owner</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {deal.owner.firstName} {deal.owner.lastName ?? ""}
              <p className="text-xs text-muted-foreground">{deal.owner.email}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
