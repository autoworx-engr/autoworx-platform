import { getWorkOrdersByColumn } from "@/actions/pipelines/getWorkOrdersPaginated";
import { getColumnsByType } from "@/actions/pipelines/pipelinesColumn";
import { authOptions } from "@/authOptions";
import { ShopPipelineData } from "@/types/invoiceLead";
import { getServerSession } from "next-auth";
import dynamic from "next/dynamic";

const PIPELINE_PAGE_SIZE = 10;

const Pipelines = dynamic(() => import("../../components/Pipelines"));

const PipelinePage = async () => {
  const session = await getServerSession(authOptions);
  const currentUser = session?.user;
  const isTechnician = currentUser?.employeeType === "Technician";

  const pipelineColumns = await getColumnsByType("shop");

  let pipelineData: ShopPipelineData[] = [];

  if (pipelineColumns) {
    const results = await Promise.all(
      pipelineColumns.map((column) =>
        column.id
          ? getWorkOrdersByColumn(
              column.id,
              0,
              PIPELINE_PAGE_SIZE,
              isTechnician ? Number(currentUser?.id) : undefined,
            )
          : Promise.resolve({ leads: [], total: 0, hasMore: false }),
      ),
    );

    pipelineData = pipelineColumns.map((column, i) => ({
      id: column.id,
      title: column.title,
      leads: results[i].leads,
      hasMore: results[i].hasMore,
      totalCount: results[i].total,
    }));
  }

  return (
    <Pipelines
      pipelinesTitle="Shop Pipelines"
      columns={pipelineColumns}
      shopPipelineDataProp={pipelineData}
      isTechnician={isTechnician}
    />
  );
};

export default PipelinePage;
