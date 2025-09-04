import ChartData from "@/app/(dashboard)/dashboard/components/ChartData";
import Avatar from "@/components/Avatar";
import { db } from "@/lib/db";
import Link from "next/link";
import { IoIosArrowBack } from "react-icons/io";
import CompanyReportSection from "../../components/CompanyReportSection";
import FeaturePermission from "../../components/FeaturePermission";

type propsType = {
  params: {
    id?: string;
  };
};
const Page = async (props: propsType) => {
  const { params } = props;
  const { id } = params;
  const company = await db.company.findUnique({
    where: { id: Number(id) },
    include: {
      users: true,
      clients: true,
    },
  });

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
        default:
          break;
      }
    }
  }

  const employees = sales + technicians + managers + others;


  return (
    <div className="h-full bg-[#F8F9FA] px-4 text-xs 2xl:text-base">
      <div className="flex h-full flex-col items-start justify-center space-y-8 lg:flex-row lg:space-x-6 lg:space-y-4">
        <div className="flex flex-1 flex-col gap-6 lg:flex-row">
          <div className="flex h-full w-full flex-col gap-4 lg:w-[40%]">
            {/* company info */}
            <div>
              <div className="flex items-center gap-2">
                <Link href="/awx-dashboard">
                  <IoIosArrowBack className="text-lg" />
                </Link>
                <h3 className="my-4 text-lg font-bold md:text-xl lg:text-2xl">
                  Company Details
                </h3>
              </div>
              {/* <div className="space-y-4 rounded-md bg-background p-4 shadow-lg 2xl:p-8">


                <Avatar
                  photo={
                    company?.image ? company?.image : "/icons/business.png"
                  }
                  width={60}
                  height={60}
                  alt={company?.name}
                />
                <div className="space-y-1">
                  <p className="text-2xl font-semibold">{company?.name}</p>
                  <p className="text-xl font-medium">
                    Users : {company?.users?.length}
                  </p>
                  <p className="text-xl font-medium">
                    Clients : {company?.clients?.length}
                  </p>
                  <p className="text-xl font-medium">Employees : {employees}</p>

                  <ul className="ml-4 mt-2 list-disc space-y-1 pl-4">
                    <li>Technicians : {technicians}</li>
                    <li>Sales : {sales}</li>
                    <li>Managers : {managers}</li>
                  </ul>
                </div>
              </div> */}


              <div className="w-full  mx-auto bg-background  rounded-md shadow-lg ">
      {/* Top Section */}
      <div className="p-6 pb-4">
        <div className="flex flex-col items-center text-center">
          <Avatar
            photo={
                    company?.image ? company?.image : "/icons/business.png"
                  }
           width={60}
            height={60}
            alt={company?.name}
          />
          <h3 className="text-base md:text-xl  font-semibold  mt-3">{company?.name}</h3>

        </div>
      </div>

      {/* Stats Section */}
      <div className="px-6 pb-4">
        <div className="flex justify-center gap-8">
          <div className="text-center">
            <div className="text-xl font-semibold ">{company?.users?.length || 0}</div>
            <div className="text-xs text-gray-500 mt-0.5">Users</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold ">{company?.clients?.length || 0}</div>
            <div className="text-xs text-gray-500 mt-0.5">Clients</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold ">{employees}</div>
            <div className="text-xs text-gray-500 mt-0.5">Employee</div>
          </div>
        </div>
      </div>

      {/* Team Breakdown */}
      <div className="border-t border-gray-100 px-6 py-4">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-sky-400 rounded-full"></div>
              <span className="text-sm text-gray-600">Technicians</span>
            </div>
            <span className="text-sm font-medium ">{technicians}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
              <span className="text-sm text-gray-600">Sales</span>
            </div>
            <span className="text-sm font-medium ">{sales}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-violet-400 rounded-full"></div>
              <span className="text-sm text-gray-600">Managers</span>
            </div>
            <span className="text-sm font-medium ">{managers}</span>
          </div>
        </div>
      </div>
    </div>
            </div>

            {/* Employee Payout */}
            <div className="rounded-md bg-background p-4 shadow-lg xl:p-8">
              <div className="mb-8 flex items-center justify-between">
                <span className="text-xl md:text-2xl font-bold">Statistics</span>{" "}
                {/* <span>
                  <FaExternalLinkAlt />
                </span> */}
              </div>
              <div className="#px-4 space-y-4">
                <ChartData
                  heading="Total Revenue"
                  number={567}
                  dollarSign
                  noRate
                />
                <ChartData
                  heading="Total Contracts"
                  number={767}
                  dollarSign
                  noRate
                />
                <ChartData
                  heading="Client Growth"
                  number={435}
                  dollarSign
                  noRate
                />
              </div>
            </div>
          </div>
          <div className="h-full w-full space-y-4 lg:mt-16 lg:w-[60%]">
            {/* payment info */}
            <div className="space-y-2 rounded-lg bg-[#D3D7FF] px-6 py-6 shadow-lg">
              <p>
                Subscribed to{" "}
                <b>
                  <i>Autoworx Basic Plan</i>
                </b>
              </p>
              <p className="italic">
                Activated On :{" "}
                <i>
                  <b>8 August, 2024</b>
                </i>
              </p>
              <p className="italic">
                Expires On :{" "}
                <i>
                  <b>8 August, 2024</b>
                </i>
              </p>
              <p className="font-semibold">Payment Status : PAID</p>
              <p className="mt-4 flex items-center gap-x-4">
                <button className="rounded bg-[#6571ff] px-2 py-1 text-white">
                  Upgrade
                </button>
                <button className="rounded bg-[#6571ff] px-2 py-1 text-white">
                  Cancel
                </button>
              </p>
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
