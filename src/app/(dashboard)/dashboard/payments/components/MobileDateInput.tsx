import React, { useState } from "react";

interface MobileDateInputProps {
  name: string;
  customTitle: string;
  defaultValue?: Date;
  otherDate?: string; // Date from the other input (start/end)
  isStartDate?: boolean; // To determine if this is start or end date
  onDateChange?: (date: string) => void; // Callback to notify parent of date changes
}

export default function MobileDateInput({
  name,
  customTitle,
  defaultValue,
  otherDate,
  isStartDate = false,
  onDateChange,
}: MobileDateInputProps) {
  const [value, setValue] = useState(
    defaultValue ? new Date(defaultValue).toISOString().split("T")[0] : "",
  );

  // Calculate min and max dates based on the other date value
  const getDateLimit = () => {
    if (!otherDate) return undefined;

    // If this is start date, other date is end date (max limit)
    // If this is end date, other date is start date (min limit)
    return isStartDate ? { max: otherDate } : { min: otherDate };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    onDateChange?.(newValue);
  };

  const dateLimit = getDateLimit();

  return (
    <div className="flex flex-col gap-1">
      <label className="font-medium text-[#66738C]">{customTitle}</label>
      <input
        type="date"
        name={name}
        value={value}
        onChange={handleChange}
        min={dateLimit?.min}
        max={dateLimit?.max}
        className="h-12 rounded-md border border-gray-300 px-3 text-sm focus:border-primary focus:outline-none"
      />
    </div>
  );
}
