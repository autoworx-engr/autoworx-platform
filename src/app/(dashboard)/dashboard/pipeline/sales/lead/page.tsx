import { getColumnsByType } from "@/actions/pipelines/pipelinesColumn";
import Title from "@/components/Title";
import Leads from "../../components/Leads";
import { Suspense } from "react";
import CarLoading from "@/components/common/CarLoading";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sales Leads",
  description: "View and manage your sales leads",
};

// Loading component for better UX
function LoadingLeads() {
  return <CarLoading />;
}

export default async function Page() {
  const columns = await getColumnsByType("sales");
  return (
    <div className="h-full w-full space-y-4 px-2">
      <Title>Sales Leads</Title>
      <Suspense fallback={<LoadingLeads />}>
        <Leads salesColumn={columns} />
      </Suspense>
    </div>
  );
}
