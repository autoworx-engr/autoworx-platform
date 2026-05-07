import {
  inviteEmployee,
  updateEmployeeType,
} from "@/actions/crm/employees";
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
import { requireSession } from "@/lib/require-session";
import { EmployeeType, Role } from "@prisma/client";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Employees" };

const EMPLOYEE_TYPES = Object.values(EmployeeType);
const ROLES = Object.values(Role);

const TYPE_COLOR: Record<EmployeeType, string> = {
  Admin:      "bg-violet-100 text-violet-800",
  Manager:    "bg-blue-100 text-blue-800",
  Sales:      "bg-emerald-100 text-emerald-800",
  Technician: "bg-amber-100 text-amber-800",
  Other:      "bg-slate-100 text-slate-700",
};

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ invited?: string; error?: string; q?: string }>;
}) {
  const session = await requireSession();
  const companyId = session.user.companyId;
  const sp = await searchParams;
  const q = sp.q?.trim();

  const employees = await db.user.findMany({
    where: {
      companyId,
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" as const } },
              { lastName:  { contains: q, mode: "insensitive" as const } },
              { email:     { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ employeeType: "asc" }, { firstName: "asc" }],
    include: {
      _count: {
        select: {
          ownedDeals: { where: { deletedAt: null } },
          ownedTickets: { where: { deletedAt: null } },
        },
      },
    },
  });

  // Summary counts by type
  const typeCounts = EMPLOYEE_TYPES.reduce<Record<string, number>>((acc, t) => {
    acc[t] = employees.filter((e) => e.employeeType === t).length;
    return acc;
  }, {});

  return (
    <div>
      <CrmPageHeader
        title="Employees"
        description="Manage your team — invite members, set roles and types, track their open deals and service tickets."
      />

      {sp.invited === "1" ? (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Employee invited successfully. Temporary password: <code className="font-mono font-semibold">TempPass123!</code> — ask them to change it on first login.
        </div>
      ) : null}
      {sp.error === "email_taken" ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          That email is already registered. Ask the person to log in or use a different address.
        </div>
      ) : null}

      {/* ── Summary strip ─────────────────────────────── */}
      <div className="mb-8 grid gap-3 sm:grid-cols-5">
        {EMPLOYEE_TYPES.map((t) => (
          <div key={t} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className={`mb-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${TYPE_COLOR[t]}`}>
              {t}
            </p>
            <p className="text-2xl font-bold tabular-nums">{typeCounts[t]}</p>
          </div>
        ))}
      </div>

      {/* ── Invite form ───────────────────────────────── */}
      <Card className="mb-8 border-border shadow-sm">
        <CardHeader>
          <CardTitle>Invite team member</CardTitle>
          <CardDescription>
            Creates an account under your workspace. Temporary password:{" "}
            <code className="font-mono text-xs">TempPass123!</code> — employee must change it after first login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={inviteEmployee} className="grid max-w-2xl gap-3 sm:grid-cols-2">
            <input
              name="firstName"
              required
              placeholder="First name"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            />
            <input
              name="lastName"
              placeholder="Last name"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            />
            <input
              name="email"
              type="email"
              required
              placeholder="Work email"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            />
            <input
              name="phone"
              placeholder="Phone (optional)"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            />
            <select
              name="employeeType"
              defaultValue={EmployeeType.Sales}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {EMPLOYEE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              name="role"
              defaultValue={Role.employee}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r === "admin" ? "Admin" : "Employee"}</option>
              ))}
            </select>
            <div className="sm:col-span-2">
              <Button type="submit">Send invite</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Team directory ────────────────────────────── */}
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Team directory</CardTitle>
            <CardDescription>Click "Update" after changing type or role inline.</CardDescription>
          </div>
          <form method="get" className="flex w-full max-w-xs gap-2">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search team"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            />
            <Button type="submit" variant="secondary" size="sm">Search</Button>
          </form>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-center">Open Deals</TableHead>
                <TableHead className="text-center">Tickets</TableHead>
                <TableHead className="w-[100px] text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    {q ? `No employees match "${q}".` : "No employees yet."}
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">
                      {emp.firstName} {emp.lastName ?? ""}
                      {emp.isSuperAdmin ? (
                        <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                          Super Admin
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{emp.email}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${TYPE_COLOR[emp.employeeType]}`}>
                        {emp.employeeType}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground capitalize">{emp.role}</TableCell>
                    <TableCell className="text-center tabular-nums">{emp._count.ownedDeals}</TableCell>
                    <TableCell className="text-center tabular-nums">{emp._count.ownedTickets}</TableCell>
                    <TableCell className="text-end">
                      <form action={updateEmployeeType} className="flex items-center justify-end gap-1">
                        <input type="hidden" name="userId" value={emp.id} />
                        <select
                          name="employeeType"
                          defaultValue={emp.employeeType}
                          className="rounded border border-border bg-background px-1.5 py-1 text-[11px] text-foreground"
                        >
                          {EMPLOYEE_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        <select
                          name="role"
                          defaultValue={emp.role}
                          className="rounded border border-border bg-background px-1.5 py-1 text-[11px] text-foreground"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{r === "admin" ? "Admin" : "Emp"}</option>
                          ))}
                        </select>
                        <Button type="submit" variant="secondary" size="sm" className="h-7 px-2 text-[11px]">
                          Update
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
