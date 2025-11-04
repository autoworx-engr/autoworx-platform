"use client";
import { cn } from "@/lib/cn";
import { useMemo, useState } from "react";
import { CompanyStat } from "../page";
import { Card, CardContent } from "@/components/ui/card";
import Avatar from "@/components/Avatar";
import Link from "next/link";
import ReportsSection from "../components/ReportsSection";
import { useGetAllBugReports } from "@/hooks/bug-reports/useGetAllBugReports";
import { useDebounce } from "@/hooks/useDebounce";
import { Search } from "lucide-react";
import moment from "moment";

type Props = {
  companies: CompanyStat[];
};

const statistics = [
  { title: "Total Revenue", value: "567" },
  { title: "Total Contracts", value: "737" },
  { title: "Churn Rate", value: "567" },
  { title: "Growth Rate", value: "567" },
  { title: "Bugs", value: "567" },
];

const AWXDashboard = ({ companies }: Props) => {
  const { data: reports, isFetching, isLoading } = useGetAllBugReports(20);
  const [inputValue, setInputValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const debounceSearch = useDebounce((v: string) => setSearchTerm(v), 300);

  const filteredCompanies = useMemo(
    () =>
      companies.filter((company) =>
        company.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [companies, searchTerm]
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    debounceSearch(value);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-4 text-xs 2xl:text-base">
      <div className="flex flex-col gap-x-8 gap-y-8 xl:flex-row">
        {/* Statistics Section */}
        <div className="w-full space-y-4 sm:w-fit">
          <h2 className="text-2xl font-bold text-[#66738C]">Statistics</h2>
          <div className="grid w-full grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-1">
            {statistics.map((stat, index) => (
              <Card
                key={index}
                className="h-[120px] w-full bg-white sm:h-[150px] md:w-[220px]"
              >
                <CardContent className="w-full px-4 py-6 text-[#66738C] sm:p-7">
                  <div className="mb-2 text-base font-semibold sm:text-xl">
                    {stat.title}
                  </div>
                  <div className="text-3xl font-bold sm:text-[44px]">
                    {stat.value}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <ReportsSection
          reports={reports!}
          isFetching={isFetching}
          isLoading={isLoading}
        />

        <div className="h-full flex-1">
          <h3 className="mb-4 text-2xl font-bold text-[#66738C]">
            Company List
          </h3>

          {/* Search */}
          <div className="relative min-w-0 flex-1 pb-12">
            <Search className="absolute w-4 h-4 left-2 top-2 text-gray-400 2xl:left-3 2xl:top-3" />
            <input
              type="text"
              value={inputValue}
              onChange={handleSearch}
              placeholder="Search by company name"
              className="w-full rounded border border-gray-300 p-2 pl-10 focus:outline-[#6571FF]"
            />
          </div>
          <div className="custom-scrollbar h-full max-h-[calc(100vh-220px)] w-full rounded-md bg-white shadow-md">
            <div className="h-full p-3 sm:p-4 2xl:p-5">
              <div className="space-y-4 sm:space-y-6  ">
                {filteredCompanies.length == 0 && (
                  <p className="text-center text-sm">
                    {searchTerm
                      ? `No companies found matching "${searchTerm}"`
                      : "No companies found"}
                  </p>
                )}
                {filteredCompanies.map((company, index) => (
                  <Link
                    href={`/awx-dashboard/statistics/${company?.id}`}
                    key={index}
                    className={cn(
                      "flex cursor-pointer flex-col rounded border-2  p-3 transition-all duration-200 hover:border-[#6571ff] hover:shadow-sm sm:p-4 lg:flex-row lg:items-center lg:gap-6 lg:p-6 2xl:gap-8 2xl:p-8"
                    )}
                  >
                    {/* company info */}
                    <div className="flex w-full flex-1 items-start gap-3 sm:gap-4 lg:gap-6">
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
                          className="rounded-full"
                        />
                      </div>
                      <div className="lex-1 space-y-1 sm:space-y-2 min-w-0">
                        <p className="text-lg md:text-xl  font-semibold">
                          {company.name}
                        </p>
                        <p className="text-sm italic">{company.adminEmail}</p>
                        <p>Users : {company.stats.users}</p>
                        <p>Clients : {company.stats.clients}</p>
                        <p>Employee : {company.stats.employees}</p>
                      </div>
                    </div>
                    <div className="my-4 h-px w-full bg-gray-300 lg:mx-4 lg:my-0 lg:h-16 lg:w-px"></div>
                    {/* payment info */}
                    <div className="w-full space-y-1 sm:space-y-2 lg:w-auto lg:min-w-[280px] xl:min-w-[320px] 2xl:min-w-[360px]">
                      <p className="pb-2 text-base font-semibold md:text-lg">
                        Subscribed to{" "}
                        <b>
                          <i className="font-bold">Autoworx Basic Plan</i>
                        </b>
                      </p>
                      <p className="text-base md:text-lg italic">
                        Activated On :{" "}
                        <i className="font-semibold">
                          {moment(company.createdAt).format("D MMMM, YYYY")}
                        </i>
                      </p>
                      {/* <p className=" text-base md:text-lg italic">
                        Expires On :{" "}
                        <i className="font-semibold">8 August, 2024</i>
                      </p> */}
                      <p className="pt-2 text-base md:text-lg font-semibold">
                        Payment Status : PAID
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AWXDashboard;
