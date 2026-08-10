"use client";

import { getWorkOrders } from "@/actions/pipelines/getWorkOrders";
import { getColumnsByType } from "@/actions/pipelines/pipelinesColumn";
import { useServerGet } from "@/hooks/useServerGet";
import { usePipelineFilterStore } from "@/stores/PipelineFilterStore";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import Select from "./Select";
import { useEstimateFilterStore } from "@/stores/estimate-filter";
import { cn } from "@/lib/utils";

interface DropdownProps {
  pipelineType: string;
}
const DropdownMenuDemo = ({ pipelineType }: DropdownProps) => {
  const { data: invoices } = useServerGet(getWorkOrders);
  const [columnStatus, setColumnStatus] = useState<
    { id: number; title: string; type: string }[]
  >([]);
  const { setFilter, status, service, dateRange } = usePipelineFilterStore();
  useEffect(() => {
    const fetchShopColumns = async () => {
      const columns = await getColumnsByType(pipelineType);
      setColumnStatus(columns);
    };
    fetchShopColumns();
  }, [pipelineType]);

  const uniqueServices = new Set<string>();
  invoices?.forEach((invoice) => {
    invoice.invoiceItems.forEach((item) => {
      if (item.service?.name) {
        uniqueServices.add(item.service.name);
      }
    });
  });

  const hasActiveFilters = !!(status || service);

  const handleClearFilters = () => {
    setFilter({ status: "", service: "" });
  };

  // Convert the Set back to an array
  const serviceItems = Array.from(uniqueServices).map((serviceName, index) => ({
    id: `service-${index}`,
    value: serviceName,
    label: serviceName,
  }));

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="flex items-center gap-x-12 rounded-xl border px-4 py-2"
          aria-label="Customise options"
        >
          <span>Filter</span>
          <ChevronDown />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="data-[side=top]:animate-slideDownAndFade data-[side=right]:animate-slideLeftAndFade data-[side=bottom]:animate-slideUpAndFade data-[side=left]:animate-slideRightAndFade min-w-[220px] rounded-md bg-background p-[5px] py-8 z-50 shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),_0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)] will-change-[opacity,transform]"
          sideOffset={5}
        >
          <div className="flex flex-col gap-y-2 px-4">
            <Select
              label="Status"
              items={[
                { id: "all", value: "All", label: "All" },
                ...columnStatus
                  .filter((column) => column.title !== "Delivered")
                  .map((column) => ({
                    id: column.id,
                    value: column.title,
                    label: column.title,
                  })),
              ]}
              onChange={(value) =>
                setFilter({ status: value === "All" ? "" : value })
              }
              value={status}
            />

            <Select
              label="Services"
              items={[
                { id: "all", value: "All", label: "All" },
                ...serviceItems,
              ]}
              onChange={(value) =>
                setFilter({ service: value === "All" ? "" : value })
              }
              value={service}
            />

            <button
              onClick={handleClearFilters}
              className={cn(
                "group flex items-center justify-center gap-2 rounded-lg px-4 py-2 transition-all duration-200 whitespace-nowrap",
                hasActiveFilters
                  ? "hover:bg-red-50 text-slate-500 hover:text-red-500 active:scale-95 border border-slate-200 hover:border-red-100"
                  : "opacity-50 cursor-not-allowed text-slate-400 border border-slate-200",
              )}
            >
              Clear All Filters
            </button>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default DropdownMenuDemo;
