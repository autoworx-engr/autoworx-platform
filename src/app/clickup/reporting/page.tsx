import { notFound, redirect } from "next/navigation";
import { checkClickupReportingAccess } from "@/lib/clickup/access";
import { getClickupListConfig } from "@/lib/clickup/config";
import ClickupReportingClient from "./_components/ClickupReportingClient";

export default async function ClickupReportingPage() {
  const access = await checkClickupReportingAccess();
  if (!access.allowed) {
    if (access.reason === "unauthenticated") redirect("/login");
    notFound();
  }

  const listConfig = getClickupListConfig();

  return (
    <div className="min-h-screen bg-muted/30 dark:bg-background">
      <ClickupReportingClient listConfig={listConfig} />
    </div>
  );
}
