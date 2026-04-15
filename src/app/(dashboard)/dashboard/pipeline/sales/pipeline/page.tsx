import SalesPipelineSection from "./_components/SalesPipelineSection";
import SearchSection from "./_components/SearchSection";
import OrderSelect from "./_components/FilterLead";
import { ColumnProvider } from "@/context/sales-pipeline.context";
import { getSalePipelineColumns } from "@/actions/pipelines/getSalePipelineColumns";
import ResetButton from "./_components/ResetButton";

type TProps = {
  searchParams: Promise<{
    searchTerm?: string;
    orderBy?: "asc" | "desc" | undefined;
  }>;
};

export default async function SalesPipelinePage(props: TProps) {
  const searchParams = await props.searchParams;
  const columnType = "sales";
  const orderBy = searchParams.orderBy;

  const pipelineColumns = await getSalePipelineColumns(
    columnType,
    searchParams?.searchTerm,
    true, // Initial load - fetch only limited leads per column for fast loading
    orderBy,
  );


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
