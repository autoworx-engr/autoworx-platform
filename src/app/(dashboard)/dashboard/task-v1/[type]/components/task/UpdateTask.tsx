"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/Dialog";
import Submit from "@/components/Submit";
import { usePopupStore } from "@/stores/popup";
import type { CalendarTask } from "@/types/db";
import type { Priority, User } from "@prisma/client";
// import { TimePicker } from "antd";
import { editTask } from "@/actions/task/editTask.ts";
import { useEffect, useState } from "react";
import { FaTrash } from "react-icons/fa";
import { FaCheck } from "react-icons/fa6";
// @ts-ignore
import { deleteTask } from "@/actions/task/deleteTask.ts";
import FormError from "@/components/FormError";
import { SlimInput, slimInputClassName } from "@/components/SlimInput";
import { cn } from "@/lib/cn";
import { errorToast } from "@/lib/toast";
import { useFormErrorStore } from "@/stores/form-error";
import { addOneHour, formatDateToToday, getCurrentTime } from "@/utils/time";
import moment from "moment";
import AssignTaskDropDown from "./AssignTaskDropDown";

export default function UpdateTask() {
  const { popup, data, close } = usePopupStore();
  const { companyUsers, task } = data as {
    companyUsers: User[];
    task: CalendarTask;
  };

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [assignedUsers, setAssignedUsers] = useState<number[]>(
    task?.assignedUsers?.map((user) => user.id),
  );
  const { clearError, showError } = useFormErrorStore();
  const [priority, setPriority] = useState<Priority>(task.priority);

  const [startTime, setStartTime] = useState<string>(task.startTime || "");
  const [endTime, setEndTime] = useState<string>(task.endTime || "");
  const [date, setDate] = useState<string>(
    moment.utc(task.date).format("YYYY-MM-DD"),
  );

  // Add state for minimum date and time validation
  const [minDate, setMinDate] = useState<string>("");

  // Function to check if the selected date is today
  const isToday = date
    ? new Date(date).toDateString() === new Date().toDateString()
    : false;

  const handleTimeChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "start" | "end",
  ) => {
    let timeValue = e.target.value;

    // Check if date exists and is today
    // const isToday =
    //   date === formatDateToToday(date ?? new Date().toISOString());
    // const currentTime = getCurrentTime(); // Always in 24-hour HH:mm format

    if (type === "start") {
      // ✅ Allow past times for updating, no restriction
      setStartTime(timeValue);

      // ✅ Set `endTime` to 1 hour after `startTime`, but don't override if updating
      if (!endTime || endTime < timeValue) {
        setEndTime(addOneHour(timeValue));
      }
    } else if (type === "end") {
      // ❌ Prevent selecting an end time before `startTime`
      // if (timeValue < startTime!) {
      //   errorToast("End time cannot be before start time!");
      //   return;
      // }

      setEndTime(timeValue);
    }
  };

  // Set minimum date to today
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    setMinDate(`${year}-${month}-${day}`);
  }, []);

  // Add function to generate a reasonable default end time based on start time
  const getDefaultEndTime = (start: string) => {
    if (!start) return "";

    const [hours, minutes] = start.split(":").map(Number);
    let endHours = hours + 1;
    let endMinutes = minutes;

    // Handle midnight crossing
    if (endHours === 24) {
      endHours = 0;
    }

    return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
  };

  async function handleSubmit() {
    try {
      // Add validation for date and time for new tasks or changed dates
      const isDateChanged = date !== moment.utc(task.date).format("YYYY-MM-DD");
      const isStartTimeChanged = startTime !== task.startTime;

      // Only apply past time validation for changed dates/times

      const res = await editTask({
        id: task.id,
        task: {
          title,
          description,
          assignedUsers,
          priority,
          startTime,
          endTime,
          date: moment(date).isValid()
            ? new Date(date).toISOString()
            : undefined,
          // date: moment(date).isValid()
          //   ? new Date(date).toISOString()
          //   : new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      if (res.type === "globalError") {
        showError({
          field: res.field,
          message:
            res.errorSource && res.errorSource.length > 0
              ? res.errorSource[0].message
              : res.message,
        });
        return;
      }

      close();
      clearError();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <Dialog open={popup === "UPDATE_TASK"} onOpenChange={close}>
      <DialogContent className="no-visible-scrollbar #overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Task</DialogTitle>
        </DialogHeader>
        <FormError />
        <form>
          <div className="mb-4 flex flex-col">
            <label htmlFor="title">Title</label>

            <input
              type="text"
              name="title"
              className="mt-2 rounded-md border-2 border-gray-500 p-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="mb-4 flex flex-col">
            <label htmlFor="description">Description</label>

            <textarea
              name="description"
              className="mt-2 rounded-md border-2 border-gray-500 p-1"
              value={description || ""}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div id="timer-parent" className="mb-4 flex flex-col">
            <label htmlFor="time">Time</label>
            <div className="flex items-center space-x-2">
              <div className="flex w-full flex-col lg:flex-row lg:space-x-2">
                <SlimInput
                  name="date"
                  label="Date"
                  rootClassName="grow"
                  type="date"
                  value={date ?? ""}
                  onChange={(event) => setDate(event.currentTarget.value)}
                />
                <div className="flex items-end gap-2">
                  <label className="flex flex-col items-start">
                    <span className="mb-1 text-sm font-medium text-gray-700">
                      Start Time
                    </span>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => handleTimeChange(e, "start")}
                      className={cn(slimInputClassName, "h-[34px] px-3")}
                      // Only disable the time input if the selected date is today, but restrict future time
                      // Restrict time to future if today
                    />
                  </label>

                  <label className="flex flex-col items-start">
                    <span className="mb-1 text-sm font-medium text-gray-700">
                      End Time
                    </span>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => handleTimeChange(e, "end")}
                      className={cn(slimInputClassName, "h-[34px] px-3")}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* custom radio. show user name and image (column)*/}
          {/* TODO */}

          <AssignTaskDropDown
            assignedUsers={assignedUsers}
            companyUsers={companyUsers}
            setAssignedUsers={setAssignedUsers}
            fromUpdate
          />

          <div className="mb-4 flex flex-col">
            <label>Priority</label>

            <div className="flex items-center gap-5">
              <button
                className="relative flex w-full items-center justify-center rounded-md bg-[#6571FF] p-2 text-white"
                onClick={() => setPriority("Low")}
                type="button"
              >
                Low
                {priority === "Low" && (
                  <FaCheck className="absolute right-2 text-white" />
                )}
              </button>
              <button
                className="relative flex w-full items-center justify-center rounded-md bg-[#25AADD] p-2 text-white"
                onClick={() => setPriority("Medium")}
                type="button"
              >
                Medium
                {priority === "Medium" && (
                  <FaCheck className="absolute right-2 text-white" />
                )}
              </button>
              <button
                className="relative flex w-full items-center justify-center rounded-md bg-[#006D77] p-2 text-white"
                onClick={() => setPriority("High")}
                type="button"
              >
                High
                {priority === "High" && (
                  <FaCheck className="absolute right-2 text-white" />
                )}
              </button>
            </div>
          </div>

          <div className="flex gap-10 md:gap-0">
            <button
              className="text-xl text-red-500 hover:text-red-700"
              type="button"
              onClick={async () => {
                await deleteTask(task.id);
                close();
              }}
            >
              <FaTrash />
            </button>

            <DialogFooter className="w-full">
              <DialogClose className="rounded-md border px-4 py-1">
                Cancel
              </DialogClose>
              <Submit
                className="mb-1 rounded-md border bg-[#6571FF] px-4 py-1 text-white md:mb-0"
                formAction={handleSubmit}
              >
                Save
              </Submit>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
