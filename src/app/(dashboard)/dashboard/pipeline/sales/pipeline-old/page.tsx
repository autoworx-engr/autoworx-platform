import { getUserFromSession } from "@/lib/getCurrentUser";
import { getColumnsByType } from "@/actions/pipelines/pipelinesColumn";
import dynamic from "next/dynamic";

const SalesPipeline = dynamic(() => import("../../components/SalesPipeline"), {
  ssr: false,
});

const Page = async () => {
  const columnType = "sales";
  const pipelineColumns = await getColumnsByType(columnType);
  let user;

  try {
    user = await getUserFromSession();
  } catch (error) {
    return <div>No valid session. Please log in.</div>;
  }

  const type = "Sales Pipelines";

  return (
    <div className="space-y-8">
      <SalesPipeline
        salesPipelineDataProp={pipelineColumns}
        currentUser={user}
      />
    </div>
  );
};

export default Page;
