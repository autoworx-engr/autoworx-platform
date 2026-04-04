"use client";
import { useServerGet } from "@/hooks/useServerGet";
import PayoutCard from "../../employee/components/PayoutCard";
import PerformanceTable from "./PerformanceTable";
import { getSalesReportData } from "./getSalesReport";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
<<<<<<< HEAD
=======
import CarLoading from "../../../../../components/common/CarLoading";
import FilterDateRange from "../components/filter/FilterByDateRange";
import { useState } from "react";
import { TFilterModalState } from "../../estimate/CannedLabor";
import moment from "moment";
>>>>>>> b13cc748f79e5676eb818262729c7aee087e2d7f

type TProps = {
  searchParams: {
    startDate?: string;
    endDate?: string;
  };
};

export default function Page({ searchParams }: TProps) {
  const timezone = useCompanyTimezone();
  const [activeModal, setActiveModal] = useState({
    dateRange: false,
    filterRange: false,
    category: false,
    service: false,
    types: false,
    filterRevenue: false,
  });

<<<<<<< HEAD
  const { data } = useServerGet(getSalesReportData, timezone);
=======
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  if (searchParams.startDate && searchParams.endDate) {
    const formattedStartDate = moment(
      decodeURIComponent(searchParams.startDate),
      "MM-DD-YYYY",
    ).format("YYYY-MM-DD");

    const formattedEndDate = moment(
      decodeURIComponent(searchParams.endDate),
      "MM-DD-YYYY",
    ).format("YYYY-MM-DD");

    startDate = new Date(`${formattedStartDate}T00:00:00.000Z`);
    endDate = new Date(`${formattedEndDate}T23:59:59.999Z`);
  }

  const { data } = useServerGet(
    getSalesReportData,
    timezone,
    startDate,
    endDate,
  );

>>>>>>> b13cc748f79e5676eb818262729c7aee087e2d7f
  if (!data) {
    return <div>Loading...</div>;
  }
  const {
    previousCommission,
    currentCommission,
    allCommission,
    growthRatePrevious,
    growthRateCurrent,
    employeeId,
  } = data || {};

  const closeModal = (nameOfModal: string) => {
    setActiveModal({ ...activeModal, [nameOfModal]: false });
  };

  const toggleModal = (nameOfModal: string) => {
    const obj = Object.keys(activeModal).reduce((acc, key) => {
      if (key === nameOfModal) {
        return {
          ...acc,
          [nameOfModal]: !activeModal[nameOfModal as keyof TFilterModalState],
        };
      }
      return {
        ...acc,
        [key]: false,
      };
    }, activeModal);
    setActiveModal(obj);
  };

  return (
    <>
      <h1 className="mx-2 my-4 text-2xl font-bold md:mx-0">Sales Reporting</h1>
      <div className="flex flex-col gap-4 md:flex-1 md:flex-row md:items-center md:space-x-4 mb-4 px-2">
        <FilterDateRange
          startDate={decodeURIComponent(searchParams?.startDate as string)}
          endDate={decodeURIComponent(searchParams?.endDate as string)}
          activeModal={activeModal}
          closeModal={closeModal}
          modalName="dateRange"
          toggleModal={toggleModal}
        />
      </div>
      <div className="mx-2 flex flex-col gap-4 lg:flex-row">
        <PayoutCard
          title="Previous Month Payout"
          amount={previousCommission}
          percentage={growthRatePrevious?.rate}
          increased={growthRatePrevious?.isPositive}
        />
        <PayoutCard
          title="Current Month Payout"
          amount={currentCommission}
          percentage={growthRateCurrent?.rate}
          increased={growthRateCurrent?.isPositive}
        />
        <PayoutCard title="YTD Payout" amount={allCommission} />
      </div>
      <PerformanceTable employeeId={employeeId} />
    </>
  );
}
