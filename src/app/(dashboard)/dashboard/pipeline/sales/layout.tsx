import { requireRouteAccess } from "@/lib/serverRouteGuard";
import PipelineHeader from "../components/PipelineHeader";

export const dynamic = "force-dynamic";

export default async function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRouteAccess("/dashboard/pipeline/sales/pipeline");

  const toggleButtons = [
    { label: "Pipeline", href: "/dashboard/pipeline/sales/pipeline" },
    { label: "Leads", href: "/dashboard/pipeline/sales/lead" },
  ];

  return (
    <div>
      <PipelineHeader
        title="Sales Pipeline"
        toggleButtons={toggleButtons}
        type="sales"
      />
      {children}
    </div>
  );
}
