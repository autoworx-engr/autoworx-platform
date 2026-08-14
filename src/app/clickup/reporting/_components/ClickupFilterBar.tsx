"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getDefaultFilters,
  isDefaultFilters,
} from "@/lib/clickup/filterParams";
import type {
  ClickupFilterState,
  FilterableUser,
  ReportGranularity,
} from "@/types/clickup";
import ClickupAssigneeFilter from "./ClickupAssigneeFilter";
import ClickupDateRangePicker from "./ClickupDateRangePicker";

const GRANULARITIES: { value: ReportGranularity; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

export default function ClickupFilterBar({
  value,
  onChange,
  assignableUsers,
}: {
  value: ClickupFilterState;
  onChange: (next: ClickupFilterState) => void;
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
        {GRANULARITIES.map((g) => (
          <button
            key={g.value}
            type="button"
            onClick={() => onChange({ ...value, granularity: g.value })}
            className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
              value.granularity === g.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {g.label}
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
          onClick={() => onChange(getDefaultFilters())}
        >
          <X className="h-4 w-4" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
