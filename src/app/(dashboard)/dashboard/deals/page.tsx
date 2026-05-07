import { archiveDeal, updateDealStage } from "@/actions/crm/deals";
import { NewDealCard } from "@/components/crm/new-deal-card";
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
import { formatMoney } from "@/lib/format";
import { activeAccountWhere, activeContactWhere, activeDealWhere } from "@/lib/crm-scope";
import { requireSession } from "@/lib/require-session";
import { KANBAN_STAGE_ORDER as STAGE_ORDER, STAGE_LABEL } from "@/lib/crm-constants";
import { DealStage } from "@prisma/client";
import { Metadata } from "next";
import Link from "next/link";

const TYPE_BADGE: Record<string, string> = {
  Manager:    "bg-blue-100 text-blue-700",
  Sales:      "bg-emerald-100 text-emerald-700",
  Technician: "bg-amber-100 text-amber-700",
  Admin:      "bg-violet-100 text-violet-700",
  Other:      "bg-slate-100 text-slate-700",
};

export const metadata: Metadata = {
  title: "Deals",
};

export default async function DealsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const session = await requireSession();
  const companyId = session.user.companyId;
  const q = searchParams.q?.trim();

  const [deals, accounts, contacts, employees] = await Promise.all([
    db.deal.findMany({
      where: {
        companyId,
        ...activeDealWhere,
        ...(q
          ? {
              title: { contains: q, mode: "insensitive" as const },
            }
          : {}),
      },
      include: { account: true, contact: true, owner: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
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
    db.user.findMany({
      where: { companyId },
      orderBy: [{ employeeType: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, employeeType: true },
    }),
  ]);

  return (
    <div>
      <CrmPageHeader
        title="Deals"
        description="Opportunities tied to accounts. Open a record for full editing, owners, and loss reasons."
      />

      <NewDealCard accounts={accounts} contacts={contacts} employees={employees} stages={STAGE_ORDER} />

      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Pipeline list</CardTitle>
            <CardDescription>Quick stage updates — or use the board view.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/pipeline"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/60"
            >
              Open board
            </Link>
            <form method="get" className="flex gap-2">
              <input
                name="q"
                defaultValue={q ?? ""}
                placeholder="Search deals"
                className="w-40 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 sm:w-48"
              />
              <Button type="submit" variant="secondary" size="sm">
                Search
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deal</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="w-[180px] text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    {q ? `No deals match “${q}”.` : "No deals yet."}
                  </TableCell>
                </TableRow>
              ) : (
                deals.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/deals/${d.id}`}
                        className="text-teal-700 hover:underline"
                      >
                        {d.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/accounts/${d.account.id}`}
                        className="text-muted-foreground hover:underline"
                      >
                        {d.account.name}
                      </Link>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatMoney(d.value != null ? Number(d.value) : null)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <StageBadge stage={d.stage} />
                        <form action={updateDealStage} className="flex flex-wrap gap-1">
                          <input type="hidden" name="id" value={d.id} />
                          <select
                            name="stage"
                            defaultValue={d.stage}
                            className="max-w-[140px] rounded-md border border-border bg-card px-2 py-1 text-xs"
                          >
                            {STAGE_ORDER.map((s) => (
                              <option key={s} value={s}>
                                {STAGE_LABEL[s]}
                              </option>
                            ))}
                          </select>
                          <Button type="submit" variant="secondary" size="sm">
                            Apply
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>
                        {d.owner.firstName} {d.owner.lastName ?? ""}
                      </div>
                      <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${TYPE_BADGE[d.owner.employeeType] ?? TYPE_BADGE.Other}`}>
                        {d.owner.employeeType}
                      </span>
                    </TableCell>
                    <TableCell className="text-end">
                      <form action={archiveDeal} className="inline">
                        <input type="hidden" name="id" value={d.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          Archive
                        </Button>
                      </form>
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
