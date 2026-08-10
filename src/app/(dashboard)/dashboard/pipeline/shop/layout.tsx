import { requireRouteAccess } from "@/lib/serverRouteGuard";
import PipelineHeader from "../components/PipelineHeader";

export const dynamic = "force-dynamic";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRouteAccess("/dashboard/pipeline/shop/pipeline");

  const toggleButtons = [
    { label: "Pipeline", href: "/dashboard/pipeline/shop/pipeline" },
    { label: "Workorders", href: "/dashboard/pipeline/shop/workorder" },
  ];

  return (
    <div>
      <PipelineHeader
        title="Shop Pipeline"
        toggleButtons={toggleButtons}
        type="shop"
      />
      {children}
    </div>
  );
}
