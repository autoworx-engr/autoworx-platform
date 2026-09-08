import { getTeamWorkOrdersList } from "@/actions/pipelines/getTeamWorkOrdersList";
import { getEmployeeFilterOption } from "@/actions/pipelines/getEmployeeFilterOptions";
import { authOptions } from "@/authOptions";
import { EmployeeType } from "@prisma/client";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Pipelines - Team List",
  description: "Every team work order in a single list",
};

const LIST_PAGE_SIZE = 20;

const TeamListPipeline = dynamic(
  () => import("../components/TeamListPipeline"),
);

const TeamListPage = async (props: {
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

  const employeeType = searchParams.type as EmployeeType | undefined;
  const employeeId = searchParams.employeeId
    ? Number(searchParams.employeeId)
    : undefined;

  const [selectedEmployee, { leads, total, hasMore }] = await Promise.all([
    employeeId ? getEmployeeFilterOption(employeeId) : null,
    getTeamWorkOrdersList(
      0,
      LIST_PAGE_SIZE,
      employeeType,
      isTechnician ? Number(currentUser?.id) : undefined,
      searchParams.search,
      employeeId,
    ),
  ]);

  return (
    <TeamListPipeline
      leads={leads}
      totalCount={total}
      hasMore={hasMore}
      employeeType={employeeType}
      employeeId={employeeId}
      selectedEmployee={selectedEmployee}
      isTechnician={isTechnician}
    />
  );
};

export default TeamListPage;
