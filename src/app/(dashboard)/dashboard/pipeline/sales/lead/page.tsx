import { getColumnsByType } from "@/actions/pipelines/pipelinesColumn";
import Leads from "../../components/Leads";
import { Suspense } from "react";
import CarLoading from "@/components/common/CarLoading";

export const dynamic = "force-dynamic";

// Loading component for better UX
function LoadingLeads() {
  return <CarLoading />;
}

export default async function Page() {
  const columns = await getColumnsByType("sales");
  return (
    <Suspense fallback={<LoadingLeads />}>
      <Leads salesColumn={columns} />
    </Suspense>
  );
}
