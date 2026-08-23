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
    <div>
      <div className="mb-4 px-2">
        <div className="flex w-full flex-col gap-2 rounded-lg border border-slate-100 bg-background p-2 shadow-sm sm:flex-row sm:items-center sm:justify-between mx-2">
          <SearchSection searchValue={searchTerm} />
          <div className="flex flex-row items-center gap-3 md:flex-1 md:flex-wrap md:min-w-fit justify-end">
            <div className="relative flex-shrink-0">
              <OrderSelect searchParams={resolvedSearchParams} />
            </div>
          </div>
        </div>
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
