"use client";
import { useState } from "react";
import FilterDateRange from "../../components/filter/FilterByDateRange";
import FilterByMultiple from "../../components/filter/FilterByMultiple";
import { TFilterModalState } from "../revenue/FilterHeader";
import { TSliderData } from "../revenue/page";

type TProps = {
  searchParams: {
    startDate?: string;
    endDate?: string;
  };
  filterMultipleSliders: TSliderData[];
};

export default function FilterHeader({
  searchParams,
  filterMultipleSliders,
}: TProps) {
  const [activeModal, setActiveModal] = useState({
    dateRange: false,
    filterRange: false,
    category: false,
    service: false,
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
    <div className="flex items-center space-x-4">
      <FilterDateRange
        startDate={decodeURIComponent(searchParams?.startDate as string)}
        endDate={decodeURIComponent(searchParams?.endDate as string)}
        activeModal={activeModal}
        closeModal={closeModal}
        modalName="dateRange"
        toggleModal={toggleModal}
      />
      <FilterByMultiple
        filterSliders={filterMultipleSliders}
        searchParamsValue={searchParams}
        activeModal={activeModal}
        closeModal={closeModal}
        modalName="filterRange"
        toggleModal={toggleModal}
      />
    </div>
  );
}
