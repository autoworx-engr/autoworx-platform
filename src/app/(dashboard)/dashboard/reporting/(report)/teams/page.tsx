import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import CalculationWithTooltip from "@/app/(dashboard)/dashboard/reporting/components/CalculationWithTooltip";
import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { normalizeSearch } from "@/utils/normalizeSearch";
import moment from "moment";
import { getServerSession } from "next-auth";
import Calculation from "../../components/Calculation";
import FilterHeader from "./FilterHeader";
import WorkforceDisplay from "./WorkforceDisplay";
import { getEmployeePayout } from "@/actions/dashboard/data/getAdminInfo";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics - Teams",
  description: "Manage employee performance and payouts",
};

// Props type
type TProps = {
  searchParams: Promise<{
    category?: string;
    startDate?: string;
    endDate?: string;
    service?: string;
    search?: string;
    employeeType?: "Admin" | "Sales" | "Technician" | "Manager" | "Other";
    page?: string;
    take?: string;
  }>;
};

// Slider type
type TSliderData = {
  id: number;
  min: number;
  max: number;
  defaultValue?: [number, number];
  type: "price" | "cost" | "profit";
};

// Filter sliders

export default async function WorkforceReportPage(props: TProps) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.companyId;
  if (!companyId) throw new Error("Unauthorized");
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const take = searchParams.take ? parseInt(searchParams.take, 10) : 50;

  // Date range filter logic
  const hasDateRange: boolean = !!(
    searchParams.startDate && searchParams.endDate
  );
  const { timezone } = await getCompanyTimezone();

  // const { currentMonthStart, currentMonthEnd } = getDateRanges(timezone);

  const formattedStartDate = hasDateRange
    ? decodeURIComponent(searchParams.startDate!) // e.g. "05/01/2025"
    : null;

  const formattedEndDate = hasDateRange
    ? decodeURIComponent(searchParams.endDate!)
    : null;

  const convertedStart = hasDateRange
    ? moment.tz(formattedStartDate!, "MM/DD/YYYY", timezone).startOf("day")
    : null;

  const convertedEnd = hasDateRange
    ? moment.tz(formattedEndDate!, "MM/DD/YYYY", timezone).endOf("day")
    : null;
  // Fetch all employees and their related data in a single query
  const allEmployees = await db.user.findMany({
    where: {
      companyId,
    },
    include: {
      Technician: true,
    },
  });

  // Filter employees based on type and date range
  const filteredEmployees = allEmployees.filter((employee) => {
    // Filter by employee type if specified
    const matchesType = searchParams.employeeType
      ? employee.employeeType === searchParams.employeeType
      : true;

    // TODO: This condition is only showing employees with completed tasks.
    // const statusCompleted = employee.Technician.some(
    //   tech => tech.status === 'Complete'
    // );

    // Filter by date range if specified
    const matchesDateRange = hasDateRange
      ? employee.Technician.some((tech) => {
          const techDate = tech.dateClosed ? moment.utc(tech.dateClosed) : null;
          return (
            techDate &&
            techDate.isBetween(convertedStart, convertedEnd, null, "[]")
          );
        })
      : true;

    // Filter by search query if specified
    const matchesSearch = searchParams?.search
      ? normalizeSearch(`${employee.firstName} ${employee.lastName}`)?.includes(
          normalizeSearch(searchParams?.search || ""),
        )
      : true;

    // console.log({
    //   employeeName: `${employee.firstName} ${employee.lastName}`,
    //   matchesType,
    //   matchesDateRange,
    //   matchesSearch,
    // });

    // Combine all filters
    return matchesType && matchesDateRange && matchesSearch;
  });

  // Calculate Current Month Payout
  // const totalPayoutThisMonth = allEmployees.reduce((acc, employee) => {
  //   const technicianPayout = employee.Technician.reduce((sum, tech) => {
  //     const techDate = tech.dateClosed ? moment(tech.dateClosed).utc() : null;

  //     if (
  //       tech.status === "Complete" &&
  //       techDate !== null &&
  //       techDate.isSameOrAfter(convertedStart?.format()) &&
  //       techDate.isSameOrBefore(convertedEnd?.format())
  //     ) {
  //       return sum + Number(tech?.amount || 0);
  //     }
  //     return sum;
  //   }, 0);
  //   return acc + technicianPayout;
  // }, 0);

  const employeePayout = await getEmployeePayout(timezone);

  // Data Extraction and Formatting
  const currentMonthTotal = employeePayout?.currentMonthTotal || 0;

  // Calculate Overall Technician Payout (till date)
  const overallTechnicianPayout = allEmployees.reduce((acc, employee) => {
    if (employee.employeeType === "Technician") {
      const techTotal = employee.Technician.reduce((sum, tech) => {
        return tech.status === "Complete"
          ? sum + Number(tech?.amount || 0)
          : sum;
      }, 0);
      return acc + techTotal;
    }
    return acc;
  }, 0);

  // Calculate Overall Sales Payout (till date)
  const overallSalesPayout = allEmployees.reduce((acc, employee) => {
    if (employee.employeeType === "Sales") {
      const salesTotal = employee.Technician.reduce((sum, tech) => {
        return tech.status === "Complete"
          ? sum + Number(tech?.amount || 0)
          : sum;
      }, 0);
      return acc + salesTotal;
    }
    return acc;
  }, 0);

  const totalPayout = allEmployees.reduce((acc, employee) => {
    const total = employee.Technician.reduce((sum, tech) => {
      const techDate = tech.dateClosed ? moment(tech.dateClosed).utc() : null;

      const isDateValid =
        !hasDateRange ||
        (techDate &&
          techDate.isSameOrAfter(convertedStart) &&
          techDate.isSameOrBefore(convertedEnd));

      if (tech.status === "Complete" && isDateValid) {
        return sum + Number(tech?.amount || 0);
      }

      return sum;
    }, 0);

    return acc + total;
  }, 0);

  // Filtered Employee Type Payout
  const filteredEmployeeTypePayout = allEmployees.reduce((acc, employee) => {
    if (employee.employeeType === searchParams.employeeType) {
      const typeTotal = employee.Technician.reduce((sum, tech) => {
        const techDate = tech.dateClosed ? moment(tech.dateClosed).utc() : null;

        const isDateValid =
          !hasDateRange ||
          (techDate &&
            techDate.isSameOrAfter(convertedStart) &&
            techDate.isSameOrBefore(convertedEnd));

        if (tech.status === "Complete" && isDateValid) {
          return sum + Number(tech?.amount || 0);
        }

        return sum;
      }, 0);
      return acc + typeTotal;
    }
    return acc;
  }, 0);

  const getEmployeeType = ["Admin", "Manager", "Sales", "Technician", "Other"];
  const hasEmployeeTypeFilter = !!searchParams?.employeeType;

  return (
    <div className="space-y-5">
      <div className="mb-4 mt-1.5 grid grid-cols-1 md:grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {/* Current Month Payout */}
        <Calculation
          content="Current Month Payout"
          // amount={totalPayoutThisMonth}
          amount={currentMonthTotal}
        />

        {/* Overall Technician Payout */}
        <Calculation
          content="Overall Technician Payout"
          amount={overallTechnicianPayout}
        />

        {/* Overall Sales Payout */}
        <Calculation
          content="Overall Sales Payout"
          amount={overallSalesPayout}
        />

        {/* Total Payout (filtered by date range) */}
        <CalculationWithTooltip
          content="Total Payout"
          amount={totalPayout}
          hasDateRange={!!hasDateRange}
          startDate={
            searchParams?.startDate
              ? decodeURIComponent(searchParams.startDate)
              : undefined
          }
          endDate={
            searchParams?.endDate
              ? decodeURIComponent(searchParams.endDate)
              : undefined
          }
          defaultTooltip="Total payout from all delivered employees"
        />

        {/* Filtered employee type payout */}
        {hasEmployeeTypeFilter && (
          <CalculationWithTooltip
            content={`${searchParams.employeeType} Payout`}
            amount={filteredEmployeeTypePayout}
            hasDateRange={!!hasDateRange}
            startDate={
              searchParams?.startDate
                ? decodeURIComponent(searchParams.startDate)
                : undefined
            }
            endDate={
              searchParams?.endDate
                ? decodeURIComponent(searchParams.endDate)
                : undefined
            }
            defaultTooltip={`Total payout for filtered ${searchParams.employeeType} employees`}
          />
        )}
      </div>
      <FilterHeader
        searchParams={searchParams}
        getEmployeeType={getEmployeeType}
      />

      <WorkforceDisplay
        employees={filteredEmployees}
        formattedEndDate={convertedEnd?.format()}
        formattedStartDate={convertedStart?.format()}
        hasDateRange={hasDateRange}
        page={page}
        take={take}
      />
    </div>
  );
}
