"use client";

import { TSliderData } from "../revenue/page";
import FilterBySearchBox from "../../components/filter/FilterBySearchBox";
import FilterByDateRange from "../../components/filter/FilterByDateRange";
import PaymentMethodFilter from "../../components/filter/PaymentMethodFilter";
import { useState } from "react";

type TFilterModalState = {
  dateRange: boolean;
  paymentMethod: boolean;
  filterRange: boolean;
  category: boolean;
  service: boolean;
  filterRevenue: boolean;
};

type TProps = {
  searchParams: {
    search?: string;
    startDate?: string;
    endDate?: string;
    category?: string;
    service?: string;
    paymentMethod?: string;
    filterRevenue?: string;
  };
  filterMultipleSliders: TSliderData[];
};

export default function FilterHeader({
  searchParams,
  filterMultipleSliders,
}: TProps) {
  const [activeModal, setActiveModal] = useState<TFilterModalState>({
    dateRange: false,
    filterRange: false,
    category: false,
    service: false,
    paymentMethod: false,
    filterRevenue: false,
  });

  // const openModal = (nameOfModal: string) => {
  //   setActiveModal({ ...activeModal, [nameOfModal]: true });
  // };
  const closeModal = (nameOfModal: string) => {
    setActiveModal({ ...activeModal, [nameOfModal]: false });
  };

  const toggleModal = (nameOfModal: string) => {
    const obj = Object.keys(activeModal).reduce((acc, key) => {
      if (key === nameOfModal) {
        return {
          ...acc,
          [nameOfModal]: !activeModal[key as keyof TFilterModalState],
        };
      }
      return {
        ...acc,
        [key]: false,
      };
    }, {} as TFilterModalState);
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
            activeModal={activeModal as any}
            closeModal={closeModal}
            modalName="dateRange"
            toggleModal={toggleModal}
          />

          <PaymentMethodFilter
            activeModal={activeModal}
            closeModal={closeModal}
            modalName="paymentMethod"
            toggleModal={toggleModal}
          />
        </div>
      </div>

      {/* Filter Options Section */}
      {/* <div>
        <div className="w-full md:w-auto">
          <FilterByMultiple
            searchParamsValue={searchParams}
            filterSliders={filterMultipleSliders}
            activeModal={activeModal}
            closeModal={closeModal}
            modalName="filterRange"
            toggleModal={toggleModal}
          />
        </div>
      <FilterBySelection
          selectedItem={searchParams?.category as string}
          items={["product", "parts", "wheel"]}
          type="category"
          activeModal={activeModal}
          closeModal={closeModal}
          modalName="category"
          toggleModal={toggleModal}
        />
        <FilterBySelection
          selectedItem={searchParams?.service as string}
          items={["washing", "changing wheel", "full service"]}
          type="service"
          activeModal={activeModal}
          closeModal={closeModal}
          modalName="service"
          toggleModal={toggleModal}
        />
      </div> */}
    </div>
  );
}
