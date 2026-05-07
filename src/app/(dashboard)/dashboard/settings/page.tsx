import { updateWorkspaceName } from "@/actions/crm/workspace";
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
import { requireSession } from "@/lib/require-session";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const session = await requireSession();
  const companyId = session.user.companyId;
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { name: true, timezone: true },
  });

  return (
    <div>
      <CrmPageHeader
        title="Workspace"
        description="Company-wide defaults for this CRM. Per-user profile fields stay on your auth record."
      />

      <Card className="max-w-xl border-border shadow-sm">
        <CardHeader>
          <CardTitle>Company name</CardTitle>
          <CardDescription>
            Shown in the shell and used to scope all CRM data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateWorkspaceName} className="space-y-3">
            <input
              name="name"
              required
              defaultValue={company?.name ?? ""}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
            />
            <Button type="submit">
              Save
            </Button>
          </form>
          {company?.timezone ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Timezone (read-only for now): {company.timezone}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
