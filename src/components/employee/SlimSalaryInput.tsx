"use client";

import SelectEmployeeSalaryType from "@/app/(dashboard)/dashboard/employee/SelectEmployeeSalaryType";
import { SlimInput } from "@/components/SlimInput";
import { useFormErrorStore } from "@/stores/form-error";
import { SalaryType } from "@prisma/client";

interface SlimSalaryInputProps {
  onSalaryChange?: (
    salaryData: { salaryType: SalaryType; salaryAmount: number } | null,
  ) => void;
  salaryTypeOpen: boolean;
  setSalaryTypeOpen: React.Dispatch<React.SetStateAction<boolean>>;
  initialSalaryType?: SalaryType;
  initialSalaryAmount?: number;
}

export default function SlimSalaryInput({
  onSalaryChange,
  salaryTypeOpen,
  setSalaryTypeOpen,
  initialSalaryType,
  initialSalaryAmount,
}: SlimSalaryInputProps) {
  const { showError, clearError } = useFormErrorStore();

  const handleSalaryAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Check for negative numbers or invalid format
    if (
      value &&
      (!/^(\d*\.?\d+|\d+\.?\d*)$/.test(value) || Number(value) < 0)
    ) {
      showError({
        field: "salaryAmount",
        message: "Salary amount must be a valid positive number.",
      });
      // Set value to 0 if negative
      if (Number(value) < 0) {
        e.target.value = "0";
      }
      return;
    } else {
      clearError();

      // Get current salary type from the form
      const salaryTypeElement = document.querySelector<HTMLInputElement>(
        "[name='salaryType']",
      );
      const salaryType = salaryTypeElement?.value as SalaryType;

      if (onSalaryChange && salaryType && value) {
        onSalaryChange({
          salaryType,
          salaryAmount: Number(value),
        });
      } else if (onSalaryChange && (!salaryType || !value)) {
        onSalaryChange(null);
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-x-4">
        <SelectEmployeeSalaryType
          required={false}
          salaryTypeOpen={salaryTypeOpen}
          setSalaryTypeOpen={setSalaryTypeOpen}
          defaultType={initialSalaryType}
        />
        <div className="grow">
          <SlimInput
            name="salaryAmount"
            label="Salary Amount"
            type="number"
            required={false}
            step="0.01"
            min="0"
            placeholder="Salary Amount"
            defaultValue={
              initialSalaryAmount ? initialSalaryAmount.toString() : ""
            }
            onChange={handleSalaryAmountChange}
          />
        </div>
      </div>
    </div>
  );
}
