"use client";
import { getAdminInfo } from "@/actions/dashboard/data/getAdminInfo";
import { getSalespersonLeads } from "@/actions/dashboard/data/getSalesWinRate";
import { useServerGet } from "@/hooks/useServerGet";
import SessionUserType from "@/types/sessionUserType";
import { Client, MailgunEmail, Task as TaskType, User } from "@prisma/client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FaExternalLinkAlt } from "react-icons/fa";
import Appointments from "./Appointments";
import ChartData from "./ChartData";
import RecentMessages from "./RecentMessages";
import Tasks from "./Tasks";
import { growthRate } from "@/actions/dashboard/data/lib";
import { FullMessage } from "@/actions/dashboard/technician/recentMessages";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
// import { useAutoRefreshRoute } from "@/hooks/useAutoRefreshRoute.ts";

const Dashboard = ({
  refreshTime,
  tasks = [],
  companyUsers = [],
  appointments = [],
  clientMessages,
  internalMessages,
  user,
}: {
  refreshTime: number;
  tasks: TaskType[];
  companyUsers: User[];
  appointments: any;
  clientMessages: (Client & {
    MailgunEmail: (MailgunEmail & { client: Client })[];
  })[];
  internalMessages: FullMessage[];
  user: User;
}) => {
  const timezone = useCompanyTimezone();
  const { data } = useServerGet(getAdminInfo, timezone);
  const [winLossRate, setWinLossRate] = useState<number | null>(null);
  const [winLossGrowthRate, setWinLossGrowthRate] = useState<{
    rate: number;
    isPositive: boolean;
  } | null>(null);
  const [currentUser, setCurrentUser] = useState<SessionUserType>();
  // useAutoRefreshRoute(refreshTime);
  useEffect(() => {
    const fetchUser = async () => {
      const response = await fetch("/api/getUser");
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data);
      }
    };
    fetchUser();
  }, []);
  useEffect(() => {
    const fetchWinLossRate = async () => {
      if (currentUser) {
        try {
          const {
            currentTotalLeads,
            previousTotalLeads,
            currentConvertedLeads,
            previousConvertedLeads,
          } = await getSalespersonLeads(currentUser.id);

          const currentWinLossRate =
            currentTotalLeads > 0
              ? (currentConvertedLeads / currentTotalLeads) * 100
              : 0;
          const previousWinLossRate =
            previousTotalLeads > 0
              ? (previousConvertedLeads / previousTotalLeads) * 100
              : 0;

          const growth = growthRate(currentWinLossRate, previousWinLossRate);

          setWinLossRate(currentWinLossRate);
          setWinLossGrowthRate(growth);
        } catch (error) {
          console.error("Error fetching win/loss rate:", error);
        }
      }
    };

    fetchWinLossRate();
  }, [currentUser]);
  return (
    <div className="flex h-full flex-col gap-x-2 lg:flex-row lg:items-start xl:gap-x-8">
      {/* col 1 */}
      <div className="flex h-full flex-col justify-around space-y-4 lg:w-[25%]">
        {/* task list */}
        <Tasks tasks={tasks} companyUsers={companyUsers} />
      </div>

      {/* col 2 */}
      <div className="flex h-full flex-col justify-around space-y-4 lg:w-[25%]">
        {/* appointments */}
        <Appointments fullHeight appointments={appointments} />
      </div>
      {/* col 3 */}
      <div className="#order-3 order-first h-full space-y-4 lg:order-none lg:w-[20%]">
        {/* Performance */}
        <div className="h-full rounded-md p-4 shadow-lg 2xl:px-6">
          <div className="mb-8 flex items-center justify-between">
            <span className="text-xl font-bold">Performance</span>{" "}
            <Link href="/dashboard/reporting/workforce">
              <FaExternalLinkAlt />
            </Link>
          </div>
          <div className="flex h-[80%] flex-col justify-around space-y-3">
            <ChartData
              heading="Leads coming in"
              subHeading="/month"
              number={data?.currentTotalLeads ?? 0}
              noRate={true}
            />
            <ChartData
              heading="Leads Converted"
              number={data?.leadsConvertedData?.current ?? 0}
              isPositive={data?.leadsConvertedData?.growth?.isPositive ?? false}
              rate={data?.leadsConvertedData?.growth?.rate.toFixed(2) ?? 0}
            />
            <ChartData
              heading="Win/Loss Rate"
              number={winLossRate?.toFixed(2) ?? 0}
              isNumberPercent
            />
            <ChartData heading="Employee Pay" number={0} dollarSign />
          </div>
        </div>
      </div>
      {/* col 4 */}
      <div className="flex h-full flex-col justify-around space-y-4 lg:w-[25%]">
        {/* recent messages */}
        <RecentMessages
          clientMessages={clientMessages}
          internalMessages={internalMessages}
          user={user}
        />
      </div>
    </div>
  );
};

export default Dashboard;
