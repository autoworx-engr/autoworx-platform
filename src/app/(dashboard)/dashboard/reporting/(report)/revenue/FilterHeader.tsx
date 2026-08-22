"use client";
import { useState } from "react";
import FilterByDateRange from "../../components/filter/FilterByDateRange";
import FilterByRevenue from "../../components/filter/FilterByRevenue";
import FilterBySearchBox from "../../components/filter/FilterBySearchBox";
import FilterBySelection from "../../components/filter/FilterBySelection";
import { TSliderData } from "./page";

type TProps = {
  searchParams?: {
    search?: string;
    startDate?: string;
    endDate?: string;
    category?: string;
    service?: string;
    filterRevenue?: string;
  };
  filterMultipleSliders: TSliderData[];
  getCategory: string[];
  getService: string[];
};

export type TFilterModalState = {
  dateRange: boolean;
  filterRevenue?: boolean;
  category: boolean;
  service: boolean;
};

export default function FilterHeader({
  searchParams,
  filterMultipleSliders,
  getCategory,
  getService,
}: TProps) {
  const [activeModal, setActiveModal] = useState({
    dateRange: false,
    filterRevenue: false,
    category: false,
    service: false,
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
          <FilterBySearchBox searchText={searchParams?.search as string} />
        </div>

        {/* Date Range - Full width on mobile */}
        <div className="flex w-full flex-wrap gap-4 md:w-auto md:flex-nowrap md:justify-start">
          <FilterByDateRange
            startDate={decodeURIComponent(searchParams?.startDate as string)}
            endDate={decodeURIComponent(searchParams?.endDate as string)}
            modalName="dateRange"
            activeModal={activeModal}
            closeModal={closeModal}
            toggleModal={toggleModal}
          />

          {/* <FilterByMultiple
            searchParamsValue={searchParams}
            filterSliders={filterMultipleSliders}
            modalName="filterRange"
            activeModal={activeModal}
            closeModal={closeModal}
            toggleModal={toggleModal}
          /> */}
          <FilterByRevenue
            selectedItem={searchParams?.filterRevenue as string}
            items={["Price", "Cost", "Profit"]}
            type="filterRevenue"
            modalName="filterRevenue"
            activeModal={activeModal}
            closeModal={closeModal}
            toggleModal={toggleModal}
          />
        </div>
      </div>

      {/* Filter Options Section */}
      {/* <div className="grid grid-cols-2 gap-4 md:flex md:items-center md:space-x-4"> */}
      {/* Filter Multiple */}
      {/* <div className="w-full md:w-auto">

        </div> */}

      {/* Category Filter */}
      <div className="flex w-full flex-wrap items-center justify-start gap-4 md:w-auto md:flex-nowrap">
        <FilterBySelection
          selectedItem={searchParams?.category as string}
          items={getCategory}
          type="category"
          modalName="category"
          activeModal={activeModal}
          closeModal={closeModal}
          toggleModal={toggleModal}
        />

        {/* Service Filter */}
        <FilterBySelection
          selectedItem={searchParams?.service as string}
          items={getService}
          type="service"
          modalName="service"
          activeModal={activeModal}
          closeModal={closeModal}
          toggleModal={toggleModal}
        />
      </div>
      {/* </div> */}
    </div>
  );
}
