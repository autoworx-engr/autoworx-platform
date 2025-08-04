import SalesPipelineSection from "./_components/SalesPipelineSection";
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
    true // Initial load - fetch only 10 leads per column for fast loading
  );

  // const companyUsers = await getCompanyUser({
  //   select: { id: true, firstName: true, lastName: true },
  // });

  return (
    <div className="space-y-8">
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
