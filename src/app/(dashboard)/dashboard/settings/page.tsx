import {
  updatePassword,
  updateProfile,
  updateWorkspaceSettings,
} from "@/actions/crm/settings";
import { CrmPageHeader } from "@/components/crm/page-header";
import { LuminarLogo } from "@/components/crm/CrmLogoMark";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import {
  Building2,
  CheckCircle2,
  KeyRound,
  Palette,
  ShieldCheck,
  User,
  Globe,
  Info,
} from "lucide-react";
import { Metadata } from "next";
import { HeaderThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = { title: "Settings" };

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Vancouver",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Warsaw",
  "Europe/Istanbul",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Pacific/Auckland",
];

const fieldClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const session = await requireSession();
  const companyId = session.user.companyId;
  const userId = Number(session.user.id);
  const sp = await searchParams;

  const [company, user] = await Promise.all([
    db.company.findUnique({
      where: { id: companyId },
      select: { name: true, timezone: true, createdAt: true },
    }),
    db.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        employeeType: true,
        twoFactorEnabled: true,
        isSuperAdmin: true,
        createdAt: true,
      },
    }),
  ]);

  const errorMessages: Record<string, string> = {
    password_weak:     "New password must be at least 8 characters.",
    password_mismatch: "New password and confirmation do not match.",
    password_wrong:    "Current password is incorrect.",
  };

  return (
    <div className="space-y-8">
      <CrmPageHeader
        title="Settings"
        description="Manage your profile, workspace, security, and appearance."
      />

      {/* ── Success / error banners ──────────────────── */}
      {sp.success === "password" ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800/40 dark:bg-emerald-900/15 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Password updated successfully.
        </div>
      ) : null}
      {sp.error && errorMessages[sp.error] ? (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
          <Info className="h-4 w-4 shrink-0" />
          {errorMessages[sp.error]}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">

        {/* ── Left column ─────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">

          {/* Profile */}
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center gap-3 pb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Profile</CardTitle>
                <CardDescription>Your personal details visible to teammates.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form action={updateProfile} className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    First name
                  </label>
                  <input
                    name="firstName"
                    required
                    defaultValue={user?.firstName ?? ""}
                    placeholder="First name"
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Last name
                  </label>
                  <input
                    name="lastName"
                    defaultValue={user?.lastName ?? ""}
                    placeholder="Last name"
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user?.email ?? ""}
                    readOnly
                    className={`${fieldClass} cursor-not-allowed opacity-60`}
                    title="Email cannot be changed here"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Email is read-only. Contact your admin to update.
                  </p>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Phone
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={user?.phone ?? ""}
                    placeholder="+1 555 000 0000"
                    className={fieldClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit">Save profile</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Workspace */}
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center gap-3 pb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
                <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-base">Workspace</CardTitle>
                <CardDescription>Company-wide settings shared across all team members.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form action={updateWorkspaceSettings} className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Company name
                  </label>
                  <input
                    name="name"
                    required
                    defaultValue={company?.name ?? ""}
                    placeholder="Your company name"
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    Timezone
                  </label>
                  <select
                    name="timezone"
                    defaultValue={company?.timezone ?? "UTC"}
                    className={fieldClass}
                  >
                    {COMMON_TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit">Save workspace</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Password */}
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center gap-3 pb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
                <KeyRound className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-base">Change password</CardTitle>
                <CardDescription>Use a strong password of at least 8 characters.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form action={updatePassword} className="space-y-3 max-w-sm">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Current password
                  </label>
                  <input
                    name="currentPassword"
                    type="password"
                    required
                    placeholder="••••••••"
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    New password
                  </label>
                  <input
                    name="newPassword"
                    type="password"
                    required
                    minLength={8}
                    placeholder="Min. 8 characters"
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Confirm new password
                  </label>
                  <input
                    name="confirmPassword"
                    type="password"
                    required
                    placeholder="Repeat new password"
                    className={fieldClass}
                  />
                </div>
                <Button type="submit">Update password</Button>
              </form>
            </CardContent>
          </Card>

        </div>

        {/* ── Right sidebar ────────────────────────────── */}
        <div className="space-y-6">

          {/* Branding card */}
          <Card className="border-border shadow-sm overflow-hidden">
            <div className="flex items-center justify-center bg-zinc-950 px-6 py-7">
              <LuminarLogo width={80} height={80} />
            </div>
            <CardContent className="pt-4 pb-5 space-y-1 text-center">
              <p className="text-sm font-semibold text-foreground">Luminar CRM</p>
              <p className="text-xs text-muted-foreground">Revenue workspace</p>
              {company?.createdAt ? (
                <p className="text-[11px] text-muted-foreground/60">
                  Workspace since{" "}
                  {new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(
                    company.createdAt,
                  )}
                </p>
              ) : null}
            </CardContent>
          </Card>

          {/* Account info */}
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center gap-3 pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                <ShieldCheck className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <CardTitle className="text-sm">Account info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow label="Role" value={user?.role ?? "—"} capitalize />
              <InfoRow label="Employee type" value={user?.employeeType ?? "—"} />
              <InfoRow
                label="2FA"
                value={user?.twoFactorEnabled ? "Enabled" : "Disabled"}
                highlight={user?.twoFactorEnabled ? "emerald" : "zinc"}
              />
              {user?.isSuperAdmin ? (
                <InfoRow label="Access" value="Super Admin" highlight="violet" />
              ) : null}
              {user?.createdAt ? (
                <InfoRow
                  label="Member since"
                  value={new Intl.DateTimeFormat("en", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }).format(user.createdAt)}
                />
              ) : null}
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center gap-3 pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10">
                <Palette className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <CardTitle className="text-sm">Appearance</CardTitle>
                <CardDescription className="text-xs">Toggle between light and dark mode.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Theme</p>
                  <p className="text-xs text-muted-foreground">Light · Dark · System</p>
                </div>
                <HeaderThemeToggle />
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  capitalize,
  highlight,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
  highlight?: "emerald" | "zinc" | "violet";
}) {
  const pill: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    zinc:    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
    violet:  "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  };

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      {highlight ? (
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${pill[highlight]}`}>
          {capitalize ? value.charAt(0).toUpperCase() + value.slice(1) : value}
        </span>
      ) : (
        <span className={`font-medium text-foreground ${capitalize ? "capitalize" : ""}`}>
          {value}
        </span>
      )}
    </div>
  );
}
