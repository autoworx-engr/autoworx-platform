import React from "react";
import {
  Select as UiSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SelectProps {
  label: string;
  value: string | undefined;
  options: string[];
  onChange: (value: string) => void;
}

export const Select: React.FC<SelectProps> = ({
  label,
  value,
  options,
  onChange,
}) => (
  <div className="w-full">
    <label className="mb-1.5 block text-sm font-medium text-slate-700">
      {label}
    </label>

    <UiSelect value={value} onValueChange={onChange}>
      <SelectTrigger
        size="default"
        className="h-11 w-full rounded-lg border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus-visible:border-blue-400 focus-visible:ring-blue-100"
      >
        <SelectValue placeholder="Select font" />
      </SelectTrigger>

      <SelectContent className="rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
        {options.map((f) => (
          <SelectItem
            key={f}
            value={f}
            className="rounded-md px-2.5 py-2 text-sm text-slate-700 focus:bg-blue-50 focus:text-blue-700"
          >
            {f}
          </SelectItem>
        ))}
      </SelectContent>
    </UiSelect>
  </div>
);
