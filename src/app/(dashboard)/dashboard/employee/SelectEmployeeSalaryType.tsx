import Selector from "@/components/Selector";
import { cn } from "@/lib/cn";
import { useState, useEffect } from "react";

export type SalaryType = "HOURLY" | "WEEKLY" | "BI_WEEKLY" | "MONTHLY";

const SalaryTypes: SalaryType[] = ["HOURLY", "WEEKLY", "BI_WEEKLY", "MONTHLY"];

const SalaryTypeLabels: Record<SalaryType, string> = {
  HOURLY: "Hourly",
  WEEKLY: "Weekly",
  BI_WEEKLY: "Bi-Weekly",
  MONTHLY: "Monthly",
};

export default function SelectEmployeeSalaryType({
  labelPosition = "top",
  salaryTypeOpen,
  setSalaryTypeOpen,
  defaultType,
  required, // New prop
}: {
  labelPosition?: "top" | "left" | "none";
  salaryTypeOpen: boolean;
  setSalaryTypeOpen: React.Dispatch<React.SetStateAction<boolean>>;
  defaultType?: SalaryType;
  required?: boolean; // Prop to show *
}) {
  const [salaryType, setSalaryType] = useState<SalaryType | null>(
    defaultType || null,
  );

  // Update salary type when defaultType prop changes
  useEffect(() => {
    if (defaultType) {
      setSalaryType(defaultType);
    }
  }, [defaultType]);

  return (
    <div className={cn("flex w-full flex-col gap-1.5")}>
      <input type="hidden" name="salaryType" value={salaryType || ""} />

      {labelPosition !== "none" && (
        <label
          className={cn("flex items-center gap-1 text-base font-medium", {
            "w-28 text-end text-sm": labelPosition === "left",
          })}
        >
          Salary Type {required && <span className="text-destructive">*</span>}
        </label>
      )}

      <Selector
        label={() => (salaryType ? SalaryTypeLabels[salaryType] : "Type")}
        newButton={<div className="flex gap-2"></div>}
        items={SalaryTypes}
        displayList={(salaryType: SalaryType) => (
          <p>{SalaryTypeLabels[salaryType]}</p>
        )}
        onSearch={(search: string) =>
          SalaryTypes.filter((type) =>
            SalaryTypeLabels[type].toLowerCase().includes(search.toLowerCase()),
          )
        }
        openState={[salaryTypeOpen as boolean, setSalaryTypeOpen]}
        selectedItem={salaryType}
        setSelectedItem={setSalaryType}
      />
    </div>
  );
}
