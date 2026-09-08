import { getEmployeeFilterOption } from "@/actions/pipelines/getEmployeeFilterOptions";
import { getTeamWeekSchedule } from "@/actions/pipelines/getTeamWeekSchedule";
import { authOptions } from "@/authOptions";
import { EmployeeType } from "@prisma/client";
import { Metadata } from "next";
import moment from "moment";
import { getServerSession } from "next-auth";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Pipelines - Team Week",
  description: "The team's week at a glance",
};

const TeamWeekBoard = dynamic(() => import("../components/TeamWeekBoard"));

const TeamWeekPage = async (props: {
  searchParams: Promise<{
    week?: string;
    type?: string;
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

  // Anchored in UTC so the day columns line up with the clamped day offsets the
  // action returns, regardless of where the viewer is.
  const requested = moment.utc(searchParams.week, "YYYY-MM-DD", true);
  const weekStart = (requested.isValid() ? requested : moment.utc())
    .startOf("week")
    .format("YYYY-MM-DD");

  const [selectedEmployee, members] = await Promise.all([
    employeeId ? getEmployeeFilterOption(employeeId) : null,
    getTeamWeekSchedule(
      weekStart,
      employeeType,
      employeeId,
      isTechnician ? Number(currentUser?.id) : undefined,
    ),
  ]);

  return (
    <TeamWeekBoard
      members={members}
      weekStart={weekStart}
      employeeType={employeeType}
      selectedEmployee={selectedEmployee}
    />
  );
};

export default TeamWeekPage;
