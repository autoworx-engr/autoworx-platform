"use client";
import { useServerGet } from "@/hooks/useServerGet";
import PayoutCard from "../../employee/components/PayoutCard";
import PerformanceTable from "./PerformanceTable";
import { getSalesReportData } from "./getSalesReport";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import CarLoading from "../../../../../components/common/CarLoading";
import FilterDateRange from "../components/filter/FilterByDateRange";
import { useState, use } from "react";
import { TFilterModalState } from "../../estimate/CannedLabor";
import moment from "moment";

type TProps = {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
  }>;
};

const safeDecode = (value?: string): string | undefined => {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
};

const isValidDate = (date: string) =>
  moment(date, "MM-DD-YYYY", true).isValid();

export default function Page(props: TProps) {
  const searchParams = use(props.searchParams);
  const timezone = useCompanyTimezone();
  const [activeModal, setActiveModal] = useState({
    dateRange: false,
    filterRange: false,
    category: false,
    service: false,
    types: false,
    filterRevenue: false,
  });

  let startDate: string | undefined;
  let endDate: string | undefined;

  const decodedStartDate = safeDecode(searchParams.startDate);
  const decodedEndDate = safeDecode(searchParams.endDate);

  if (
    decodedStartDate &&
    decodedEndDate &&
    isValidDate(decodedStartDate) &&
    isValidDate(decodedEndDate)
  ) {
    const formattedStartDate = moment(decodedStartDate, "MM-DD-YYYY").format(
      "YYYY-MM-DD",
    );

    const formattedEndDate = moment(decodedEndDate, "MM-DD-YYYY").format(
      "YYYY-MM-DD",
    );

    startDate = `${formattedStartDate}T00:00:00.000Z`;
    endDate = `${formattedEndDate}T23:59:59.999Z`;
  }

  const { data } = useServerGet(
    getSalesReportData,
    timezone,
    startDate,
    endDate,
  );

  if (!data) {
    return (
      <div className="flex h-[90vh] items-center justify-center">
        <CarLoading />
      </div>
    );
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
          startDate={decodedStartDate}
          endDate={decodedEndDate}
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
