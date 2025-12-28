import * as React from "react";
import { useMediaQuery } from "react-responsive";
import { Calendar } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import MobileDateInput from "./MobileDateInput";

interface propsType {
  name: string;
  customTitle: string;
  defaultValue?: Date;
  otherDate?: string;
  isStartDate?: boolean;
  onDateChange?: (date: string) => void;
}

export default function CouponDateComponent({
  name,
  customTitle,
  defaultValue,
  otherDate,
  isStartDate,
  onDateChange,
}: propsType) {
  const isMobile = useMediaQuery({ maxWidth: 640 });

  // Initialize the state with defaultValue if provided
  const [value, setValue] = React.useState<Date | null>(
    defaultValue ? new Date(defaultValue) : null
  );

  if (isMobile) {
    return (
      <MobileDateInput
        name={name}
        customTitle={customTitle}
        defaultValue={defaultValue}
        otherDate={otherDate}
        isStartDate={isStartDate}
        onDateChange={onDateChange}
      />
    );
  }

  const minDate = !isStartDate && otherDate ? new Date(otherDate) : undefined;
  const maxDate = isStartDate && otherDate ? new Date(otherDate) : undefined;

  return (
    <div className="flex flex-col gap-1">
      <label className="font-medium text-[#66738C]">{customTitle}</label>
      <div className="rounded-md border border-gray-200 p-2">
        <Calendar
          date={value || undefined}
          onChange={(date: Date) => {
            setValue(date);
            if (date && onDateChange) {
              onDateChange(date.toISOString());
            }
          }}
          minDate={minDate}
          maxDate={maxDate}
          color="#6571FF"
        />
      </div>
      {/* Hidden input to ensure value is included in FormData */}
      <input
        type="hidden"
        name={name}
        value={value ? value.toISOString().split("T")[0] : ""}
      />
    </div>
  );
}
