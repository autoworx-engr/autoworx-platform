"use client";
import { NotificationSection } from "@prisma/client";
import React from "react";
import CategoryItems from "./CategoryItems";
import { ChevronDown } from "lucide-react";

type Props = {
  title?: string;
  category: NotificationSection;
  openService: { [key: string]: boolean };
  setOpenService: React.Dispatch<
    React.SetStateAction<{ [key: string]: boolean }>
  >;
};

const NotificationServiceContainer = ({
  title,
  openService,
  setOpenService,
  category,
}: Props) => {
  const handleServiceToggle = () => {
    const closeService = Object.keys(openService).reduce((acc, cur) => {
      if (cur === category) {
        return {
          ...acc,
          [cur]: !openService?.[category as NotificationSection],
        };
      } else {
        return { ...acc, [cur]: false };
      }
    }, {});
    setOpenService(closeService);
  };

  const isOpen = openService?.[category as NotificationSection];

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div
        className="flex w-full cursor-pointer items-center justify-between px-5 py-4 transition-colors duration-150 hover:bg-gray-50"
        onClick={handleServiceToggle}
      >
        <span className="text-sm font-semibold capitalize text-gray-800">
          {title === "work force" ? "Job Tracking" : title}
        </span>
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 transition-transform duration-300 ${isOpen ? "rotate-180" : "rotate-0"
            }`}
        >
          <ChevronDown size={16} className="text-gray-500" />
        </div>
      </div>
      <div
        className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-gray-100">
            <CategoryItems category={category} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationServiceContainer;
