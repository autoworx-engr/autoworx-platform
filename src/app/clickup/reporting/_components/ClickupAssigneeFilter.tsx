"use client";

import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { initials } from "@/lib/clickup/format";
import type { FilterableUser } from "@/types/clickup";

export default function ClickupAssigneeFilter({
  users,
  selected,
  onChange,
}: {
  users: FilterableUser[];
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  const toggle = (id: number) => {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id],
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="h-4 w-4" />
          {selected.length === 0
            ? "Everyone"
            : `${selected.length} teammate${selected.length > 1 ? "s" : ""}`}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium">Filter by teammate</p>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {users.map((user) => (
            <label
              key={user.id}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
            >
              <Checkbox
                checked={selected.includes(user.id)}
                onCheckedChange={() => toggle(user.id)}
              />
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                style={{ backgroundColor: user.color ?? "#6470fd" }}
              >
                {initials(user.name)}
              </span>
              <span className="truncate">{user.name}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
