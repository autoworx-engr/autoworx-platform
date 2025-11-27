import { useState } from "react";
import { useEmployeeWorkFilterStore } from "@/stores/employeeWorkFilter";
import { DropdownSelection } from "@/components/DropDownSelection";

export default function Filter() {
  const [status, setStatus] = useState<string>("All");
  const { setFilter } = useEmployeeWorkFilterStore();
  const handleStatusChange = (value: string) => {
    setStatus(value);
    setFilter({ status: value });
  };

  const values = [
    "All",
    "Pending",
    "In Progress",
    "Complete",
    "Cancelled",
  ];

  return (
    <DropdownSelection
      dropDownValues={values}
      onValueChange={handleStatusChange}
      changesValue={status}
      defaultValue="All"
      buttonClassName={`
                min-w-[140px] rounded-xl border-none 
                bg-white dark:bg-slate-900 
                ring-1 ring-slate-200 dark:ring-slate-700 
                shadow-sm text-slate-600 dark:text-slate-300 font-medium
                hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors
              `}
    />
  );
}
