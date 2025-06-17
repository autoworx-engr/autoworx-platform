import { createHoliday } from "@/actions/task/createHoliday";
import getHoliday from "@/actions/task/getHoliday";
import moment from "moment";
import { useSession } from "next-auth/react";
import { useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { Calendar, DateObject } from "react-multi-date-picker";
import DatePanel from "react-multi-date-picker/plugins/date_panel";

export default function HolidayComponent() {
  const { data: session } = useSession();
  const [values, setValues] = useState<DateObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [selectedMonth, setSelectedMonth] = useState<string>(
    moment().format("MMMM"),
  );
  const [selectedYear, setSelectedYear] = useState<number>(moment().year());

  const authUser = session;

  // Fetch holidays when month or year changes
  useEffect(() => {
    const fetchHolidays = async () => {
      if (!authUser?.user?.companyId || !selectedMonth || !selectedYear) return;

      setLoading(true);
      
     

      try {
        const holidays = await getHoliday(
          authUser.user.companyId,
          selectedMonth,
          selectedYear,
        );
        setValues(holidays.map((holiday) => new DateObject(holiday.date)));
      } catch (error) {
        console.error("Error fetching holidays:", error);
        toast.error("Failed to load holidays");
      } finally {
        setLoading(false);
      }

      

    };

    fetchHolidays();
  }, [selectedMonth, selectedYear, authUser?.user?.companyId]);

  // Save holidays when month changes or Apply is clicked
  const handleAddHoliday = async (fromMonthChange: boolean = false) => {
    if (!authUser?.user?.companyId) return;

    try {

      const totalHolidays = values.map((date) => ({
        year: date.year,
        month: date.month.name,
        companyId: authUser.user.companyId,
        date: new Date(date.format("YYYY-MM-DD") as string).toISOString(),
      }))
      const response = await createHoliday(
        totalHolidays,
        selectedMonth,
        selectedYear,
      );

      if (response.status === 200 && !fromMonthChange) {
        toast.success("Holidays set successfully");
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

  return (
    <div className="w-full">
      <div className="w-full rounded-lg border p-4 shadow-md">
        <div className="calendar-container w-full">
          <Calendar
            multiple
            value={values}
            onChange={setValues}
            onMonthChange={handleMonthChange}
            plugins={[<DatePanel key="datepanel" />]}
            className="w-full bg-white"
            showOtherDays
          />

          {/* Action buttons */}
          <div className="mt-4 flex w-full items-center justify-between border-t pt-4">
            <button
              onClick={() => setValues([])}
              className="rounded-md border px-3 py-1.5 hover:bg-gray-100"
            >
              Clear All
            </button>
            <button
              disabled={pending || loading}
              onClick={() => startTransition(() => handleAddHoliday(false))}
              className="rounded-md border bg-green-100 px-3 py-1.5 font-medium hover:bg-green-200 disabled:bg-gray-300"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
