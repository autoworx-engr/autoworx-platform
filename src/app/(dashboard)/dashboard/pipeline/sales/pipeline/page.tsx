import SalesPipelineSection from "./_components/SalesPipelineSection";
import SearchSection from "./_components/SearchSection";
import OrderSelect from "./_components/FilterLead";
import { ColumnProvider } from "@/context/sales-pipeline.context";
import { serverFetchJson } from "@/lib/server-fetch";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pipelines - Sales Pipeline",
  description: "Manage your sales pipeline",
};

type TProps = {
  searchParams: Promise<{
    searchTerm?: string;
    orderBy?: "asc" | "desc" | undefined;
  }>;
};

export default async function SalesPipelinePage({ searchParams }: TProps) {
  const resolvedSearchParams = await searchParams;
  const { searchTerm, orderBy } = resolvedSearchParams;

  const { data: parsed } = await serverFetchJson(
    "/api/pipeline/sales/pipeline",
    {
      params: {
        searchTerm,
        initialLoad: "true",
        orderBy,
      },
    },
  );

  let pipelineColumns = [];
  if (parsed?.success) {
    pipelineColumns = parsed.data;
  }

  return (
    <div className="space-y-8">
      <div className="mb-4 px-2 flex items-center gap-2">
        <SearchSection searchValue={searchTerm} />
        <OrderSelect searchParams={resolvedSearchParams} />
      </div>
      <ColumnProvider
        initialColumns={pipelineColumns}
        companyUsers={[]}
        searchTerm={searchTerm}
        orderBy={orderBy}
      >
        <SalesPipelineSection />
      </ColumnProvider>
    </div>
  );
}
