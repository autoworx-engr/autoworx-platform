import { archiveContact, createContact } from "@/actions/crm/contacts";
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
import { activeAccountWhere, activeContactWhere } from "@/lib/crm-scope";
import { requireSession } from "@/lib/require-session";
import { ContactLifecycle } from "@prisma/client";
import { Metadata } from "next";
import Link from "next/link";

const LIFECYCLES = Object.values(ContactLifecycle);

export const metadata: Metadata = {
  title: "Contacts",
};

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const session = await requireSession();
  const companyId = session.user.companyId;
  const q = searchParams.q?.trim();

  const [contacts, accounts] = await Promise.all([
    db.contact.findMany({
      where: {
        companyId,
        ...activeContactWhere,
        ...(q
          ? {
              OR: [
                { firstName: { contains: q, mode: "insensitive" as const } },
                { lastName: { contains: q, mode: "insensitive" as const } },
                { email: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      include: { account: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    db.crmAccount.findMany({
      where: { companyId, ...activeAccountWhere },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div>
      <CrmPageHeader
        title="Contacts"
        description="People associated with accounts — lifecycle helps segment marketing and CS handoffs."
      />

      <Card className="mb-8 border-border shadow-sm">
        <CardHeader>
          <CardTitle>New contact</CardTitle>
          <CardDescription>Link to an account when you know the buying center.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createContact} className="grid max-w-2xl gap-3 sm:grid-cols-2">
            <input
              name="firstName"
              required
              placeholder="First name"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
            />
            <input
              name="lastName"
              placeholder="Last name"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
            />
            <input
              name="email"
              type="email"
              placeholder="Email"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
            />
            <input
              name="phone"
              placeholder="Phone"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
            />
            <input
              name="title"
              placeholder="Job title"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 sm:col-span-2"
            />
            <select
              name="lifecycle"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 sm:col-span-2"
              defaultValue={ContactLifecycle.LEAD}
            >
              {LIFECYCLES.map((lc) => (
                <option key={lc} value={lc}>
                  {lc}
                </option>
              ))}
            </select>
            <select
              name="accountId"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 sm:col-span-2"
              defaultValue=""
            >
              <option value="">No account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <div className="sm:col-span-2">
              <Button type="submit">
                Add contact
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Directory</CardTitle>
          </div>
          <form method="get" className="flex w-full max-w-xs gap-2">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search people"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
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
                <TableHead>Lifecycle</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-[120px] text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    {q ? `No contacts match “${q}”.` : "No contacts yet."}
                  </TableCell>
                </TableRow>
              ) : (
                contacts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/contacts/${c.id}`}
                        className="text-teal-700 hover:underline"
                      >
                        {c.firstName} {c.lastName ?? ""}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.lifecycle}</TableCell>
                    <TableCell>{c.account?.name ?? "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{c.email ?? "—"}</TableCell>
                    <TableCell className="text-end">
                      <form action={archiveContact} className="inline">
                        <input type="hidden" name="id" value={c.id} />
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
