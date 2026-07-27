import Title from "@/components/Title";
import { ArrowRight, PieChart } from "lucide-react";
import Link from "next/link";
import "react-date-range/dist/styles.css"; // main style file
import "react-date-range/dist/theme/default.css"; // theme css file
import EmployeeFilter from "./components/EmployeeFilter";
import EmployeeTable from "./components/EmployeeTable";
import TotalPayouts from "./TotalPayouts";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Directory - Employee",
  description: "Manage your employees",
};

export default async function Page() {
  return (
    <div className="h-full w-full space-y-4 px-2">
      <Title>Employee List</Title>

      <div className="hidden flex-wrap items-center justify-between gap-y-8 lg:flex">
        <TotalPayouts />
        <div>
          {/* /reporting/workforce */}
          <Link // Change to <Link> if using Next.js/React Router
            href="/dashboard/reporting/teams"
            className="
            group relative flex items-center gap-3 pl-3 pr-4 py-2 rounded-xl
            bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900
            ring-1 ring-slate-200 dark:ring-slate-700
            shadow-[0_1px_2px_rgba(0,0,0,0.05)]
            text-primary font-medium
            transition-all duration-300 ease-out
            hover:shadow-lg hover:shadow-indigo-500/10
            hover:-translate-y-0.5 hover:scale-[1.02]
            hover:ring-indigo-500/30 dark:hover:ring-indigo-400/30
            w-fit
          "
          >
            {/* Icon Container */}
            <div
              className="
              p-1.5 rounded-lg 
              bg-indigo-50 dark:bg-indigo-500/10 
              text-primary
              group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 
              transition-colors duration-300
            "
            >
              <PieChart className="w-5 h-5" />
            </div>

            <span className="font-inter tracking-tight">Teams Reporting</span>

            {/* Animated Arrow Micro-interaction */}
            <ArrowRight
              className="
              w-4 h-4 
              opacity-0 -translate-x-2 
              group-hover:opacity-100 group-hover:translate-x-0 
              transition-all duration-300 ease-out
            "
            />
          </Link>
        </div>
      </div>

      <EmployeeFilter />

      <EmployeeTable />
    </div>
  );
}
