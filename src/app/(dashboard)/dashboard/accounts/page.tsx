import { archiveAccount, createAccount } from "@/actions/crm/accounts";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { activeAccountWhere } from "@/lib/crm-scope";
import { requireSession } from "@/lib/require-session";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Accounts",
};

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const session = await requireSession();
  const companyId = session.user.companyId;
  const q = searchParams.q?.trim();

  const accounts = await db.crmAccount.findMany({
    where: {
      companyId,
      ...activeAccountWhere,
      ...(q
        ? {
            name: { contains: q, mode: "insensitive" as const },
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <CrmPageHeader
        title="Accounts"
        description="Customer orgs — link contacts and opportunities to keep pipeline context."
      />

      <Card className="mb-8 shadow-sm">
        <CardHeader>
          <CardTitle>New account</CardTitle>
          <CardDescription>
            Required field: name. Archive removes the account from active lists.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createAccount} className="grid max-w-2xl gap-3 sm:grid-cols-2">
            <input
              name="name"
              required
              placeholder="Company name"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 placeholder:text-muted-foreground sm:col-span-2"
            />
            <input
              name="website"
              placeholder="Website"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 placeholder:text-muted-foreground"
            />
            <input
              name="industry"
              placeholder="Industry"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 placeholder:text-muted-foreground"
            />
            <input
              name="phone"
              placeholder="Phone"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 placeholder:text-muted-foreground"
            />
            <input
              name="employeeCount"
              type="number"
              min={0}
              placeholder="Employees"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 placeholder:text-muted-foreground"
            />
            <input
              name="annualRevenue"
              type="number"
              step="0.01"
              min={0}
              placeholder="Annual revenue"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 placeholder:text-muted-foreground"
            />
            <input
              name="city"
              placeholder="City"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 placeholder:text-muted-foreground"
            />
            <input
              name="country"
              placeholder="Country"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 placeholder:text-muted-foreground"
            />
            <input
              name="address"
              placeholder="Street address"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 placeholder:text-muted-foreground sm:col-span-2"
            />
            <div className="sm:col-span-2">
              <Button type="submit">
                Add account
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Directory</CardTitle>
            <CardDescription>Latest updates first.</CardDescription>
          </div>
          <form method="get" className="flex w-full max-w-xs gap-2">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search name"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 placeholder:text-muted-foreground"
            />
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
          </form>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>City</TableHead>
                <TableHead className="w-[120px] text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    {q ? `No accounts match “${q}”.` : "No accounts yet."}
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/accounts/${a.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {a.name}
                      </Link>
                    </TableCell>
                    <TableCell>{a.industry ?? "—"}</TableCell>
                    <TableCell>
                      {a.annualRevenue != null
                        ? formatMoney(Number(a.annualRevenue))
                        : "—"}
                    </TableCell>
                    <TableCell>{a.city ?? "—"}</TableCell>
                    <TableCell className="text-end">
                      <form action={archiveAccount} className="inline">
                        <input type="hidden" name="id" value={a.id} />
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
