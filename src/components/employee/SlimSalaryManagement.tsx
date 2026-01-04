"use client";

import { useState, useEffect } from "react";
import { SalaryType } from "@prisma/client";
import { SlimInput } from "@/components/SlimInput";
import { getEmployeeSalary } from "@/actions/employee/getSalary";
import { useFormErrorStore } from "@/stores/form-error";
import SelectEmployeeSalaryType from "@/app/(dashboard)/dashboard/employee/SelectEmployeeSalaryType";

interface SlimSalaryManagementProps {
  userId?: number; // For editing existing employee
  initialData?: {
    salaryType: SalaryType;
    salaryAmount: number;
  } | null;
  onSalaryChange?: (salaryData: { salaryType: SalaryType; salaryAmount: number } | null) => void;
  salaryTypeOpen: boolean;
  setSalaryTypeOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function SlimSalaryManagement({
  userId,
  initialData,
  onSalaryChange,
  salaryTypeOpen,
  setSalaryTypeOpen
}: SlimSalaryManagementProps) {
  const [currentSalary, setCurrentSalary] = useState<{
    salaryType: SalaryType;
    salaryAmount: number;
  } | null>(initialData || null);
  const [loading, setLoading] = useState(false);

  const { showError, clearError } = useFormErrorStore();

  // Load existing salary data if userId is provided
  useEffect(() => {
    if (userId && !initialData) {
      loadSalaryData();
    }
  }, [userId, initialData]);

  const loadSalaryData = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const result = await getEmployeeSalary(userId);
      if (result.type === "success" && result.data) {
        setCurrentSalary({
          salaryType: result.data.salaryType,
          salaryAmount: Number(result.data.salaryAmount),
        });
      } else {
        setCurrentSalary(null);
      }
    } catch (error) {
      console.error("Failed to load salary data:", error);
      setCurrentSalary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSalaryAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value && !/^(\d*\.?\d+|\d+\.?\d*)$/.test(value)) {
      showError({
        field: "salaryAmount",
        message: "Salary amount must be a valid number.",
      });
    } else {
      clearError();
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
        <SelectEmployeeSalaryType
          key={`salary-type-${userId}`}
          required={false}
          salaryTypeOpen={salaryTypeOpen}
          setSalaryTypeOpen={setSalaryTypeOpen}
          defaultType={currentSalary?.salaryType}
        />
        <div className="grow">
          <SlimInput
            name="salaryAmount"
            label="Salary Amount"
            type="number"
            required={false}
            step="0.01"
            min="0"
            defaultValue={
              currentSalary?.salaryAmount
                ? Number(currentSalary.salaryAmount).toString()
                : ""
            }
            onChange={handleSalaryAmountChange}
          />
        </div>
      </div>
    </>
  );
}
