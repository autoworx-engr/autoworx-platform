import { archiveContact, updateContact } from "@/actions/crm/contacts";
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
import { activeContactWhere, activeDealWhere } from "@/lib/crm-scope";
import { requireSession } from "@/lib/require-session";
import { ContactLifecycle } from "@prisma/client";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

const LIFECYCLES = Object.values(ContactLifecycle);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.companyId;
  const { id } = await params;
  const n = Number(id);
  if (companyId == null || !Number.isFinite(n)) return { title: "Contact" };
  const row = await db.contact.findFirst({
    where: { id: n, companyId, ...activeContactWhere },
    select: { firstName: true, lastName: true },
  });
  const name = row ? `${row.firstName} ${row.lastName ?? ""}`.trim() : "Contact";
  return { title: name };
}

export default async function ContactDetailPage({ params }: Props) {
  const session = await requireSession();
  const companyId = session.user.companyId;
  const { id } = await params;
  const contactId = Number(id);
  if (!Number.isFinite(contactId)) notFound();

  const [contact, accounts] = await Promise.all([
    db.contact.findFirst({
      where: { id: contactId, companyId, ...activeContactWhere },
      include: {
        account: true,
        deals: {
          where: activeDealWhere,
          orderBy: { updatedAt: "desc" },
          take: 20,
          include: { owner: true },
        },
      },
    }),
    db.crmAccount.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!contact) notFound();

  return (
    <div>
      <CrmPageHeader
        title={`${contact.firstName} ${contact.lastName ?? ""}`.trim()}
        description="Engagement history and lifecycle for this person."
      >
        <form action={archiveContact}>
          <input type="hidden" name="id" value={contact.id} />
          <Button
            type="submit"
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50"
          >
            Archive
          </Button>
        </form>
      </CrmPageHeader>

      {contact.account ? (
        <p className="mb-6 text-sm text-muted-foreground">
          Account:{" "}
          <Link
            href={`/dashboard/accounts/${contact.account.id}`}
            className="font-medium text-teal-600 hover:underline"
          >
            {contact.account.name}
          </Link>
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>Edit contact</CardTitle>
            <CardDescription>Keep roles, lifecycle, and notes current.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateContact} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={contact.id} />
              <input
                name="firstName"
                required
                defaultValue={contact.firstName}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
              />
              <input
                name="lastName"
                defaultValue={contact.lastName ?? ""}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
              />
              <input
                name="email"
                type="email"
                defaultValue={contact.email ?? ""}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 sm:col-span-2"
              />
              <input
                name="phone"
                defaultValue={contact.phone ?? ""}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
              />
              <input
                name="title"
                defaultValue={contact.title ?? ""}
                placeholder="Job title"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
              />
              <select
                name="lifecycle"
                defaultValue={contact.lifecycle}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 sm:col-span-2"
              >
                {LIFECYCLES.map((lc) => (
                  <option key={lc} value={lc}>
                    {lc}
                  </option>
                ))}
              </select>
              <select
                name="accountId"
                defaultValue={contact.accountId ?? ""}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 sm:col-span-2"
              >
                <option value="">No account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <textarea
                name="notes"
                defaultValue={contact.notes ?? ""}
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

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>Deals</CardTitle>
            <CardDescription>Where this contact is involved.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {contact.deals.length === 0 ? (
              <p className="text-muted-foreground">No linked deals.</p>
            ) : (
              contact.deals.map((d) => (
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
      </div>
    </div>
  );
}
