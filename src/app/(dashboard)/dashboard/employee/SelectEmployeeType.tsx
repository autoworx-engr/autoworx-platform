import Selector from "@/components/Selector";
import { cn } from "@/lib/cn";
import { EmployeeType } from "@prisma/client";
import { useState } from "react";

const employeeTypes: EmployeeType[] = [
  "Sales",
  "Technician",
  "Manager",
  "Other",
];

export default function SelectEmployeeType({
  labelPosition = "top",
  employeeTypeOpen,
  setEmployeeTypeOpen,
  defaultType,
  required, // New prop
}: {
  labelPosition?: "top" | "left" | "none";
  employeeTypeOpen: boolean;
  setEmployeeTypeOpen: React.Dispatch<React.SetStateAction<boolean>>;
  defaultType?: EmployeeType;
  required?: boolean; // Prop to show *
}) {
  const [employeeType, setEmployeeType] = useState<EmployeeType | null>(
    defaultType || null,
  );

  return (
    <div className={cn("flex w-full flex-col gap-1.5")}>
      <input type="hidden" name="type" value={employeeType || ""} />

      {labelPosition !== "none" && (
        <label
          className={cn("flex items-center gap-1 text-base font-medium", {
            "w-28 text-end text-sm text-red-600": labelPosition === "left",
          })}
        >
          Employee Type{" "}
          {required && <span className="text-destructive">*</span>}
        </label>
      )}

      <Selector
        label={() => (employeeType ? employeeType : "Type")}
        newButton={<div className="flex gap-2"></div>}
        items={employeeTypes}
        displayList={(employeeType: EmployeeType) => <p>{employeeType}</p>}
        onSearch={(search: string) =>
          employeeTypes.filter((type) =>
            type.toLowerCase().includes(search.toLowerCase()),
          )
        }
        openState={[employeeTypeOpen as boolean, setEmployeeTypeOpen]}
        selectedItem={employeeType}
        setSelectedItem={setEmployeeType}
      />
    </div>
  );
}
