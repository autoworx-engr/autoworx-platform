"use client";
import { CalendarSettings, EmployeeType } from "@prisma/client";

import { DialogClose, DialogFooter } from "@/components/Dialog";
import Submit from "@/components/Submit";
// import ConnectGoogle from "./ConnectGoogle";
import { updateCalendarSettings } from "@/actions/appointment/updateCalendarSettings";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { calenderQueryKey } from "../../_constant";
import ConnectGoogle from "./ConnectGoogle";

const week = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

type TGeneralProps = {
  settings: CalendarSettings;
  onClose: () => void;
  authUser?: any;
};

export default function General({
  settings,
  onClose,
  authUser,
}: TGeneralProps) {
  const isAdmin = authUser?.user.employeeType === EmployeeType?.Admin;
  const isManager = authUser?.user.employeeType === EmployeeType?.Manager;

  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  async function handleSave(data: FormData) {
    const weekStart = data.get("week-start") as string;
    const dayStart = data.get("day-start") as string;
    const dayEnd = data.get("day-end") as string;
    const weekend1 = data.get("weekend-1") as string;
    const weekend2 = data.get("weekend-2") as string;

    if (!dayStart || !dayEnd) {
      setError("Start time and end time are required");
      return;
    }

    const [sh, sm] = dayStart.split(":").map(Number);
    const [eh, em] = dayEnd.split(":").map(Number);

    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;

    if (endMinutes <= startMinutes) {
      setError("End time should not be earlier than start time");
      return;
    }

    await updateCalendarSettings({
      weekStart,
      dayStart,
      dayEnd,
      weekend1,
      weekend2,
    });
    queryClient.invalidateQueries({
      queryKey: [calenderQueryKey.calendarSettings],
    });
    queryClient.invalidateQueries({
      queryKey: [calenderQueryKey.weekStartEndDaysSettings],
    });

    onClose();
  }
  return (
    <>
      {error && (
        <div>
          <p className="text-red-500 text-center">{error}</p>
        </div>
      )}

      {isAdmin || isManager ? (
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
              <p className="font-semibold md:mt-[6px]">Google Calendar Api</p>
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
      ) : (
        <div className="h-36 rounded-md bg-[#FAFAFA] p-3">
          <div className="flex flex-wrap justify-between gap-2">
            <p className="font-semibold md:mt-[6px]">Google Calendar Api</p>
            <ConnectGoogle />
          </div>
        </div>
      )}
    </>
  );
}
