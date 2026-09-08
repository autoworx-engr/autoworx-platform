"use client";

import { cn } from "@/lib/cn";
import { User as UserRecord } from "@prisma/client";
import { File } from "lucide-react";
import { initialsOf } from "./teamCardStyles";

const roleBadgeClass = (employeeType?: string | null) => {
  if (employeeType === "Technician") return "bg-emerald-100 text-emerald-700";
  if (employeeType === "Manager") return "bg-blue-100 text-blue-700";
  if (employeeType === "Admin") return "bg-violet-100 text-violet-700";
  if (employeeType === "Sales") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
};

interface TeamColumnHeaderProps {
  title: string;
  count: number;
  employee?: UserRecord;
}

export default function TeamColumnHeader({
  title,
  count,
  employee,
}: TeamColumnHeaderProps) {
  return (
    <div className="flex min-h-[3.5rem] min-w-0 items-center gap-2.5 rounded-lg bg-[#6574FD] px-3 py-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {initialsOf(employee?.firstName, employee?.lastName) ||
          initialsOf(title.split(" ")[0], title.split(" ")[1])}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-900">
          {title || "Unassigned"}
        </p>
        {employee?.employeeType && (
          <span
            className={cn(
              "mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold",
              roleBadgeClass(employee.employeeType),
            )}
          >
            {employee.employeeType}
          </span>
        )}
      </div>

      <span className="flex shrink-0 items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
        <File className="size-3.5" />
        {count}
      </span>
    </div>
  );
}
