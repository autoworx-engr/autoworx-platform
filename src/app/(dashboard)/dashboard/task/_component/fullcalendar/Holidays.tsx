// import ConnectGoogle from "./ConnectGoogle";
import getHoliday from "@/actions/task/getHoliday";
import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import { useSession } from "next-auth/react";
import { calenderQueryKey } from "../../_constant";
import TaskError from "../ui/TaskError";
import TaskNotFound from "../ui/TaskNotFound";
import TaskSpinner from "../ui/TaskSpinner";
import HolidayCalendar from "./HolidayCalendar";
import HolidayDeleteConfirmation from "./HolidayDeleteConfirmation";

export default function Holidays() {
  const session = useSession();
  const authUser = session.data?.user;

  const {
    data: holidays,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [calenderQueryKey.holidays],
    queryFn: async () => {
      if (!authUser?.companyId) return [];
      const companyId = authUser?.companyId;
      const holidays = await getHoliday(companyId);
      return holidays;
    },
  });

  let content = null;

  if (isLoading && !isError) {
    content = <TaskSpinner />;
  } else if (!isLoading && isError) {
    content = <TaskError message="Failed to load holidays" />;
  } else if (!isLoading && !isError && holidays && holidays.length === 0) {
    content = <TaskNotFound message="No holidays found" />;
  } else if (!isLoading && !isError && holidays && holidays.length > 0) {
    content = holidays.map((holiday, index) => (
      <div
        key={index}
        className="group flex items-center justify-between rounded-xl px-5 py-2 shadow-sm transition-colors duration-200 hover:bg-gray-100"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div className="flex flex-col">
            <p className="text-base font-medium text-gray-800">
              {moment.utc(holiday.date).format("dddd, MMMM D")}
            </p>
            <p className="text-sm text-gray-500">
              {moment.utc(holiday.date).format("YYYY")}
            </p>
          </div>
        </div>
        {holiday.id && (
          <div>
            <HolidayDeleteConfirmation holidayId={holiday.id as number} />
          </div>
        )}
      </div>
    ));
  }
  return (
    <>
      <HolidayCalendar />
      <div>
        <h3 className="text-xl font-medium lg:text-2xl">Holidays List:</h3>
        <div className="overflow-auto h-60 [@media(min-width:426px)]:h-52 2xl:h-36 thin-scrollbar pb-2">
          {content}
        </div>
      </div>
    </>
  );
}
