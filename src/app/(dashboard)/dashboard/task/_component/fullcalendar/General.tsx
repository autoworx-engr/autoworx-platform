"use client";

import { updateCalendarSettings } from "@/actions/appointment/updateCalendarSettings";
import { DialogClose, DialogFooter } from "@/components/Dialog";
import Submit from "@/components/Submit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { errorToast, successToast } from "@/lib/toast";
import { CalendarSettings, EmployeeType } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { calenderQueryKey } from "../../_constant";
import ConnectGoogle from "./ConnectGoogle";

const WEEK_DAYS = [
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
  const [weekStart, setWeekStart] = useState(settings?.weekStart ?? "Monday");
  const [weekend1, setWeekend1] = useState(settings?.weekend1 ?? "Saturday");
  const [weekend2, setWeekend2] = useState(settings?.weekend2 ?? "Sunday");

  const queryClient = useQueryClient();

  async function handleSave(data: FormData) {
    const dayStart = data.get("day-start") as string;
    const dayEnd = data.get("day-end") as string;

    if (!dayStart || !dayEnd) {
      setError("Start time and end time are required");
      return;
    }

    const [sh, sm] = dayStart.split(":").map(Number);
    const [eh, em] = dayEnd.split(":").map(Number);

    if (eh * 60 + em <= sh * 60 + sm) {
      setError("End time should not be earlier than start time");
      return;
    }

    try {
      const result = await updateCalendarSettings({
        weekStart,
        dayStart,
        dayEnd,
        weekend1,
        weekend2,
      });

      if (result?.type === "success") {
        queryClient.invalidateQueries({
          queryKey: [calenderQueryKey.calendarSettings],
        });
        queryClient.invalidateQueries({
          queryKey: [calenderQueryKey.weekStartEndDaysSettings],
        });
        setError(null);
        successToast("Calendar settings saved");
        onClose();
      } else {
        errorToast(result?.message || "Failed to save calendar settings");
      }
    } catch {
      errorToast("Failed to save calendar settings");
    }
  }

  return (
    <>
      {error && <p className="text-center text-sm text-red-500">{error}</p>}

      {isAdmin || isManager ? (
        <form className="flex flex-col gap-6">
          {/* Row 1: Week Starts · Day starts · Day ends */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Week Starts */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="week-start">Week Starts</Label>
              <Select value={weekStart} onValueChange={setWeekStart}>
                <SelectTrigger size="md" id="week-start" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEK_DAYS.map((day) => (
                    <SelectItem key={day} value={day}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Day starts */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="day-start">Day starts</Label>
              <Input
                type="time"
                id="day-start"
                name="day-start"
                defaultValue={settings?.dayStart ?? "10:00"}
                className="w-full"
              />
            </div>

            {/* Day ends */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="day-end">Day ends</Label>
              <Input
                type="time"
                id="day-end"
                name="day-end"
                defaultValue={settings?.dayEnd ?? "18:00"}
                className="w-full"
              />
            </div>
          </div>

          {/* Row 2: Show Weekends */}
          <div className="flex flex-col gap-1.5">
            <Label>Show Weekends</Label>
            <div className="grid grid-cols-2 gap-3">
              <Select value={weekend1} onValueChange={setWeekend1}>
                <SelectTrigger
                  size="md"
                  className="w-full border-primary bg-[#EEF0FF] text-primary focus:ring-primary"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEK_DAYS.map((day) => (
                    <SelectItem key={day} value={day}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={weekend2} onValueChange={setWeekend2}>
                <SelectTrigger
                  size="md"
                  className="w-full border-primary bg-[#EEF0FF] text-primary focus:ring-primary"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEK_DAYS.map((day) => (
                    <SelectItem key={day} value={day}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Google Calendar */}
          <div className="rounded-md bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">Google Calendar Api</p>
              <ConnectGoogle />
            </div>
          </div>

          {/* Footer */}
          <DialogFooter>
            <DialogClose asChild>
              <button
                type="button"
                className="mt-2 rounded-xl border px-5 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 sm:mt-0"
              >
                Cancel
              </button>
            </DialogClose>
            <Submit
              className="rounded-xl bg-gradient-to-r from-primary to-[#5a66ee] px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/40 active:translate-y-0 active:scale-100"
              formAction={handleSave}
            >
              Save
            </Submit>
          </DialogFooter>
        </form>
      ) : (
        <div className="rounded-md bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">Google Calendar Api</p>
            <ConnectGoogle />
          </div>
        </div>
      )}
    </>
  );
}
