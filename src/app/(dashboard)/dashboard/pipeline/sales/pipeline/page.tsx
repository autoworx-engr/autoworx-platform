import SalesPipelineSection from "./_components/SalesPipelineSection";
import SearchSection from "./_components/SearchSection";
import OrderSelect from "./_components/OrderSelect";
import { ColumnProvider } from "@/context/sales-pipeline.context";
import { getSalePipelineColumns } from "@/actions/pipelines/getSalePipelineColumns";
import ResetButton from "./_components/ResetButton";

type TProps = {
  searchParams: {
    searchTerm?: string;
    orderBy?: "asc" | "desc" | undefined;
  };
};

export default async function SalesPipelinePage({ searchParams }: TProps) {
  const columnType = "sales";
  const pipelineColumns = await getSalePipelineColumns(
    columnType,
    searchParams?.searchTerm,
    true, // Initial load - fetch only limited leads per column for fast loading
    searchParams?.orderBy,
  );


  return (
    <div className="space-y-8">
      <div className="mb-4 px-2 flex items-center gap-2">
        <SearchSection searchValue={searchParams.searchTerm} />
        <OrderSelect />
        {(searchParams.searchTerm || searchParams.orderBy) && <ResetButton searchParams={searchParams} />}
      </div>
      <ColumnProvider
        initialColumns={pipelineColumns}
        companyUsers={[]}
        searchTerm={searchParams.searchTerm}
      >
        <SalesPipelineSection />
      </ColumnProvider>
    </div>
  );
}
