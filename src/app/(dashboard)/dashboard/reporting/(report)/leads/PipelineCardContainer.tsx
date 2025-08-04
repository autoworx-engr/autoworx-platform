"use client";
import { getLeadInfo } from "@/actions/dashboard/data/getLeadInfo";
import { useServerGet } from "@/hooks/useServerGet";
import { formatCurrency } from "@/utils/formatCurrency";
import PipelineReportCard from "./PipelineReportCard";
import FilterByDateRange from "../../components/filter/FilterByDateRange";
import { useState, useEffect } from "react";
import { TFilterModalState } from "../revenue/FilterHeader";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";

type TProps = {
  searchParams: {
    startDate?: string;
    endDate?: string;
  };
};

export default function PipelineCardContainer({ searchParams }: TProps) {
  const [startDate, setStartDate] = useState<string | undefined>(
    searchParams?.startDate
  );
  const [endDate, setEndDate] = useState<string | undefined>(
    searchParams?.endDate
  );

  // Update local state when searchParams change
  useEffect(() => {
    setStartDate(searchParams?.startDate);
    setEndDate(searchParams?.endDate);
  }, [searchParams?.startDate, searchParams?.endDate]);
  const timezone = useCompanyTimezone();

  // Pass date parameters to getLeadInfo
  const { data, setData } = useServerGet(() =>
    getLeadInfo(
      timezone,
      startDate ? decodeURIComponent(startDate) : undefined,
      endDate ? decodeURIComponent(endDate) : undefined
    )
  );

  // Re-fetch data when date parameters change
  useEffect(() => {
    getLeadInfo(
      timezone,
      startDate ? decodeURIComponent(startDate) : undefined,
      endDate ? decodeURIComponent(endDate) : undefined
    ).then(setData);
  }, [startDate, endDate]);

  //converting hours into days and hours
  const dayHours = (time: number = 0) => {
    const day = Math.floor(time / 24);
    const hour = Math.floor(time % 24);
    const averageTime = (time < 24 ? time : `${day} Days ${hour}`) ?? 0;

    return averageTime;
  };

  const averageSalesCycleLength = dayHours(
    data?.averageConversionTime as number
  );
  const leadToOpportunityRatio = data?.leadToOpportunityRatio ?? 0;
  const leadsResponseTime = dayHours(data?.avgResponseTime as number);
  const leadLost = data?.lostLeads ?? 0;

  const [activeModal, setActiveModal] = useState({
    dateRange: false,
    filterRange: false,
    category: false,
    service: false,
    types: false,
    filterRevenue: false,
  });

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
    <div className="space-y-2">
      {/* Date Range - Full width on mobile */}
      <div className="w-full md:w-auto">
        <FilterByDateRange
          startDate={startDate ? decodeURIComponent(startDate) : "undefined"}
          endDate={endDate ? decodeURIComponent(endDate) : "undefined"}
          activeModal={activeModal}
          closeModal={closeModal}
          modalName="dateRange"
          toggleModal={toggleModal}
        />
      </div>
      <PipelineReportCard
        title="Average Deal Size"
        averageValue={formatCurrency(data?.averageDealSize ?? 0)}
        isPositive={data?.growthRate.averageDealSizeGR.isPositive ?? true}
        rate={data?.growthRate.averageDealSizeGR.rate ?? 0}
      />
      <PipelineReportCard
        title="Average Sales Cycle Length"
        averageValue={`${averageSalesCycleLength} hours`}
        isPositive={data?.growthRate.averageConversionTimeGR.isPositive ?? true}
        rate={data?.growthRate.averageConversionTimeGR.rate ?? 0}
      />
      <PipelineReportCard
        title="Lead-to-Opportunity"
        averageValue={`${leadToOpportunityRatio}%`}
        isPositive={
          data?.growthRate.leadToOpportunityRatioGR.isPositive ?? true
        }
        rate={data?.growthRate.leadToOpportunityRatioGR.rate ?? 0}
      />
      <PipelineReportCard
        title="Leads Response Time"
        averageValue={`${leadsResponseTime} hours`}
        isPositive={data?.growthRate.avgResponseTimeGR.isPositive ?? true}
        rate={data?.growthRate.avgResponseTimeGR.rate ?? 0}
      />
      <PipelineReportCard
        title="Lead Lost"
        averageValue={`${leadLost}`}
        isPositive={data?.growthRate.lostLeadsGR.isPositive ?? true}
        rate={data?.growthRate.lostLeadsGR.rate ?? 0}
      />
    </div>
  );
}
