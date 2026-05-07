import { archiveAccount, updateAccount } from "@/actions/crm/accounts";
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
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { InvoiceStatusBadge } from "@/components/crm/invoice-status";
import {
  activeAccountWhere,
  activeContactWhere,
  activeDealWhere,
  activeInvoiceWhere,
} from "@/lib/crm-scope";
import { requireSession } from "@/lib/require-session";
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
  if (companyId == null || !Number.isFinite(n)) return { title: "Account" };
  const row = await db.crmAccount.findFirst({
    where: { id: n, companyId, ...activeAccountWhere },
    select: { name: true },
  });
  return { title: row?.name ?? "Account" };
}

export default async function AccountDetailPage({ params }: Props) {
  const session = await requireSession();
  const companyId = session.user.companyId;
  const { id } = await params;
  const accountId = Number(id);
  if (!Number.isFinite(accountId)) notFound();

  const account = await db.crmAccount.findFirst({
    where: { id: accountId, companyId, ...activeAccountWhere },
    include: {
      contacts: {
        where: activeContactWhere,
        orderBy: { updatedAt: "desc" },
        take: 20,
      },
      deals: {
        where: activeDealWhere,
        orderBy: { updatedAt: "desc" },
        take: 20,
        include: { owner: true },
      },
      invoices: {
        where: activeInvoiceWhere,
        orderBy: { createdAt: "desc" },
        take: 15,
      },
    },
  });

  if (!account) notFound();

  const openPipeline = account.deals.filter(
    (d) => d.stage !== DealStage.WON && d.stage !== DealStage.LOST,
  );
  const pipelineValue = openPipeline.reduce(
    (s, d) => s + (d.value != null ? Number(d.value) : 0),
    0,
  );

  return (
    <div>
      <CrmPageHeader title={account.name} description="Account record and related CRM data.">
        <form action={archiveAccount}>
          <input type="hidden" name="id" value={account.id} />
          <Button
            type="submit"
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50"
          >
            Archive
          </Button>
        </form>
      </CrmPageHeader>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{account.contacts.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open deals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{openPipeline.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {formatMoney(pipelineValue)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>Edit account</CardTitle>
            <CardDescription>Core firmographics and notes.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateAccount} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={account.id} />
              <input
                name="name"
                required
                defaultValue={account.name}
                placeholder="Company name"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 sm:col-span-2"
              />
              <input
                name="website"
                defaultValue={account.website ?? ""}
                placeholder="Website"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
              />
              <input
                name="industry"
                defaultValue={account.industry ?? ""}
                placeholder="Industry"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
              />
              <input
                name="phone"
                defaultValue={account.phone ?? ""}
                placeholder="Phone"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
              />
              <input
                name="employeeCount"
                type="number"
                min={0}
                defaultValue={account.employeeCount ?? ""}
                placeholder="Employees"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
              />
              <input
                name="annualRevenue"
                type="number"
                step="0.01"
                min={0}
                defaultValue={
                  account.annualRevenue != null ? Number(account.annualRevenue) : ""
                }
                placeholder="Annual revenue"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
              />
              <input
                name="city"
                defaultValue={account.city ?? ""}
                placeholder="City"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
              />
              <input
                name="country"
                defaultValue={account.country ?? ""}
                placeholder="Country"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
              />
              <input
                name="address"
                defaultValue={account.address ?? ""}
                placeholder="Street"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 sm:col-span-2"
              />
              <input
                name="state"
                defaultValue={account.state ?? ""}
                placeholder="State / region"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
              />
              <input
                name="postalCode"
                defaultValue={account.postalCode ?? ""}
                placeholder="Postal code"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
              />
              <textarea
                name="notes"
                defaultValue={account.notes ?? ""}
                placeholder="Notes"
                rows={4}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 sm:col-span-2"
              />
              <div className="sm:col-span-2">
                <Button type="submit">
                  Save changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-8">
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Contacts</CardTitle>
                <CardDescription>People at this account.</CardDescription>
              </div>
              <Link
                href="/dashboard/contacts"
                className="text-sm font-medium text-teal-600 hover:underline"
              >
                View all
              </Link>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {account.contacts.length === 0 ? (
                <p className="text-muted-foreground">No contacts linked.</p>
              ) : (
                account.contacts.map((c) => (
                  <Link
                    key={c.id}
                    href={`/dashboard/contacts/${c.id}`}
                    className="block rounded-lg border border-border bg-muted/40/80 px-3 py-2 hover:border-border"
                  >
                    <span className="font-medium text-foreground">
                      {c.firstName} {c.lastName ?? ""}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {[c.email, c.title].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Deals</CardTitle>
                <CardDescription>Opportunities for this account.</CardDescription>
              </div>
              <Link
                href="/dashboard/deals"
                className="text-sm font-medium text-teal-600 hover:underline"
              >
                View all
              </Link>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {account.deals.length === 0 ? (
                <p className="text-muted-foreground">No deals yet.</p>
              ) : (
                account.deals.map((d) => (
                  <Link
                    key={d.id}
                    href={`/dashboard/deals/${d.id}`}
                    className="block rounded-lg border border-border bg-muted/40/80 px-3 py-2 hover:border-border"
                  >
                    <span className="font-medium text-teal-800">{d.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {d.stage} · {formatMoney(d.value != null ? Number(d.value) : null)} ·{" "}
                      {d.owner.firstName} {d.owner.lastName ?? ""}
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Invoices</CardTitle>
                <CardDescription>Billing for this customer.</CardDescription>
              </div>
              <Link
                href={`/dashboard/invoices?q=${encodeURIComponent(account.name)}`}
                className="text-sm font-medium text-teal-600 hover:underline"
              >
                Register
              </Link>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {account.invoices.length === 0 ? (
                <p className="text-muted-foreground">No invoices yet.</p>
              ) : (
                account.invoices.map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/dashboard/invoices/${inv.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40/80 px-3 py-2 hover:border-border"
                  >
                    <span className="font-mono text-xs text-foreground">{inv.number}</span>
                    <span className="flex items-center gap-2">
                      <InvoiceStatusBadge status={inv.status} />
                      <span className="tabular-nums text-xs font-medium text-muted-foreground">
                        {formatMoney(Number(inv.total))}
                      </span>
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
