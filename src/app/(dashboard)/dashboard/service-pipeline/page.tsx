import { createServiceTicket } from "@/actions/crm/service-tickets";
import { CrmPageHeader } from "@/components/crm/page-header";
import { ServiceKanban, type KanbanTicket } from "@/components/crm/service-kanban";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  SERVICE_STAGE_LABEL,
  SERVICE_STAGE_ORDER,
  PRIORITY_LABEL,
} from "@/lib/crm-constants";
import {
  activeAccountWhere,
  activeContactWhere,
  activeDealWhere,
} from "@/lib/crm-scope";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { ServiceStage, TicketPriority } from "@prisma/client";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Service Pipeline" };

export default async function ServicePipelinePage({
  searchParams,
}: {
  searchParams: { owner?: string };
}) {
  const session = await requireSession();
  const companyId = session.user.companyId;
  const ownerRaw = searchParams.owner;
  const ownerId = ownerRaw && /^\d+$/.test(ownerRaw) ? Number(ownerRaw) : null;

  const [tickets, accounts, contacts, deals, owners] = await Promise.all([
    db.serviceTicket.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(ownerId ? { ownerId } : {}),
      },
      include: { account: true, owner: true },
      orderBy: { updatedAt: "desc" },
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
    db.deal.findMany({
      where: { companyId, ...activeDealWhere },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true },
      take: 100,
    }),
    db.user.findMany({
      where: { companyId },
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  const stageTotals = SERVICE_STAGE_ORDER.map((stage) => ({
    stage,
    count: tickets.filter((t) => t.stage === stage).length,
  }));

  const kanbanTickets: KanbanTicket[] = tickets.map((t) => ({
    id: t.id,
    title: t.title,
    stage: t.stage,
    priority: t.priority,
    accountName: t.account.name,
    ownerFirstName: t.owner.firstName,
    ownerLastName: t.owner.lastName,
    description: t.description,
  }));

  return (
    <div>
      <CrmPageHeader
        title="Service Pipeline"
        description="Track post-sale delivery — onboard clients, manage work in progress, review and close out."
      />

      {/* KPI row */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stageTotals.map(({ stage, count }) => (
          <div
            key={stage}
            className="rounded-xl border border-border bg-card p-4 shadow-sm dark:shadow-card-dark"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {SERVICE_STAGE_LABEL[stage]}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
              {count}
            </p>
          </div>
        ))}
      </div>

      {/* New ticket */}
      <Card className="mb-8 shadow-sm">
        <CardHeader>
          <CardTitle>New service ticket</CardTitle>
          <CardDescription>
            Optionally link to a won deal. Priority and stage can be changed on the board.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createServiceTicket} className="grid max-w-2xl gap-3 sm:grid-cols-2">
            <input
              name="title"
              required
              placeholder="Ticket title"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 placeholder:text-muted-foreground sm:col-span-2"
            />
            <select
              name="accountId"
              required
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 sm:col-span-2"
            >
              <option value="">Account — required</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <select
              name="contactId"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
              defaultValue=""
            >
              <option value="">No contact</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName ?? ""}
                </option>
              ))}
            </select>
            <select
              name="dealId"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
              defaultValue=""
            >
              <option value="">No linked deal</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
            <select
              name="priority"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
              defaultValue={TicketPriority.MEDIUM}
            >
              {Object.values(TicketPriority).map((p) => (
                <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
              ))}
            </select>
            <select
              name="stage"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
              defaultValue={ServiceStage.ONBOARDING}
            >
              {SERVICE_STAGE_ORDER.map((s) => (
                <option key={s} value={s}>{SERVICE_STAGE_LABEL[s]}</option>
              ))}
            </select>
            <textarea
              name="description"
              placeholder="Description (optional)"
              rows={2}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 placeholder:text-muted-foreground sm:col-span-2"
            />
            <div className="sm:col-span-2">
              <Button type="submit">Create ticket</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Owner filter */}
      <div className="mb-4 flex items-center gap-2">
        <form method="get" className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">
            Owner
            <select
              name="owner"
              defaultValue={ownerId != null ? String(ownerId) : ""}
              className="ml-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
            >
              <option value="">All</option>
              {owners.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName ?? ""}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" variant="secondary" size="sm">Filter</Button>
        </form>
      </div>

      {/* Kanban board */}
      <ServiceKanban tickets={kanbanTickets} />
    </div>
  );
}
