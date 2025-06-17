import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/Dialog";
import Submit from "@/components/Submit";
import { CalendarSettings, EmployeeType, Holiday } from "@prisma/client";
import React, { useEffect, useRef, useState, useTransition } from "react";
import { GoGear } from "react-icons/go";
import { updateCalendarSettings } from "@/actions/appointment/updateCalendarSettings";
import ConnectGoogle from "./ConnectGoogle";
import getHoliday from "@/actions/task/getHoliday";
import { useSession } from "next-auth/react";
import { DateObject } from "react-multi-date-picker";
import DatePanel from "react-multi-date-picker/plugins/date_panel";
import moment from "moment";
import HolidayButton from "../../Calendar/HolidayButton";
import HolidayDeleteConfirmation from "../../Calendar/HolidayDeleteConfiramtion";

const week = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

export default function Settings({
  settings,
  holidays,
}: {
  settings?: CalendarSettings;
  holidays: Partial<Holiday>[];
}) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  // setDayStart and setDayEnd
  const [dayStart, setDayStart] = useState(settings?.dayStart ?? "");
  const [dayEnd, setDayEnd] = useState(settings?.dayEnd ?? "");

  // Holiday functionality
  const { data: session } = useSession();
  const [values, setValues] = useState<DateObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [selectedMonth, setSelectedMonth] = useState<string>(
    moment().format("MMMM"),
  );
  const [selectedYear, setSelectedYear] = useState<number>(moment().year());
  const authUser = session;

  const isAdmin = authUser?.user.employeeType === EmployeeType.Admin;

  async function handleSave(data: FormData) {
    const weekStart = data.get("week-start") as string;
    const dayStart = data.get("day-start") as string;
    const dayEnd = data.get("day-end") as string;
    const weekend1 = data.get("weekend-1") as string;
    const weekend2 = data.get("weekend-2") as string;

    await updateCalendarSettings({
      weekStart,
      dayStart,
      dayEnd,
      weekend1,
      weekend2,
    });

    setOpen(false);
  }

  useEffect(() => {
    const fetchHolidays = async () => {
      if (!selectedMonth || !selectedYear || !authUser?.user?.companyId) return;

      setLoading(true);
      const companyId = authUser?.user?.companyId;
      const holidays = await getHoliday(companyId, selectedMonth, selectedYear);
      setLoading(false);
      setValues(holidays.map((holiday) => new DateObject(holiday.date)));
    };

    if (activeTab === "holidays" && open) {
      fetchHolidays();
    }
  }, [selectedMonth, selectedYear, authUser?.user?.companyId, activeTab, open]);

  return (
    <div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button className="app-shadow rounded-md p-[5px] text-xl text-[#797979] md:p-2">
            <GoGear />
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-xl grid-rows-[auto,1fr,auto]">
          {/* Heading */}
          <DialogHeader>
            <DialogTitle>Calendar Settings</DialogTitle>
            <div className="mt-4 flex border-b">
              <button
                onClick={() => setActiveTab("general")}
                className={`px-4 py-2 font-medium ${
                  activeTab === "general"
                    ? "border-b-2 border-[#6571FF] text-[#6571FF]"
                    : "text-gray-600"
                }`}
              >
                General
              </button>
              {isAdmin && (
                <button
                  onClick={() => setActiveTab("holidays")}
                  className={`px-4 py-2 font-medium ${
                    activeTab === "holidays"
                      ? "border-b-2 border-[#6571FF] text-[#6571FF]"
                      : "text-gray-600"
                  }`}
                >
                  Holidays
                </button>
              )}
            </div>
          </DialogHeader>

          {/* Content */}
          {activeTab === "general" && (
            <form className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
                <div>
                  <label htmlFor="week-start" className="font-medium">
                    Week Starts
                  </label>
                  <select
                    id="week-start"
                    name="week-start"
                    className="w-full rounded-md border-2 border-gray-400 bg-background p-1 px-2 sm:w-32"
                    defaultValue={settings && settings.weekStart}
                  >
                    <option value="Sunday">Sunday</option>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="day-start" className="font-medium">
                    Day starts
                  </label>
                  <input
                    type="time"
                    id="day-start"
                    name="day-start"
                    defaultValue={settings ? settings.dayStart : "10:00"}
                    className="w-full rounded-md border-2 border-slate-400 p-1 sm:w-auto"
                    onChange={(e) => setDayStart(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="day-end" className="font-medium">
                    Day ends
                  </label>
                  <input
                    type="time"
                    id="day-end"
                    name="day-end"
                    defaultValue={settings ? settings.dayEnd : "18:00"}
                    className="w-full rounded-md border-2 border-slate-400 p-1 sm:w-auto"
                    onChange={(e) => setDayEnd(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <div>
                  <p className="font-medium">Show Weekends</p>
                  <div className="flex gap-5">
                    <div className="w-full">
                      <select
                        id="weekend-1"
                        name="weekend-1"
                        className="w-full rounded-md border border-[#6571FF] bg-[#DDE0FF] p-1 text-center text-[#6571FF] focus:border-[#6571FF] focus:bg-background focus:text-black"
                        defaultValue={settings && settings.weekend1}
                      >
                        {week.map((day) => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-full">
                      <select
                        id="weekend-2"
                        name="weekend-2"
                        className="w-full rounded-md border border-[#6571FF] bg-[#DDE0FF] p-1 text-center text-[#6571FF] focus:border-[#6571FF] focus:bg-background focus:text-black"
                        defaultValue={settings && settings.weekend2}
                      >
                        {week.map((day) => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-36 rounded-md bg-[#FAFAFA] p-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-semibold md:mt-[6px]">
                    Google Calendar Api
                  </p>
                  <ConnectGoogle />
                </div>
              </div>

              {/* Footer */}
              <DialogFooter>
                <DialogClose asChild>
                  <button
                    type="button"
                    className="rounded-md border-2 border-slate-400 p-1"
                  >
                    Cancel
                  </button>
                </DialogClose>
                <Submit
                  className="mb-2 rounded-md bg-[#6571FF] p-1 px-5 text-white md:mb-0"
                  formAction={handleSave}
                >
                  Save
                </Submit>
              </DialogFooter>
            </form>
          )}

          {activeTab === "holidays" && isAdmin && (
            <>
              <HolidayButton />
              <div>
                <h3 className="text-xl font-medium lg:text-2xl">
                  Holidays List:
                </h3>
                <div className="overflow-auto 2xl:h-20">
                  {holidays?.map((holiday) => (
                    <div
                      key={holiday.id}
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
                            {moment(holiday.date).format("dddd, MMMM D")}
                          </p>
                          <p className="text-sm text-gray-500">
                            {moment(holiday.date).format("YYYY")}
                          </p>
                        </div>
                      </div>
                      <div>
                        <HolidayDeleteConfirmation
                          holidayId={holiday.id as number}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Pass start and end times to Day component */}
      {/* <Day dayStart={dayStart} dayEnd={dayEnd} /> */}
    </div>
  );
}
