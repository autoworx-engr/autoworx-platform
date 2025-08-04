"use client";

import { DropdownSelection } from "@/components/DropDownSelection.tsx";
import { CalendarType } from "@/types/calendar";
import type { EmailTemplate, Holiday } from "@prisma/client";
import { CalendarSettings, Client, User, Vehicle } from "@prisma/client";
import moment from "moment";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { NewAppointment } from "../components/appointment/NewAppointment.tsx";
import Settings from "../components/appointment/Settings.tsx";
import ArrowButton from "./ArrowButton.tsx";
import CalendarSearch from "./CalendarSearch.tsx";
import DateSelector from "./DateSelector.tsx"; // Import the new component

const BUTTON_STYLE = "app-shadow rounded-md p-2 text-[#797979]";
const DROPDOWN_STYLE =
  "app-shadow rounded-md bg-background px-3 py-2 text-[#797979] capitalize";

const ALLOWED_ROLES_FOR_NEW_APPOINTMENT = ["Admin", "Manager", "Sales"];

import { useCalendarStore } from "@/stores/calendarStore";

function DisplayDate({ type }: { type: CalendarType }) {
  const { date, week, month } = useCalendarStore();

  const param = type === "day" ? date : type === "week" ? week : month;
  const formattedDate = moment(param).isValid()
    ? moment(param).format(type === "day" ? "dddd, D MMMM YYYY" : "MMMM YYYY")
    : moment().format(type === "day" ? "dddd, D MMMM YYYY" : "MMMM YYYY");

  return <>{formattedDate}</>;
}

export default function Heading({
  type,
  customers,
  vehicles,
  settings,
  employees,
  templates,
  user,
  appointments,
  tasks,
  holidays,
}: {
  type: CalendarType;
  customers: Client[];
  vehicles: Vehicle[];
  settings: CalendarSettings;
  employees: User[];
  templates: EmailTemplate[];
  user: User;
  tasks: any[];
  appointments: any[];
  holidays: Partial<Holiday>[];
}) {
  const calenderQueryType = type === "day" ? "date" : type;
  const { setDate, setNavigating } = useCalendarStore();
  const router = useRouter();
  const handleTodayClick = () => {
    const today = moment().format("YYYY-MM-DD");
    setDate(today);

    if (type !== "day") {
      // Set navigation flag to prevent reset, then navigate
      setNavigating(true);
      router.push("day");

      // Clear navigation flag after a short delay to allow navigation to complete
      // setTimeout(() => setNavigating(false), 30000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-between md:flex-row">
      <h2 className="mb-4 font-bold text-[#797979] max-[1300px]:text-[20px] md:ml-2 md:text-base lg:text-[26px]">
        <Suspense>
          <DisplayDate type={type} />
        </Suspense>
      </h2>

      <div className="flex flex-wrap items-center justify-between gap-1 text-left lg:justify-end xl:gap-3">
        {/* Desktop Search */}
        <div className="mb-2 hidden w-full md:mb-0 lg:block lg:w-64">
          <CalendarSearch
            type={type}
            tasks={tasks}
            appointments={appointments}
          />
        </div>

        {/* Custom Date Selector - replaces GoToDate */}
        <DateSelector type={type} weekStart={settings?.weekStart} />

        {/* today */}
        <button
          className={`${BUTTON_STYLE} hidden lg:block`}
          onClick={handleTodayClick}
        >
          Today
        </button>

        {/* Arrow next or previous day/week/month */}
        <ArrowButton
          direction="back"
          type={type}
          calenderQueryType={calenderQueryType}
        />
        <ArrowButton
          direction="forward"
          type={type}
          calenderQueryType={calenderQueryType}
        />

        {/* dropdown selection day, week and month */}
        <div>
          {" "}
          <DropdownSelection
            dropDownValues={["day", "week", "month"]}
            onValueChange={(value) => {
              // Set navigation flag to prevent reset, then navigate
              setNavigating(true);
              router.push(value.toLowerCase());

              // Clear navigation flag after a short delay to allow navigation to complete
              // setTimeout(() => setNavigating(false), 30000);
            }}
            changesValue={type}
            buttonClassName={DROPDOWN_STYLE}
            contentClassName="capitalize"
          />
        </div>
        {/* new appointment */}
        {ALLOWED_ROLES_FOR_NEW_APPOINTMENT.includes(user.employeeType) && (
          <NewAppointment
            settings={settings}
            employees={employees}
            templates={templates}
          />
        )}

        <Settings settings={settings} holidays={holidays} />

        {/* Mobile Search */}
        <div className="my-2 block w-full md:mb-0 lg:hidden">
          <CalendarSearch
            tasks={tasks}
            appointments={appointments}
            type={type}
          />
        </div>
      </div>
    </div>
  );
}
