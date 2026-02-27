import SalesPipelineSection from "./_components/SalesPipelineSection";
import SearchSection from "./_components/SearchSection";
import { ColumnProvider } from "@/context/sales-pipeline.context";
import { getSalePipelineColumns } from "@/actions/pipelines/getSalePipelineColumns";

type TProps = {
  searchParams: {
    searchTerm?: string;
  };
};

export default async function SalesPipelinePage({ searchParams }: TProps) {
  const columnType = "sales";
  const pipelineColumns = await getSalePipelineColumns(
    columnType,
    searchParams?.searchTerm,
    true // Initial load - fetch only limited leads per column for fast loading
  );

  return (
    <div className="space-y-8">
      <div className="mb-4 px-2">
        <SearchSection searchValue={searchParams.searchTerm} />
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
