import Avatar from "@/components/Avatar";
import { User } from "@prisma/client";
import EditEmployee from "../EditEmployee";
import { EmployeeWorkInfo } from "./employeeWorkInfoType";
import Payout from "./Payout";
import PayoutSales from "./PayoutSales";
import ResponsiveEmployeeCard from "@/components/mobile-responsive/employee/ResponsiveEmployeeCard";
import { db } from "@/lib/db";
import { Mail, MapPin, Phone } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/authOptions";
// import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";

export default async function EmployeeInformation({
  employee,
  info,
}: {
  employee: User;
  info: EmployeeWorkInfo;
}) {
  const session = await getServerSession(authOptions);
  const currentUser = session?.user;

  const isAdmin = currentUser?.employeeType === "Admin";
  const isManager = currentUser?.employeeType === "Manager";
  const isSelf = currentUser?.id && Number(currentUser.id) === employee.id;
  const isTargetAdmin = employee.employeeType === "Admin";

  const canEdit = isAdmin || (isManager && !isTargetAdmin) || isSelf;

  // const timezone = useCompanyTimezone();
  const company = await db.company.findUnique({
    where: { id: employee.companyId },
    select: { timezone: true },
  });
  const timezone =
    company?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <div className="flex flex-col md:flex-row w-full gap-8">
      <div
        className="
        hidden md:flex w-full flex-col 2xl:flex-row
        rounded-3xl 
        bg-white dark:bg-slate-900 
        shadow-[0_2px_24px_rgba(0,0,0,0.04)] dark:shadow-black/20
        ring-1 ring-slate-200 dark:ring-slate-800
        overflow-hidden
      "
      >
        {/* Identity Column (Left) */}
        <div className="flex min-w-[300px] flex-col xl:flex-row 2xl:flex-col items-center justify-center xl:justify-start 2xl:justify-center xl:gap-6 border-r border-slate-100 bg-slate-50/50 p-8 pb-4 text-center dark:border-slate-800 dark:bg-slate-800/30">
          <div className="relative">
            <div className="rounded-full p-1.5 bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
              <Avatar photo={employee.image} width={96} height={96} />
            </div>
            <div className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-4 border-white bg-emerald-500 dark:border-slate-900"></div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {employee.firstName} {employee.lastName}
            </h2>
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary dark:bg-indigo-500/10 dark:text-indigo-300">
                {employee.employeeType}
              </span>
            </div>
          </div>
        </div>

        {/* Information Grid (Right) */}
        <div className="flex flex-1 flex-col p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Contact & Personal Details
              </h3>
              <p className="text-sm text-slate-500">
                Manage contact info and primary details.
              </p>
            </div>
            {canEdit && <EditEmployee employee={employee} />}
          </div>

          <div className="grid flex-1 grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
            {/* Email */}
            <div className="group flex flex-col gap-1.5">
              <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                <Mail size={16} /> Email Address
              </label>
              <div
                className="truncate text-base ml-1 font-medium text-slate-600 dark:text-slate-300 group-hover:text-primary transition-colors cursor-default"
                title={employee.email}
              >
                {employee.email}
              </div>
            </div>

            {/* Phone */}
            <div className="group flex flex-col gap-1.5">
              <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                <Phone size={16} /> Phone Number
              </label>
              <div className="text-base font-medium text-slate-600 dark:text-slate-300 group-hover:text-primary transition-colors cursor-default ml-1">
                {employee.phone || "Not Provided"}
              </div>
            </div>

            {/* Address */}
            <div className="group flex flex-col gap-1.5">
              <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                <MapPin size={16} /> Address
              </label>
              <div className="truncate text-base font-medium text-slate-600 dark:text-slate-300 group-hover:text-primary transition-colors cursor-default ml-1">
                {employee.address || "No Address Listed"}
              </div>
            </div>

            {/* Additional Field Mock (Timezone) */}
            <div className="group flex flex-col gap-1.5">
              <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                <MapPin size={16} /> Timezone
              </label>
              <div className="text-base ml-1 font-medium text-slate-600 dark:text-slate-300">
                {timezone}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- MOBILE VIEW --- */}
      <div className="relative md:hidden">
        <div className="absolute right-2 top-2 z-10">
          {canEdit && <EditEmployee employee={employee} settingIcon />}
        </div>
        <ResponsiveEmployeeCard data={employee} index={0} />
      </div>

      {/* --- PAYOUT SECTION --- */}
      {/* Placed below the landscape card */}
      <div className="w-full">
        {employee.employeeType !== "Sales" ? (
          <Payout info={info} showBreakdown={true} />
        ) : (
          <PayoutSales employee={employee} timezone={timezone} />
        )}
      </div>
    </div>
  );
}
