import { archiveTicket, updateTicket } from "@/actions/crm/service-tickets";
import { authOptions } from "@/authOptions";
import { CrmPageHeader } from "@/components/crm/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  SERVICE_STAGE_LABEL,
  SERVICE_STAGE_ORDER,
} from "@/lib/crm-constants";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { requireSession } from "@/lib/require-session";
import { ServiceStage, TicketPriority } from "@prisma/client";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.companyId;
  const { id } = await params;
  const n = Number(id);
  if (companyId == null || !Number.isFinite(n)) return { title: "Ticket" };
  const row = await db.serviceTicket.findFirst({
    where: { id: n, companyId, deletedAt: null },
    select: { title: true },
  });
  return { title: row?.title ?? "Ticket" };
}

export default async function ServiceTicketDetailPage({ params }: Props) {
  const session = await requireSession();
  const companyId = session.user.companyId;
  const { id } = await params;
  const ticketId = Number(id);
  if (!Number.isFinite(ticketId)) notFound();

  const [ticket, team] = await Promise.all([
    db.serviceTicket.findFirst({
      where: { id: ticketId, companyId, deletedAt: null },
      include: {
        account: true,
        contact: true,
        owner: true,
        deal: { select: { id: true, title: true } },
      },
    }),
    db.user.findMany({
      where: { companyId },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  if (!ticket) notFound();

  return (
    <div>
      <CrmPageHeader title={ticket.title} description="Service ticket detail and workflow.">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-semibold",
              PRIORITY_COLOR[ticket.priority],
            )}
          >
            {PRIORITY_LABEL[ticket.priority]}
          </span>
          <form action={archiveTicket}>
            <input type="hidden" name="id" value={ticket.id} />
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

      {/* KPI strip */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Stage</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {SERVICE_STAGE_LABEL[ticket.stage]}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Priority</p>
          <p className={cn("mt-1 text-lg font-semibold", PRIORITY_COLOR[ticket.priority].split(" ")[1])}>
            {PRIORITY_LABEL[ticket.priority]}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Created</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {formatDate(ticket.createdAt)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Last update</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {formatDate(ticket.updatedAt)}
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Edit form */}
        <Card className="border-border shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle>Edit ticket</CardTitle>
            <CardDescription>Update title, priority, stage, and description.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateTicket} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={ticket.id} />
              <input
                name="title"
                required
                defaultValue={ticket.title}
                placeholder="Ticket title"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 sm:col-span-2"
              />
              <select
                name="priority"
                defaultValue={ticket.priority}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
              >
                {Object.values(TicketPriority).map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABEL[p]}
                  </option>
                ))}
              </select>
              <select
                name="stage"
                defaultValue={ticket.stage}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
              >
                {SERVICE_STAGE_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {SERVICE_STAGE_LABEL[s]}
                  </option>
                ))}
              </select>
              <select
                name="ownerId"
                defaultValue={ticket.ownerId}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 sm:col-span-2"
              >
                {team.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName ?? ""}
                  </option>
                ))}
              </select>
              <textarea
                name="description"
                defaultValue={ticket.description ?? ""}
                placeholder="Description, notes, and next steps…"
                rows={5}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 sm:col-span-2"
              />
              <div className="sm:col-span-2">
                <Button type="submit">Save changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Side cards */}
        <div className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <Link
                href={`/dashboard/accounts/${ticket.account.id}`}
                className="font-semibold text-teal-700 hover:underline"
              >
                {ticket.account.name}
              </Link>
            </CardContent>
          </Card>

          {ticket.contact ? (
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle>Contact</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <Link
                  href={`/dashboard/contacts/${ticket.contact.id}`}
                  className="font-semibold text-teal-700 hover:underline"
                >
                  {ticket.contact.firstName} {ticket.contact.lastName ?? ""}
                </Link>
                {ticket.contact.email ? (
                  <p className="mt-1 text-xs text-muted-foreground">{ticket.contact.email}</p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {ticket.deal ? (
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle>Linked deal</CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/dashboard/deals/${ticket.deal.id}`}
                  className="text-sm font-semibold text-teal-700 hover:underline"
                >
                  {ticket.deal.title}
                </Link>
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>Owner</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {ticket.owner.firstName} {ticket.owner.lastName ?? ""}
              <p className="text-xs text-muted-foreground">{ticket.owner.email}</p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>Stage progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {SERVICE_STAGE_ORDER.map((s) => (
                  <div key={s} className="flex items-center gap-2 text-sm">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        s === ticket.stage
                          ? "bg-teal-500"
                          : SERVICE_STAGE_ORDER.indexOf(s) <
                              SERVICE_STAGE_ORDER.indexOf(ticket.stage)
                            ? "bg-emerald-400"
                            : "bg-slate-200",
                      )}
                    />
                    <span
                      className={
                        s === ticket.stage ? "font-semibold text-foreground" : "text-muted-foreground"
                      }
                    >
                      {SERVICE_STAGE_LABEL[s]}
                    </span>
                    {s === ticket.stage ? (
                      <span className="ml-auto text-xs text-teal-600">Current</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/dashboard/service-pipeline" className="text-teal-600 hover:underline">
          ← Back to board
        </Link>
      </p>
    </div>
  );
}
