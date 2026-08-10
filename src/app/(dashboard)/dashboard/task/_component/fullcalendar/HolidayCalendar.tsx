import { createHoliday } from "@/actions/task/createHoliday";
import { useCalendarStore } from "@/stores/calendarStore";
import { useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import { useSession } from "next-auth/react";
import { useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { Calendar, DateObject } from "react-multi-date-picker";
import DatePanel from "react-multi-date-picker/plugins/date_panel";
import { calenderQueryKey } from "../../_constant";
import useHolidaysQuery from "../../_hook/useHolidaysQuery";

export default function HolidayCalendar() {
  const { data: session } = useSession();

  const authUser = session?.user;
  const [pending, startTransition] = useTransition();
  const { selectedMonth, setSelectedMonth, selectedYear, setSelectedYear } =
    useCalendarStore((state) => ({
      selectedMonth: state.holidaySelectedMonth,
      selectedYear: state.holidaySelectedYear,
      setSelectedMonth: state.setHolidaySelectedMonth,
      setSelectedYear: state.setHolidaySelectedYear,
    }));

  const queryClient = useQueryClient();
  const [isDirty, setIsDirty] = useState(false);

  // Reset dirty flag when month/year changes (new context = fresh state)
  useEffect(() => {
    setIsDirty(false);
  }, [selectedMonth, selectedYear]);

  const { data: holidays = [], isLoading } = useHolidaysQuery(
    selectedMonth,
    selectedYear,
  );

  const holidaysFormatted = holidays?.map((holiday) => {
    // Use UTC date string to avoid timezone shift — e.g. "2026-04-22T00:00:00Z"
    // interpreted in local time could show as Apr 21 in UTC-X timezones.
    const dateOnly = moment
      .utc(holiday.date as unknown as string)
      .format("YYYY-MM-DD");
    return new DateObject(dateOnly);
  });

  // Save holidays when month changes or Apply is clicked
  const handleAddHoliday = async (fromMonthChange: boolean = false) => {
    if (!authUser?.companyId) return;
    console.log({ fromMonthChange });

    try {
      const totalHolidays = holidaysFormatted.map((date) => ({
        year: date.year,
        month: date.month.name,
        companyId: authUser.companyId,
        date: new Date(`${date.format("YYYY-MM-DD")}T00:00:00Z`).toISOString(),
      }));

      const response = await createHoliday(
        totalHolidays,
        selectedMonth,
        selectedYear,
      );

      if (response.status === 200 && !fromMonthChange) {
        queryClient.invalidateQueries({
          queryKey: [calenderQueryKey.holidays, selectedMonth, selectedYear],
        });
        queryClient.invalidateQueries({
          queryKey: [calenderQueryKey.holidays],
        });
        toast.success("Holidays set successfully");
        setIsDirty(false);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to set holidays. Please try again.");
    }
  };

  // Handle month change and save current selection
  const handleMonthChange = (date: DateObject) => {
    handleAddHoliday(true);
    setSelectedMonth(date.month.name);
    setSelectedYear(date.year);
  };

  // handle holidays clear
  const handleAllHolidaysClear = () => {
    queryClient.setQueryData(
      [calenderQueryKey.holidays, selectedMonth, selectedYear],
      [],
    );
    setIsDirty(true);
  };

  const handleHolidayChanges = (values: DateObject[]) => {
    const holidays = values.map((date) => ({
      year: date.year,
      month: date.month.name,
      companyId: authUser?.companyId,
      date: new Date(date.format("YYYY-MM-DD") as string).toISOString(),
    }));
    queryClient.setQueryData(
      [calenderQueryKey.holidays, selectedMonth, selectedYear],
      holidays,
    );
    setIsDirty(true);
  };

  return (
    <div className="w-full">
      <div className="w-full rounded-lg border p-4 shadow-md">
        <div className="calendar-container w-full">
          <Calendar
            multiple
            value={holidaysFormatted}
            onChange={handleHolidayChanges}
            onMonthChange={handleMonthChange}
            plugins={[<DatePanel key="date-panel" className="sm:w-36" />]}
            className="w-full bg-white"
            showOtherDays
          />

          {/* Action buttons */}
          <div className="mt-4 flex w-full items-center justify-between border-t pt-4">
            <button
              disabled={
                !queryClient.getQueryData<any[]>([
                  calenderQueryKey.holidays,
                  selectedMonth,
                  selectedYear,
                ])?.length
              }
              onClick={handleAllHolidaysClear}
              className="rounded-md border px-3 py-1.5 hover:bg-gray-100"
            >
              Clear All
            </button>
            <button
              disabled={!isDirty || pending || isLoading}
              onClick={() => startTransition(() => handleAddHoliday(false))}
              className="rounded-md border bg-green-100 px-3 py-1.5 font-medium hover:bg-green-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
