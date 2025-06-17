import SalesPipelineSection from "./_components/SalesPipelineSection";
import { ColumnProvider } from "@/context/sales-pipeline.context";
import { getCompanyUser } from "@/actions/user/getCompanyUser";
import SearchSection from "./_components/SearchSection";
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
  );

  const companyUsers = await getCompanyUser({
    select: { id: true, firstName: true, lastName: true },
  });

  return (
    <div className="space-y-8">
      <div className="mb-4 px-2">
        <SearchSection searchValue={searchParams.searchTerm} />
      </div>
      <ColumnProvider
        initialColumns={pipelineColumns}
        companyUsers={companyUsers}
        searchTerm={searchParams.searchTerm}
      >
        <SalesPipelineSection />
      </ColumnProvider>
    </div>
  );
}
