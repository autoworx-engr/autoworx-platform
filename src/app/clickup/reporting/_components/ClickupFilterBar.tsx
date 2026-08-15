"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getPresetRange,
  isDefaultFilters,
  matchesPresetRange,
} from "@/lib/clickup/filterParams";
import type { ClickupFilterState, FilterableUser } from "@/types/clickup";
import ClickupAssigneeFilter from "./ClickupAssigneeFilter";
import ClickupDateRangePicker from "./ClickupDateRangePicker";

const PRESET_BUTTONS: {
  value: "all" | "day" | "week" | "month";
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

export default function ClickupFilterBar({
  value,
  onChange,
  onClear,
  assignableUsers,
}: {
  value: ClickupFilterState;
  onChange: (next: ClickupFilterState) => void;
  onClear: () => void;
  assignableUsers: FilterableUser[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ClickupDateRangePicker
        startDate={value.startDate}
        endDate={value.endDate}
        onChange={(startDate, endDate) =>
          onChange({ ...value, startDate, endDate })
        }
      />

      <div className="flex items-center rounded-md border border-input p-0.5">
        {PRESET_BUTTONS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() =>
              onChange({ ...value, ...getPresetRange(preset.value) })
            }
            className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
              matchesPresetRange(value, preset.value)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <ClickupAssigneeFilter
        users={assignableUsers}
        selected={value.assignees}
        onChange={(assignees) => onChange({ ...value, assignees })}
      />

      {!isDefaultFilters(value) && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={onClear}
        >
          <X className="h-4 w-4" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
