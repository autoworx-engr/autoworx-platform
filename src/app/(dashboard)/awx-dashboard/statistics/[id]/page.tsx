import Avatar from "@/components/Avatar";
import { db } from "@/lib/db";
import Link from "next/link";
import CompanyReportSection from "../../components/CompanyReportSection";
import FeaturePermission from "../../components/FeaturePermission";
import { ConfigureCommunicationHub } from "./ConfigureCommunicationHub";
import { CompanyPlanEditor } from "./CompanyPlanEditor";
import { PlatformPlanToggle } from "./PlatformPlanToggle";
import { ArrowLeft, Upload } from "lucide-react";
import moment from "moment";
import { CannedUploadModal } from "@/app/(dashboard)/dashboard/estimate/canned/CannedUploadModal";
import { Button } from "@/components/ui/button";

type propsType = {
  params: Promise<{
    id?: string;
  }>;
};

const statusStyles: Record<string, { text: string; className: string }> = {
  ACTIVE: {
    text: "ACTIVE",
    className:
      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 px-3 py-1 rounded-full text-xs font-semibold",
  },
  TRIALING: {
    text: "TRIALING",
    className:
      "bg-sky-50 text-sky-700 ring-1 ring-sky-600/20 px-3 py-1 rounded-full text-xs font-semibold",
  },
  PAST_DUE: {
    text: "PAST DUE",
    className:
      "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 px-3 py-1 rounded-full text-xs font-semibold",
  },
  CANCELED: {
    text: "CANCELED",
    className:
      "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20 px-3 py-1 rounded-full text-xs font-semibold",
  },
  UNPAID: {
    text: "UNPAID",
    className:
      "bg-orange-50 text-orange-700 ring-1 ring-orange-600/20 px-3 py-1 rounded-full text-xs font-semibold",
  },
};

const defaultStatusStyle = {
  text: "NO SUBSCRIPTION",
  className:
    "bg-slate-50 text-slate-700 ring-1 ring-slate-600/20 px-3 py-1 rounded-full text-xs font-semibold",
};

interface StatRowProps {
  heading: string;
  number: number | string;
  dollarSign?: boolean;
}

const StatRow = ({ heading, number, dollarSign }: StatRowProps) => (
  <div className="flex justify-between items-center p-3 rounded-xl bg-slate-100/50 dark:bg-slate-700/50 transition duration-300 hover:bg-slate-100 dark:hover:bg-slate-700">
    <span className="text-base font-medium text-slate-500 dark:text-slate-400">
      {heading}
    </span>
    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#00b8b0] to-[#0098da]">
      {dollarSign ? "$" : ""}
      {number}
    </span>
  </div>
);

const Page = async (props: propsType) => {
  const params = await props.params;
  const { id } = params;

  const [company, subscription, revenueAgg, contractCount, clientCount] =
    await Promise.all([
      db.company.findUnique({
        where: { id: Number(id) },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
          enforcePlatformPlan: true,
          users: { select: { employeeType: true } },
          clients: { select: { id: true } },
        },
      }),
      db.platformSubscription.findUnique({
        where: { companyId: Number(id) },
        include: {
          plan: { include: { features: true } },
        },
      }),
      db.invoice.aggregate({
        where: { companyId: Number(id) },
        _sum: { grandTotal: true },
      }),
      db.invoice.count({ where: { companyId: Number(id) } }),
      db.client.count({ where: { companyId: Number(id) } }),
    ]);

  let sales = 0,
    technicians = 0,
    managers = 0,
    others = 0;

  if (company) {
    for (const user of company.users) {
      switch (user.employeeType) {
        case "Sales":
          sales++;
          break;
        case "Manager":
          managers++;
          break;
        case "Technician":
          technicians++;
          break;
        case "Other":
          others++;
          break;
      }
    }
  }

  const employees = sales + technicians + managers + others;
  const totalRevenue = Number(revenueAgg._sum.grandTotal ?? 0).toFixed(2);

  const badge = subscription?.status
    ? (statusStyles[subscription.status] ?? defaultStatusStyle)
    : defaultStatusStyle;

  return (
    <div className="h-full bg-[#F8F9FA] px-4 text-xs 2xl:text-base">
      <div className="flex flex-col items-start justify-center space-y-8 lg:flex-row lg:space-x-6 lg:space-y-4">
        <div className="flex flex-1 w-full flex-col gap-6 lg:flex-row">
          <div className="flex h-full flex-col gap-4 lg:w-[40%]">
            {/* company info */}
            <div>
              <div className="flex items-center gap-2">
                <Link href="/awx-dashboard">
                  <ArrowLeft className="text-lg" />
                </Link>
                <h3 className="my-4 text-lg font-bold md:text-xl lg:text-2xl">
                  Company Details
                </h3>
              </div>

              <div className=" bg-background rounded-md shadow-lg ">
                {/* Top Section */}
                <div className="p-6 pb-4">
                  <div className="flex flex-col items-center text-center">
                    <Avatar
                      photo={
                        company?.image ? company?.image : "/icons/business.png"
                      }
                      width={80}
                      height={80}
                      alt={company?.name}
                      className="rounded-full ring-2 ring-primary/50"
                    />
                    <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 md:text-xl mt-3">
                      {company?.name}
                    </h3>
                    <p className="text-sm italic text-slate-500 dark:text-slate-400 mt-1">
                      {company?.email}
                    </p>
                  </div>
                </div>

                {/* Stats Section */}
                <div className="px-6 pb-4">
                  <div className="flex justify-around gap-4 py-4 border-y border-slate-200 dark:border-slate-700">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                        {company?.users?.length || 0}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Users
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                        {company?.clients?.length || 0}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Clients
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                        {employees}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Employee
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team Breakdown */}
                <div className="px-6 py-4">
                  <h4 className="font-semibold text-slate-600 dark:text-slate-300 mb-3">
                    Team Breakdown
                  </h4>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between transition duration-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 p-1.5 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-sky-400 rounded-full ring-2 ring-sky-400/50"></div>
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                          Technicians
                        </span>
                      </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {technicians}
                      </span>
                    </div>

                    <div className="flex items-center justify-between transition duration-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 p-1.5 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full ring-2 ring-green-400/50"></div>
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                          Sales
                        </span>
                      </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {sales}
                      </span>
                    </div>

                    <div className="flex items-center justify-between transition duration-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 p-1.5 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-violet-400 rounded-full ring-2 ring-violet-400/50"></div>
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                          Managers
                        </span>
                      </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {managers}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 ring-1 ring-slate-200 dark:ring-slate-700 p-6">
              <div className="mb-6 flex items-center justify-between">
                <span className="text-xl font-bold text-slate-700 dark:text-slate-200 md:text-2xl">
                  Statistics
                </span>
              </div>
              <div className="space-y-4">
                <StatRow
                  heading="Total Revenue"
                  number={totalRevenue}
                  dollarSign
                />
                <StatRow heading="Total Invoices" number={contractCount} />
                <StatRow heading="Total Clients" number={clientCount} />
              </div>
            </div>
          </div>
          <div className="h-full w-full space-y-4 lg:mt-16 lg:w-[60%]">
            {/* payment info */}
            <div className="space-y-2 rounded-2xl bg-[#D3D7FF]/80 dark:bg-[#4650a3]/80 backdrop-blur-sm px-6 py-6 shadow-xl shadow-indigo-300/50 dark:shadow-indigo-900/50 ring-1 ring-indigo-200 dark:ring-indigo-700 transition duration-300 hover:shadow-2xl">
              <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
                Subscription Details
              </h4>
              <p className="text-sm text-slate-700 dark:text-slate-200">
                Subscribed to{" "}
                <b>
                  <i className="font-extrabold text-primary dark:text-[#8b94ff]">
                    {subscription?.plan?.name ?? "No Platform Plan Assigned"}
                  </i>
                </b>
              </p>
              <p className="italic text-sm text-slate-600 dark:text-slate-300">
                Activated On :{" "}
                <i className="font-semibold text-slate-700 dark:text-slate-200">
                  {moment(company?.createdAt).format("D MMMM, YYYY")}
                </i>
              </p>

              <div className="pt-2 flex items-center gap-3">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Payment Status :
                </p>
                <span className={badge.className}>{badge.text}</span>
              </div>

              <div className="mt-4 flex items-center gap-x-4 pt-2">
                <CompanyPlanEditor companyId={Number(id)} />
                <PlatformPlanToggle
                  companyId={Number(id)}
                  initialEnabled={!!company?.enforcePlatformPlan}
                />
              </div>
            </div>
            <div className="flex flex-col md:flex-row justify-between">
              <ConfigureCommunicationHub />
              <CannedUploadModal
                buttonElement={
                  <Button
                    variant="outline"
                    className=" bg-primary hover:bg-indigo-600 focus:ring-blue-500 text-white hover:text-white"
                  >
                    <Upload size={16} /> <p>Canned Upload</p>
                  </Button>
                }
                companyId={id}
              />
            </div>

            {/* reports */}
            <CompanyReportSection />
          </div>
        </div>

        <div className="min-h-screen w-full flex-1">
          <h2 className="mb-4 text-xl font-bold lg:text-2xl">
            Feature Permissions
          </h2>
          <FeaturePermission companyId={company?.id!} />
        </div>
      </div>
    </div>
  );
};

export default Page;
