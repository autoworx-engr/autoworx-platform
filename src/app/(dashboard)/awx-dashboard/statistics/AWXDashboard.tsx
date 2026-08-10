"use client";
import { cn } from "@/lib/cn";
import { useMemo, useState } from "react";
import { CompanyStat, PlatformStats } from "../page";
import { Card, CardContent } from "@/components/ui/card";
import Avatar from "@/components/Avatar";
import Link from "next/link";
import ReportsSection from "../components/ReportsSection";
import { useGetAllBugReports } from "@/hooks/bug-reports/useGetAllBugReports";
import { useDebounce } from "@/hooks/useDebounce";
import { History, Search } from "lucide-react";
import moment from "moment";

type Props = {
  companies: CompanyStat[];
  platformStats: PlatformStats;
};

const subscriptionBadge = (
  status: string | null,
): { text: string; className: string } => {
  const map: Record<string, { text: string; className: string }> = {
    ACTIVE: {
      text: "ACTIVE",
      className:
        "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 px-3 py-1 rounded-full font-semibold whitespace-nowrap",
    },
    TRIALING: {
      text: "TRIALING",
      className:
        "bg-sky-50 text-sky-700 ring-1 ring-sky-600/20 px-3 py-1 rounded-full font-semibold whitespace-nowrap",
    },
    PAST_DUE: {
      text: "PAST DUE",
      className:
        "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 px-3 py-1 rounded-full font-semibold whitespace-nowrap",
    },
    CANCELED: {
      text: "CANCELED",
      className:
        "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20 px-3 py-1 rounded-full font-semibold whitespace-nowrap",
    },
    UNPAID: {
      text: "UNPAID",
      className:
        "bg-orange-50 text-orange-700 ring-1 ring-orange-600/20 px-3 py-1 rounded-full font-semibold whitespace-nowrap",
    },
  };
  return (
    map[status ?? ""] ?? {
      text: "NO SUBSCRIPTION",
      className:
        "bg-slate-50 text-slate-700 ring-1 ring-slate-600/20 px-3 py-1 rounded-full font-semibold",
    }
  );
};

const AWXDashboard = ({ companies, platformStats }: Props) => {
  const {
    data: bugReportsData,
    isFetching,
    isLoading,
  } = useGetAllBugReports(20);
  const reports = bugReportsData?.reports;
  const [inputValue, setInputValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const debounceSearch = useDebounce((v: string) => setSearchTerm(v), 300);

  const filteredCompanies = useMemo(
    () =>
      companies.filter(
        (company) =>
          company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          company?.adminEmail?.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [companies, searchTerm],
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    debounceSearch(value);
  };

  const statistics = [
    {
      title: "Monthly Revenue",
      value: `$${platformStats.monthlyRevenue.toLocaleString()}`,
    },
    {
      title: "Active Contracts",
      value: platformStats.totalActiveContracts,
    },
    {
      title: "Churn Rate",
      value: `${platformStats.churnRate}%`,
    },
    {
      title: "Growth Rate",
      value: `${platformStats.growthRate}%`,
    },
    { title: "Bugs", value: bugReportsData?.unresolvedCount ?? 0 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 text-xs 2xl:text-base">
      <div className="flex flex-col gap-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-700 dark:text-slate-200">
            AWX Dashboard
          </h1>
          <div className="flex items-center gap-2">
            <Link
              href="/awx-dashboard/webhook-events"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-primary hover:text-primary"
            >
              <History className="h-3.5 w-3.5" />
              Webhook Events
            </Link>
            <Link
              href="/awx-dashboard/plans"
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
            >
              Manage Plans
            </Link>
          </div>
        </div>

        {/* Statistics Section  */}
        <div className="w-full space-y-4">
          <h2 className="text-2xl font-bold text-slate-600 dark:text-slate-300">
            Statistics
          </h2>
          <div className="grid w-full grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5">
            {statistics.map((stat, index) => (
              <Card
                key={index}
                className="h-[120px] w-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 dark:hover:shadow-primary/10 sm:h-[150px] rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700 hover:z-10 hover:-translate-y-0.5"
              >
                <CardContent className="w-full px-4 py-6 sm:p-7">
                  <div className="mb-2 text-base font-semibold text-slate-500 dark:text-slate-400 sm:text-xl">
                    {stat.title}
                  </div>
                  <div className="text-3xl font-bold sm:text-[44px] bg-clip-text text-transparent bg-gradient-to-r from-[#00b8b0] to-[#0098da]">
                    {stat.value}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
          <div className="h-full col-span-1 xl:col-span-2">
            <h3 className="mb-4 text-2xl font-bold text-slate-600 dark:text-slate-300">
              Company List
            </h3>

            {/* Search Input */}
            <div className="relative min-w-0 flex-1 pb-8">
              <Search className="absolute w-4 h-4 left-3 top-2.5 text-slate-400 2xl:left-3 2xl:top-3" />
              <input
                type="text"
                value={inputValue}
                onChange={handleSearch}
                placeholder="Search by Company Name or Admin Email..."
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 p-2.5 pl-10 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Company List Container */}
            <div className="custom-scrollbar h-full max-h-[65vh] md:max-h-[calc(100vh-450px)] w-full rounded-2xl bg-white dark:bg-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 ring-1 ring-slate-200 dark:ring-slate-700 overflow-y-auto">
              <div className="h-full p-3 sm:p-4 2xl:p-5">
                <div className="space-y-4 sm:space-y-6">
                  {filteredCompanies.length == 0 && (
                    <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-10">
                      {searchTerm
                        ? `No companies found matching "${searchTerm}"`
                        : "No companies found"}
                    </p>
                  )}
                  {filteredCompanies.map((company, index) => {
                    const badge = subscriptionBadge(company.subscriptionStatus);
                    return (
                      <Link
                        href={`/awx-dashboard/statistics/${company?.id}`}
                        key={index}
                        className={cn(
                          "flex cursor-pointer flex-col rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 p-3 transition-all duration-300 hover:border-primary hover:shadow-lg hover:shadow-primary/10 dark:hover:shadow-lg dark:hover:shadow-primary/20 hover:-translate-y-0.5 sm:p-4 lg:flex-row lg:items-center lg:gap-6 lg:p-6 2xl:gap-8 2xl:p-8",
                        )}
                      >
                        {/* company info */}
                        <div className="flex w-full flex-1 items-start gap-3 sm:gap-4 lg:gap-6 min-w-0">
                          <div className="shrink-0">
                            <Avatar
                              photo={
                                company?.image
                                  ? company?.image
                                  : "/icons/business.png"
                              }
                              width={120}
                              height={120}
                              alt={company?.name}
                              className="rounded-full ring-2 ring-primary/50"
                            />
                          </div>
                          <div className="flex-1 space-y-1 sm:space-y-2 min-w-0">
                            <p className="text-lg md:text-xl font-semibold text-slate-700 dark:text-slate-200 truncate">
                              {company.name}
                            </p>
                            <p className="text-sm italic text-slate-500 dark:text-slate-400 truncate">
                              {company.adminEmail}
                            </p>
                            <p className="text-slate-600 dark:text-slate-300">
                              Users :{" "}
                              <span className="font-bold">
                                {company.stats.users}
                              </span>
                            </p>
                            <p className="text-slate-600 dark:text-slate-300">
                              Clients :{" "}
                              <span className="font-bold">
                                {company.stats.clients}
                              </span>
                            </p>
                            <p className="text-slate-600 dark:text-slate-300">
                              Employee :{" "}
                              <span className="font-bold">
                                {company.stats.employees}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Separator */}
                        <div className="my-4 h-px w-full bg-slate-300 dark:bg-slate-600 lg:mx-4 lg:my-0 lg:h-20 lg:w-px"></div>

                        {/* payment info */}
                        <div className="w-full space-y-1 sm:space-y-2 lg:w-auto lg:min-w-[280px] xl:min-w-[320px] 2xl:min-w-[360px] text-slate-600 dark:text-slate-300">
                          <p className="pb-2 text-base font-semibold md:text-lg">
                            Subscribed to{" "}
                            <b>
                              <i className="font-extrabold text-primary">
                                {company.subscriptionPlanName ??
                                  "No Plan Assigned"}
                              </i>
                            </b>
                          </p>
                          <p className="text-base md:text-lg italic">
                            Activated On :{" "}
                            <i className="font-semibold text-slate-700 dark:text-slate-200">
                              {moment(company.createdAt).format("MMMM D, YYYY")}
                            </i>
                          </p>
                          <div className="pt-2 flex items-center gap-3">
                            <p className="text-base md:text-lg font-semibold text-slate-700 dark:text-slate-200">
                              Payment Status :
                            </p>
                            <span className={badge.className}>
                              {badge.text}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Reports Section */}
          <div className="col-span-1">
            <ReportsSection
              reports={reports!}
              isFetching={isFetching}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AWXDashboard;
