"use client";

import moment from "moment";
import { useMemo } from "react";
import { useCalendarStore } from "@/stores/calendarStore";
import useMonth from "@/app/(dashboard)/dashboard/task/_hook/lib/useMonth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MONTHS = moment.months(); // ["January", ..., "December"]

/**
 * Month + Year quick-jump control shown in the calendar header (month view).
 * Two independently clickable, scrollable dropdowns; selecting either jumps the
 * calendar via the store (useCalendarStoreSync calls calApi.gotoDate).
 */
export default function MonthYearPicker() {
  const month = useMonth(); // "YYYY-MM" | null
  const base = useMemo(
    () => (month ? moment(month, "YYYY-MM") : moment()),
    [month],
  );
  const selMonth = base.month(); // 0-11
  const selYear = base.year();

  const years = useMemo(() => {
    const now = moment().year();
    const start = Math.min(now, selYear) - 10;
    const end = Math.max(now, selYear) + 10;
    const list: number[] = [];
    for (let y = start; y <= end; y++) list.push(y);
    return list;
  }, [selYear]);

  const { setMonth, setDate } = useCalendarStore();

  const jump = (year: number, monthIndex: number) => {
    const m = moment().year(year).month(monthIndex).startOf("month");
    setMonth(m.format("YYYY-MM"));
    setDate(m.format("YYYY-MM-DD"));
  };

  const triggerClass =
    "h-auto gap-1 border-0 bg-transparent px-1 text-base font-semibold text-slate-900 shadow-none focus:ring-0 focus:ring-offset-0 sm:text-lg";

  return (
    <div className="flex items-center gap-1">
      <Select
        value={String(selMonth)}
        onValueChange={(v) => jump(selYear, Number(v))}
      >
        <SelectTrigger className={triggerClass} aria-label="Select month">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((name, i) => (
            <SelectItem key={name} value={String(i)}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={String(selYear)}
        onValueChange={(v) => jump(Number(v), selMonth)}
      >
        <SelectTrigger className={triggerClass} aria-label="Select year">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
