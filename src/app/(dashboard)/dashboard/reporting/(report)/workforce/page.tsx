import CalculationWithTooltip from "@/app/(dashboard)/dashboard/reporting/components/CalculationWithTooltip";
import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import moment from "moment";
import { getServerSession } from "next-auth";
import Calculation from "../../components/Calculation";
import FilterHeader from "./FilterHeader";
import WorkforceDisplay from "./WorkforceDisplay";

// Props type
type TProps = {
  searchParams: {
    category?: string;
    startDate?: string;
    endDate?: string;
    service?: string;
    search?: string;
    employeeType?: "Admin" | "Sales" | "Technician" | "Manager" | "Other";
  };
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

export default async function WorkforceReportPage({ searchParams }: TProps) {
  const session = await getServerSession(authOptions);

  // Date range filter logic
  const hasDateRange: boolean = !!(
    searchParams.startDate && searchParams.endDate
  );
  const formattedStartDate = hasDateRange
    ? moment(decodeURIComponent(searchParams.startDate!), "MM-DD-YYYY").toDate()
    : null;
  const formattedEndDate = hasDateRange
    ? moment(decodeURIComponent(searchParams.endDate!), "MM-DD-YYYY")
        .endOf("day")
        .toDate()
    : null;

  // Static: Get current month start and end
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );

  // Fetch all employees and their related data in a single query
  const allEmployees = await db.user.findMany({
    where: {
      companyId: session?.user?.companyId,
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

    // Filter by date range if specified
    const matchesDateRange = hasDateRange
      ? employee.Technician.some((tech) => {
          const techDate = tech.dateClosed ? new Date(tech.dateClosed) : null;
          return (
            techDate &&
            techDate >= formattedStartDate! &&
            techDate <= formattedEndDate!
          );
        })
      : true;

    // Filter by search query if specified
    const matchesSearch = searchParams.search
      ? `${employee.firstName} ${employee.lastName}`
          .toLowerCase()
          .includes(searchParams.search.toLowerCase())
      : true;

    // Combine all filters
    return matchesType && matchesDateRange && matchesSearch;
  });

  // Calculate Current Month Payout
  const totalPayoutThisMonth = allEmployees.reduce((acc, employee) => {
    const technicianPayout = employee.Technician.reduce((sum, tech) => {
      const techDate = tech.dateClosed ? new Date(tech.dateClosed) : null;
      if (
        tech.status === "Complete" &&
        techDate !== null &&
        techDate >= currentMonthStart &&
        techDate <= currentMonthEnd
      ) {
        return sum + Number(tech?.amount || 0);
      }
      return sum;
    }, 0);
    return acc + technicianPayout;
  }, 0);

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
      const techDate = tech.dateClosed ? new Date(tech.dateClosed) : null;

      const isDateValid =
        !hasDateRange ||
        (techDate !== null &&
          techDate >= formattedStartDate! &&
          techDate <= formattedEndDate!);

      if (tech.status === "Complete" && isDateValid) {
        return sum + Number(tech?.amount || 0);
      }

      return sum;
    }, 0);

    return acc + total;
  }, 0);

  // Calculate Filtered Employee Type Payout (based on date range)
  const filteredEmployeeTypePayout = allEmployees.reduce((acc, employee) => {
    if (employee.employeeType === searchParams.employeeType) {
      const typeTotal = employee.Technician.reduce((sum, tech) => {
        const techDate = tech.dateClosed ? new Date(tech.dateClosed) : null;

        const isDateValid =
          !hasDateRange ||
          (techDate !== null &&
            techDate >= formattedStartDate! &&
            techDate <= formattedEndDate!);

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
      <FilterHeader
        searchParams={searchParams}
        getEmployeeType={getEmployeeType}
      />

      <div className="my-7 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {/* Current Month Payout */}
        <Calculation
          content="Current Month Payout"
          amount={totalPayoutThisMonth}
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

      <WorkforceDisplay
        employees={filteredEmployees}
        formattedEndDate={formattedEndDate}
        formattedStartDate={formattedStartDate}
        hasDateRange={hasDateRange}
      />
    </div>
  );
}
