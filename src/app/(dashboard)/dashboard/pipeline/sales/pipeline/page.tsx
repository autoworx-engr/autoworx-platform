import SalesPipelineSection from "./_components/SalesPipelineSection";
import SearchSection from "./_components/SearchSection";
import OrderSelect from "./_components/FilterLead";
import { ColumnProvider } from "@/context/sales-pipeline.context";
import { serverFetchJson } from "@/lib/server-fetch";

type TProps = {
  searchParams: {
    searchTerm?: string;
    orderBy?: "asc" | "desc" | undefined;
  };
};

export default async function SalesPipelinePage({ searchParams }: TProps) {
  const orderBy = searchParams.orderBy;

  const { data: parsed } = await serverFetchJson(
    "/api/pipeline/sales/pipeline",
    {
      params: {
        searchTerm: searchParams?.searchTerm,
        initialLoad: "true",
        orderBy: orderBy,
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
        <SearchSection searchValue={searchParams.searchTerm} />
        <OrderSelect searchParams={searchParams} />
      </div>
      <ColumnProvider
        initialColumns={pipelineColumns}
        companyUsers={[]}
        searchTerm={searchParams.searchTerm}
        orderBy={orderBy}
      >
        <SalesPipelineSection />
      </ColumnProvider>
    </div>
  );
}
