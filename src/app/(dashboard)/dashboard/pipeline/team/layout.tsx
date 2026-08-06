import { requireRouteAccess } from "@/lib/serverRouteGuard";
import PipelineHeader from "../components/PipelineHeader";

export const dynamic = "force-dynamic";

export default async function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRouteAccess("/dashboard/pipeline/team/pipeline");

  const toggleButtons = [
    { label: "Pipeline", href: "/dashboard/pipeline/team/pipeline" },
    { label: "Workorders", href: "/dashboard/pipeline/team/workorder" },
  ];

  return (
    <div>
      <PipelineHeader
        title="Team Pipeline"
        toggleButtons={toggleButtons}
        type="team"
      />
      {children}
    </div>
  );
}
