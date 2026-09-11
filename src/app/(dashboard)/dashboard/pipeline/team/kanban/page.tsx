import {
  getWorkOrdersByTechnician,
  getWorkOrdersForTeamSearch,
} from "@/actions/pipelines/getWorkOrdersPaginated";
import { getEmployeeFilterOption } from "@/actions/pipelines/getEmployeeFilterOptions";
import { getEmployeeColumnByCompany } from "@/actions/pipelines/pipelinesColumn";
import { authOptions } from "@/authOptions";
import { ShopPipelineData } from "@/types/invoiceLead";
import { EmployeeType } from "@prisma/client";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Pipelines - Team Pipeline",
  description: "Manage your team pipeline",
};

const PIPELINE_PAGE_SIZE = 10;

const TeamPipelines = dynamic(() => import("../components/TeamPipeline"));

const PipelinePage = async (props: {
  searchParams: Promise<{
    type?: string;
    search?: string;
    employeeId?: string;
  }>;
}) => {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);
  const currentUser = session?.user;
  const isTechnician = currentUser?.employeeType === "Technician";

  const employeeType = searchParams.type;
  const search = searchParams.search;
  const employeeId = searchParams.employeeId
    ? Number(searchParams.employeeId)
    : undefined;

  // Picking an employee narrows the board to that person's column; the dropdown
  // pages its own options, so it only needs the selected one named.
  const [selectedEmployee, techniciansColumn] = await Promise.all([
    employeeId ? getEmployeeFilterOption(employeeId) : null,
    getEmployeeColumnByCompany(employeeType as EmployeeType, employeeId),
  ]);

  let pipelineData: ShopPipelineData[] = [];

  if (techniciansColumn?.length) {
    const uniqueTechnicians = Array.from(
      new Map(techniciansColumn.map((tech) => [tech.id, tech])).values(),
    );
    const filterUserId = isTechnician ? Number(currentUser?.id) : undefined;

    if (search) {
      const techIds = uniqueTechnicians.map((t) => t.id);
      const grouped = await getWorkOrdersForTeamSearch(
        techIds,
        search,
        filterUserId,
      );
      pipelineData = uniqueTechnicians.map((tech) => {
        const r = grouped.get(tech.id) ?? {
          leads: [],
          total: 0,
          hasMore: false,
        };
        return {
          id: tech.id,
          title: `${tech.firstName ?? ""} ${tech.lastName ?? ""}`.trim(),
          leads: r.leads,
          hasMore: r.hasMore,
          totalCount: r.total,
        };
      });
    } else {
      // Per-technician paginated initial load (no search filter — stays fast)
      const results = await Promise.all(
        uniqueTechnicians.map((tech) =>
          getWorkOrdersByTechnician(
            tech.id,
            0,
            PIPELINE_PAGE_SIZE,
            filterUserId,
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
  }

  return (
    <TeamPipelines
      pipelinesTitle="Team Pipelines"
      columns={techniciansColumn}
      employeeType={employeeType as EmployeeType}
      selectedEmployee={selectedEmployee}
      shopPipelineDataProp={pipelineData}
      isTechnician={isTechnician}
    />
  );
};

export default PipelinePage;
