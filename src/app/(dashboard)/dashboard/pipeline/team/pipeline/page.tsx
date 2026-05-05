import { getWorkOrdersByTechnician } from "@/actions/pipelines/getWorkOrdersPaginated";
import { getEmployeeColumnByCompany } from "@/actions/pipelines/pipelinesColumn";
import { authOptions } from "@/authOptions";
import { ShopPipelineData } from "@/types/invoiceLead";
import { EmployeeType } from "@prisma/client";
import { getServerSession } from "next-auth";
import dynamic from "next/dynamic";

const PIPELINE_PAGE_SIZE = 10;

const TeamPipelines = dynamic(() => import("../components/TeamPipeline"));

const PipelinePage = async (props: {
  searchParams: Promise<{ type?: string; search?: string }>;
}) => {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);
  const currentUser = session?.user;
  const isTechnician = currentUser?.employeeType === "Technician";

  const employeeType = searchParams.type;
  const search = searchParams.search;

  const techniciansColumn = await getEmployeeColumnByCompany(
    employeeType as EmployeeType,
  );

  let pipelineData: ShopPipelineData[] = [];

  if (techniciansColumn) {
    const uniqueTechnicians = Array.from(
      new Map(techniciansColumn.map((tech) => [tech.id, tech])).values(),
    );

    const results = await Promise.all(
      uniqueTechnicians.map((tech) =>
        getWorkOrdersByTechnician(
          tech.id,
          0,
          PIPELINE_PAGE_SIZE,
          isTechnician ? Number(currentUser?.id) : undefined,
          search,
        ),
      ),
    );

    pipelineData = uniqueTechnicians.map((tech, i) => ({
      id: tech.id,
      title: `${tech.firstName ?? ""} ${tech.lastName ?? ""}`.trim(),
      leads: results[i].leads,
      hasMore: results[i].hasMore,
      totalCount: results[i].total,
    }));
  }

  return (
    <TeamPipelines
      pipelinesTitle="Team Pipelines"
      columns={techniciansColumn}
      employeeType={employeeType as EmployeeType}
      shopPipelineDataProp={pipelineData}
      isTechnician={isTechnician}
    />
  );
};

export default PipelinePage;
