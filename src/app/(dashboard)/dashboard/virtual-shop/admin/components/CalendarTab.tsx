"use client";

import type { VirtualShopBookingCalendarItem } from "@/service/virtual-shop/api";
import { Pagination } from "antd";
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Loader2,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";
import CalendarAppointmentCard from "./CalendarAppointmentCard";
import CalendarGrid from "./CalendarGrid";
import CalendarListView from "./CalendarListView";
import type { CalendarTabProps } from "./CalendarTab.types";
import {
  MONTH_NAMES,
  formatDateKey,
  mapBookingToAppointment,
  mapCalendarItemToAppointment,
} from "./CalendarTab.utils";

const PAGE_SIZE = 10;

export default function CalendarTab({
  viewMode,
  viewYear,
  viewMonth,
  selectedDate,
  selectedDatePage,
  listPage,
  monthCalendarResponse,
  selectedDateResponse,
  monthListResponse,
}: CalendarTabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const pushWithParams = (
    updates: Record<string, string>,
    deleteKeys: string[] = [],
  ) => {
    const params = new URLSearchParams(searchParams.toString());

    deleteKeys.forEach((key) => {
      params.delete(key);
    });

    Object.entries(updates).forEach(([key, value]) => {
      params.set(key, value);
    });

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const calendarAppointments = useMemo(
    () =>
      (monthCalendarResponse?.data || []).map(
        (item: VirtualShopBookingCalendarItem) =>
          mapCalendarItemToAppointment(item),
      ),
    [monthCalendarResponse?.data],
  );

  const selectedAppts = useMemo(
    () => (selectedDateResponse?.data || []).map(mapBookingToAppointment),
    [selectedDateResponse?.data],
  );

  const listAppts = useMemo(
    () => (monthListResponse?.data || []).map(mapBookingToAppointment),
    [monthListResponse?.data],
  );

  const selectedDateTotal = selectedDateResponse?.meta?.totalRecords || 0;
  const monthTotal = monthListResponse?.meta?.totalRecords || 0;

  const getDefaultDateForMonth = (year: number, month: number) => {
    const today = new Date();
    const isCurrentMonth =
      year === today.getFullYear() && month === today.getMonth();
    const day = isCurrentMonth ? today.getDate() : 1;

    return formatDateKey(year, month, day);
  };

  const goToPrev = () => {
    const nextMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    const nextYear = viewMonth === 0 ? viewYear - 1 : viewYear;

    if (viewMode === "grid") {
      pushWithParams(
        {
          year: String(nextYear),
          month: String(nextMonth + 1),
          date: getDefaultDateForMonth(nextYear, nextMonth),
          selectedPage: "1",
        },
        ["listPage"],
      );
      return;
    }

    pushWithParams(
      {
        year: String(nextYear),
        month: String(nextMonth + 1),
        listPage: "1",
      },
      ["date", "selectedPage"],
    );
  };

  const goToNext = () => {
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;

    if (viewMode === "grid") {
      pushWithParams(
        {
          year: String(nextYear),
          month: String(nextMonth + 1),
          date: getDefaultDateForMonth(nextYear, nextMonth),
          selectedPage: "1",
        },
        ["listPage"],
      );
      return;
    }

    pushWithParams(
      {
        year: String(nextYear),
        month: String(nextMonth + 1),
        listPage: "1",
      },
      ["date", "selectedPage"],
    );
  };

  const selectedDateLabel = (() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  })();

  const totalAppts =
    viewMode === "grid" ? calendarAppointments.length : monthTotal;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-3">
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={goToPrev}
              className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft
                size={16}
                className="text-slate-600 dark:text-slate-300"
              />
            </button>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 min-w-[110px] sm:min-w-[160px] text-center tabular-nums">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h2>
            <button
              onClick={goToNext}
              className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronRight
                size={16}
                className="text-slate-600 dark:text-slate-300"
              />
            </button>
          </div>
          {totalAppts > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 dark:bg-primary/20 text-primary">
              {totalAppts} appt{totalAppts !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="flex items-center gap-0 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
          <button
            onClick={() =>
              pushWithParams(
                {
                  mode: "grid",
                  selectedPage: "1",
                },
                ["listPage"],
              )
            }
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all duration-200 ${
              viewMode === "grid"
                ? "bg-primary text-white"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            <LayoutGrid size={14} /> Calendar
          </button>
          <button
            onClick={() =>
              pushWithParams(
                {
                  mode: "list",
                  listPage: "1",
                },
                ["date", "selectedPage"],
              )
            }
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all duration-200 ${
              viewMode === "list"
                ? "bg-primary text-white"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            <List size={14} /> List
          </button>
        </div>
      </div>

      {viewMode === "list" ? (
        <>
          {isPending && (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 size={16} className="animate-spin" />
              Loading appointments...
            </div>
          )}

          <CalendarListView appointments={listAppts} />

          {monthTotal > 0 && (
            <div className="flex justify-end">
              <Pagination
                current={listPage}
                total={monthTotal}
                pageSize={PAGE_SIZE}
                showSizeChanger={false}
                onChange={(page) =>
                  pushWithParams(
                    {
                      mode: "list",
                      listPage: String(page),
                    },
                    ["date", "selectedPage"],
                  )
                }
              />
            </div>
          )}
        </>
      ) : (
        <>
          <CalendarGrid
            year={viewYear}
            month={viewMonth}
            appointments={calendarAppointments}
            selectedDate={selectedDate}
            onSelectDate={(date) => {
              pushWithParams(
                {
                  mode: "grid",
                  date,
                  selectedPage: "1",
                },
                ["listPage"],
              );
            }}
          />

          <div>
            <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2 sm:mb-3">
              {selectedDateLabel}
            </p>
            {isPending && selectedAppts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 text-slate-400 dark:text-slate-500">
                <Loader2 size={16} className="animate-spin" />
                Loading appointments...
              </div>
            ) : selectedAppts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 text-slate-400 dark:text-slate-500">
                <p className="text-sm font-medium">
                  No appointments on this day
                </p>
                <p className="text-xs mt-1 opacity-70">
                  Select a date with dots to view appointments
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedAppts.map((a) => (
                  <CalendarAppointmentCard key={a.id} appt={a} />
                ))}
              </div>
            )}

            {selectedDateTotal > 0 && (
              <div className="mt-4 flex justify-end">
                <Pagination
                  current={selectedDatePage}
                  total={selectedDateTotal}
                  pageSize={PAGE_SIZE}
                  showSizeChanger={false}
                  onChange={(page) =>
                    pushWithParams(
                      {
                        mode: "grid",
                        selectedPage: String(page),
                      },
                      ["listPage"],
                    )
                  }
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
