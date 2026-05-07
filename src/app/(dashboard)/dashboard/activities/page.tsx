import {
  completeActivity,
  createActivity,
  deleteActivity,
} from "@/actions/crm/activities";
import { CrmPageHeader } from "@/components/crm/page-header";
import { StageBadge } from "@/components/crm/stage-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db";
import { activeAccountWhere, activeContactWhere, activeDealWhere } from "@/lib/crm-scope";
import { requireSession } from "@/lib/require-session";
import { ActivityType } from "@prisma/client";
import { CheckCircle2, Clock } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

const types = Object.values(ActivityType);

const TYPE_COLOR: Record<ActivityType, string> = {
  NOTE:    "bg-zinc-100 text-zinc-700",
  CALL:    "bg-blue-100 text-blue-700",
  EMAIL:   "bg-violet-100 text-violet-700",
  MEETING: "bg-teal-100 text-teal-700",
  TASK:    "bg-amber-100 text-amber-700",
};

const ADVANCING_TYPES = new Set<ActivityType>([
  ActivityType.CALL,
  ActivityType.MEETING,
  ActivityType.EMAIL,
]);

export const metadata: Metadata = {
  title: "Activities",
};

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string }>;
}) {
  const session = await requireSession();
  const companyId = session.user.companyId;
  const sp = await searchParams;
  const typeFilter = sp.type && Object.values(ActivityType).includes(sp.type as ActivityType)
    ? (sp.type as ActivityType)
    : undefined;
  const q = sp.q?.trim();

  const [activities, deals, accounts, contacts] = await Promise.all([
    db.activity.findMany({
      where: {
        companyId,
        ...(typeFilter ? { type: typeFilter } : {}),
        ...(q
          ? { subject: { contains: q, mode: "insensitive" as const } }
          : {}),
      },
      include: {
        user: true,
        deal: { select: { id: true, title: true, stage: true } },
        account: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.deal.findMany({
      where: { companyId, ...activeDealWhere },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, stage: true },
      take: 100,
    }),
    db.crmAccount.findMany({
      where: { companyId, ...activeAccountWhere },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.contact.findMany({
      where: { companyId, ...activeContactWhere },
      orderBy: [{ firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
      take: 200,
    }),
  ]);

  const pending = activities.filter((a) => !a.completedAt);
  const done    = activities.filter((a) =>  a.completedAt);

  return (
    <div>
      <CrmPageHeader
        title="Activities"
        description="Log calls, emails, meetings and tasks. Completing a CALL, EMAIL or MEETING on a deal can auto-advance its pipeline stage."
      />

      {/* ── Summary strip ─────────────────────────────── */}
      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{activities.length}</p>
        </div>
        <div className="rounded-xl border border-amber-200/70 bg-amber-50/40 p-4 shadow-sm dark:border-amber-900/40 dark:bg-amber-900/10">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">Open</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-amber-900 dark:text-amber-300">{pending.length}</p>
        </div>
        <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-4 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-900/10">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Completed</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-900 dark:text-emerald-300">{done.length}</p>
        </div>
      </div>

      {/* ── Log form ──────────────────────────────────── */}
      <Card className="mb-8 border-border shadow-sm">
        <CardHeader>
          <CardTitle>Log activity</CardTitle>
          <CardDescription>
            Link to an account, contact, or deal. Completing a CALL / EMAIL / MEETING on a deal can push it to the next pipeline stage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createActivity} className="grid max-w-2xl gap-3 sm:grid-cols-2">
            <select
              name="type"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
              defaultValue={ActivityType.NOTE}
            >
              {types.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input
              name="dueAt"
              type="datetime-local"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
            />
            <input
              name="subject"
              required
              placeholder="Subject"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 placeholder:text-muted-foreground sm:col-span-2"
            />
            <textarea
              name="body"
              placeholder="Details / notes"
              rows={3}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 placeholder:text-muted-foreground sm:col-span-2"
            />
            {/* Account */}
            <select
              name="accountId"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
              defaultValue=""
            >
              <option value="">No account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            {/* Contact */}
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
            {/* Deal */}
            <select
              name="dealId"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 sm:col-span-2"
              defaultValue=""
            >
              <option value="">No linked deal</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} [{d.stage}]
                </option>
              ))}
            </select>
            <div className="sm:col-span-2">
              <Button type="submit">Add activity</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Filters ───────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form method="get" className="flex gap-2">
          {typeFilter ? <input type="hidden" name="type" value={typeFilter} /> : null}
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search subject…"
            className="w-44 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 placeholder:text-muted-foreground"
          />
          <Button type="submit" variant="secondary" size="sm">Search</Button>
        </form>
        <div className="flex flex-wrap gap-1">
          <Link
            href="/dashboard/activities"
            className={`rounded-full px-3 py-1 text-xs font-medium ${!typeFilter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            All
          </Link>
          {types.map((t) => (
            <Link
              key={t}
              href={`/dashboard/activities?type=${t}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded-full px-3 py-1 text-xs font-medium ${t === typeFilter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              {t}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Timeline table ────────────────────────────── */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Linked to</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[180px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    {q || typeFilter ? "No activities match." : "No activities yet."}
                  </TableCell>
                </TableRow>
              ) : (
                activities.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${TYPE_COLOR[a.type]}`}>
                        {a.type}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{a.subject}</TableCell>
                    <TableCell className="space-y-1 text-sm">
                      {a.deal ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            href={`/dashboard/deals/${a.deal.id}`}
                            className="text-primary hover:underline"
                          >
                            {a.deal.title}
                          </Link>
                          <StageBadge stage={a.deal.stage} />
                        </div>
                      ) : null}
                      {a.account ? (
                        <Link
                          href={`/dashboard/accounts/${a.account.id}`}
                          className="block text-xs text-muted-foreground hover:underline"
                        >
                          {a.account.name}
                        </Link>
                      ) : null}
                      {a.contact ? (
                        <Link
                          href={`/dashboard/contacts/${a.contact.id}`}
                          className="block text-xs text-muted-foreground hover:underline"
                        >
                          {a.contact.firstName} {a.contact.lastName ?? ""}
                        </Link>
                      ) : null}
                      {!a.deal && !a.account && !a.contact ? (
                        <span className="text-muted-foreground">—</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">
                      {a.user.firstName} {a.user.lastName ?? ""}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {a.dueAt
                        ? new Intl.DateTimeFormat(undefined, {
                            dateStyle: "short",
                            timeStyle: "short",
                          }).format(a.dueAt)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {a.completedAt ? (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Done
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600">
                          <Clock className="h-3.5 w-3.5" />
                          Open
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        {!a.completedAt ? (
                          <>
                            {/* Complete without advancing */}
                            <form action={completeActivity} className="inline">
                              <input type="hidden" name="id" value={a.id} />
                              <Button type="submit" variant="secondary" size="sm" className="h-7 text-[11px]">
                                Complete
                              </Button>
                            </form>
                            {/* Complete + advance deal stage */}
                            {a.dealId && ADVANCING_TYPES.has(a.type) ? (
                              <form action={completeActivity} className="inline" title="Complete and advance deal to next pipeline stage">
                                <input type="hidden" name="id" value={a.id} />
                                <input type="hidden" name="advanceDeal" value="1" />
                                <Button type="submit" size="sm" className="h-7 text-[11px]">
                                  ✓ + Advance
                                </Button>
                              </form>
                            ) : null}
                          </>
                        ) : null}
                        <form action={deleteActivity} className="inline">
                          <input type="hidden" name="id" value={a.id} />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[11px] text-red-600 hover:text-red-700"
                          >
                            Delete
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
