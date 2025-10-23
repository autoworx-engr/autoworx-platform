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

  return (
    <div className="flex-1">
      <div
        className="flex w-full cursor-pointer items-center justify-between border p-8 font-semibold"
        onClick={handleServiceToggle}
      >
        <span className="capitalize">
          {title === "work force" ? "Job Tracking" : title}
        </span>
        <button>
          <ChevronDown size={20} />
        </button>
      </div>
      {openService?.[category as NotificationSection] && (
        <CategoryItems category={category} />
      )}
    </div>
  );
};

export default NotificationServiceContainer;
