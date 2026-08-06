"use client";

import { LeadFilterOptions } from "@/actions/pipelines/getLeadFilterOptions";
import { cn } from "@/lib/cn";
import { Column, User } from "@prisma/client";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import React, { useMemo } from "react";
import SelectComponent from "./Select";

export type LeadFilter = {
  assignedTo: string | null;
  status: string | null;
  service: string | null;
  source: string | null;
};

const LeadsFilterDropdown = React.memo(function LeadsFilterDropdown({
  filterOptions,
  salesColumn,
  companyUsers,
  setFilter,
  filter,
  clearFilters,
}: {
  filterOptions: LeadFilterOptions;
  salesColumn: Column[];
  companyUsers: User[];
  setFilter: React.Dispatch<React.SetStateAction<LeadFilter>>;
  filter: LeadFilter;
  clearFilters: () => void;
}) {
  const statusItems = useMemo(
    () =>
      salesColumn.map((col, index) => ({
        id: `status-${index}`,
        value: col.title,
        label: col.title,
      })),
    [salesColumn],
  );

  const serviceItems = useMemo(
    () =>
      filterOptions.services.map((serviceName, index) => ({
        id: `service-${index}`,
        value: serviceName,
        label: serviceName,
      })),
    [filterOptions.services],
  );

  const sourceItems = useMemo(
    () =>
      filterOptions.sources.map((sourceName, index) => ({
        id: `source-${index}`,
        value: sourceName,
        label: sourceName,
      })),
    [filterOptions.sources],
  );

  const salesPersonItems = useMemo(
    () =>
      companyUsers.map((user, index) => ({
        id: `person-${index}`,
        value: user.id.toString(),
        label: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
      })),
    [companyUsers],
  );

  return (
    <DropdownMenu.Root
      onOpenChange={(open) => {
        if (open) {
          window.dispatchEvent(new CustomEvent("close-date-range"));
        }
      }}
    >
      <DropdownMenu.Trigger asChild>
        <button
          className="flex items-center justify-between w-full rounded-xl border px-4 py-2 transition-all duration-200 focus:outline-none focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/10"
          aria-label="Customise options"
        >
          <span>Filter</span>
          <ChevronDown size={16} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="data-[side=top]:animate-slideDownAndFade data-[side=right]:animate-slideLeftAndFade data-[side=bottom]:animate-slideUpAndFade data-[side=left]:animate-slideRightAndFade min-w-[220px] rounded-md bg-background p-[5px] py-8 shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),_0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)] will-change-[opacity,transform]"
          sideOffset={5}
        >
          <div className="flex flex-col gap-y-2 px-4">
            <SelectComponent
              label="Assigned To"
              items={[
                { id: "all", value: "All", label: "All" },
                ...salesPersonItems,
              ]}
              onChange={(value) =>
                setFilter((prev) => ({
                  ...prev,
                  assignedTo: value === "All" ? null : value,
                }))
              }
              value={
                filter.assignedTo
                  ? salesPersonItems.find(
                      (item) => item.value === filter.assignedTo,
                    )?.value || ""
                  : ""
              }
            />

            <SelectComponent
              label="Services"
              items={[
                { id: "all", value: "All", label: "All" },
                ...serviceItems,
              ]}
              onChange={(value) =>
                setFilter((prev) => ({
                  ...prev,
                  service: value === "All" ? null : value,
                }))
              }
              value={filter.service || ""}
            />

            <SelectComponent
              label="Sources"
              items={[
                { id: "all", value: "All", label: "All" },
                ...sourceItems,
              ]}
              onChange={(value) =>
                setFilter((prev) => ({
                  ...prev,
                  source: value === "All" ? null : value,
                }))
              }
              value={filter.source || ""}
            />
            <SelectComponent
              label="Status"
              items={[
                { id: "all", value: "All", label: "All" },
                ...statusItems,
              ]}
              onChange={(value) =>
                setFilter((prev) => ({
                  ...prev,
                  status: value === "All" ? null : value,
                }))
              }
              value={filter.status || ""}
            />

            <div className="px-4 pt-2">
              <button
                onClick={clearFilters}
                className={cn(
                  "group mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-2 transition-all duration-200 ",
                  "hover:bg-red-50",
                  " text-slate-500 hover:text-red-500",
                  "active:scale-95 border border-slate-200 hover:border-red-100",
                )}
              >
                Clear All Filters
              </button>
            </div>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
});

export default LeadsFilterDropdown;
