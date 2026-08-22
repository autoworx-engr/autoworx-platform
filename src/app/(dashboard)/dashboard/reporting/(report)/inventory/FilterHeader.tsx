"use client";
import { useState } from "react";
import FilterByDateRange from "../../components/filter/FilterByDateRange";
import FilterBySearchBox from "../../components/filter/FilterBySearchBox";
import FilterBySelection from "../../components/filter/FilterBySelection";
import { TFilterModalState } from "../revenue/FilterHeader";

type TProps = {
  searchParams: {
    search?: string;
    startDate?: string;
    endDate?: string;
    category?: string;
    service?: string;
    types?: string;
  };
  getCategory: string[];
  getType: string[];
};

export default function FilterHeader({
  searchParams,
  getCategory,
  getType,
}: TProps) {
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
    <div className="flex w-full flex-col gap-4 md:flex-row md:flex-wrap md:items-start md:justify-start md:gap-4">
      {/* Search and Date Range Section */}
      <div className="flex w-full min-w-0 flex-col gap-4 md:w-auto md:flex-1 md:flex-row md:flex-wrap md:items-start md:justify-start md:gap-4">
        {/* Search Box - Full width on mobile */}
        <div className="relative w-full md:min-w-[260px] md:flex-1 lg:max-w-[693px]">
          <FilterBySearchBox searchText={searchParams.search as string} />
        </div>
        {/* Date Range - Full width on mobile */}
        <div className="flex w-full flex-wrap gap-4 md:w-auto md:flex-nowrap md:justify-start">
          <FilterByDateRange
            startDate={decodeURIComponent(searchParams?.startDate as string)}
            endDate={decodeURIComponent(searchParams?.endDate as string)}
            activeModal={activeModal}
            closeModal={closeModal}
            modalName="dateRange"
            toggleModal={toggleModal}
          />
        </div>
      </div>

      {/* Filter Options Section */}

      <div className="flex w-full flex-wrap items-center justify-start gap-4 md:w-auto md:flex-nowrap">
        <FilterBySelection
          selectedItem={searchParams?.types as string}
          items={getType}
          type="types"
          activeModal={activeModal}
          closeModal={closeModal}
          modalName="types"
          toggleModal={toggleModal}
        />
      </div>
    </div>
  );
}
