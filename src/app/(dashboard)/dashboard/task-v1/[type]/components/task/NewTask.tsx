"use client";

import { createTask } from "@/actions/task/createTask.ts";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/Dialog";
import FormError from "@/components/FormError";
import { SlimInput, slimInputClassName } from "@/components/SlimInput";
import Submit from "@/components/Submit";
import { cn } from "@/lib/cn";
import { errorToast } from "@/lib/toast";
import { useFormErrorStore } from "@/stores/form-error";
import { addOneHour, formatDateToToday, getCurrentTime } from "@/utils/time";
import { Priority, User } from "@prisma/client";
import { useEffect, useRef, useState } from "react";
import { FaCheck, FaPlus } from "react-icons/fa6";
import AssignTaskDropDown from "./AssignTaskDropDown";
import { useCalendarStore } from "@/stores/calendarStore";
import { useRouter } from "next/navigation";

export default function NewTask({
  companyUsers,
  onlyOneUser = false,
  isClientTask = false,
  clientId = null,
}: {
  companyUsers: User[];
  onlyOneUser?: boolean;
  isClientTask?: boolean;
  clientId?: number | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // const [showUsers, setShowUsers] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedUsers, setAssignedUsers] = useState<number[]>([]);
  const [priority, setPriority] = useState<Priority>("Low");
  const [time, setTime] = useState<{ startTime: string; endTime: string }>();
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [minDate, setMinDate] = useState<string>("");
  const { showError, clearError } = useFormErrorStore();

  const { setUpdateVariable } = useCalendarStore();

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

  // Function to check if the selected date is today
  // const isToday = date
  //   ? new Date(date).toDateString() === new Date().toDateString()
  //   : false;

  const handleTimeChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "start" | "end"
  ) => {
    let timeValue = e.target.value;

    // Regex: HH:mm (00:00 - 23:59)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (!timeRegex.test(timeValue)) {
      errorToast("Invalid time format! Please enter time as HH:mm");
      return;
    }

    if (type === "start") {
      setStartTime(timeValue);

      // Auto set endTime = startTime + 1 hour
      setEndTime(addOneHour(timeValue));
    } else if (type === "end") {
      if (startTime && timeValue < startTime) {
        errorToast("End time cannot be before start time!");
        return;
      }
      setEndTime(timeValue);
    }
  };

  // Modified to only validate end time, not auto-adjust it based on start time
  useEffect(() => {
    // Only validate that end time is after start time when both exist
    if (startTime && endTime && endTime <= startTime) {
      // Only auto-correct end time when startTime changes, not when endTime changes
      // We can detect this by checking if this effect ran after a startTime change
      const isStartTimeChange =
        !prevStartTimeRef.current || prevStartTimeRef.current !== startTime;

      if (isStartTimeChange) {
        // Calculate end time 1 hour after start time
        const newEndTime = getDefaultEndTime(startTime);
        setEndTime(newEndTime);

        // Update the time state object
        setTime({
          startTime: startTime,
          endTime: newEndTime,
        });
      }
    }

    // Update previous start time reference
    prevStartTimeRef.current = startTime;
  }, [startTime, endTime]);

  // Add a ref to track previous start time
  const prevStartTimeRef = useRef<string>("");

  async function handleSubmit() {
    // Validate form
    if (!title.trim()) {
      return errorToast("Task title is required!");
    }

    if (date && (!startTime || !endTime)) {
      return errorToast(
        "Start time and End time are required when a date is selected!"
      );
    }

    // if (assignedUsers.length === 0) {
    //   return errorToast("Please assign this task to at least one user!");
    // }

    setIsLoading(true);
    const res = await createTask({
      title,
      description,
      assignedUsers,
      priority,
      startTime,
      endTime,
      clientId,
      date: date ? new Date(date).toISOString() : undefined,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    // revalidated communications client task
    // queryClient.invalidateQueries({
    //   queryKey: ["client-task", { clientId }],
    //   exact: true,
    //   refetchType: "active",
    // });

    setUpdateVariable();
    router.refresh();

    if (res.type === "globalError") {
      showError({
        field: res.field,
        message:
          res.errorSource && res.errorSource?.length > 0
            ? res.errorSource[0].message
            : res.message,
      });
      return;
    }

    setIsLoading(false);

    // reset form
    setTitle("");
    setDescription("");
    setAssignedUsers([]);
    setPriority("Low");
    setTime(undefined);
    setStartTime("");
    setEndTime("");
    clearError();
    setOpen(false);
    setDate("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* if its a task which will be created from C.Hub Client, then it will show a different styled button  */}
        {isClientTask ? (
          <button className="flex items-center justify-center gap-1 rounded-full bg-blue-600 px-6 py-2 text-[15px] text-white">
            <FaPlus className="" />
            <span>Add task</span>
          </button>
        ) : (
          <button className="flex w-full min-w-32 items-center justify-center gap-1 rounded-md bg-blue-600 px-2 py-2 text-[15px] text-white max-[1300px]:py-1">
            <FaPlus className="" />
            <span className="block">Add Task</span>
          </button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
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
              required
            />
          </div>

          <div className="mb-4 flex flex-col">
            <label htmlFor="description">Description</label>

            <textarea
              name="description"
              className="mt-2 rounded-md border-2 border-gray-500 p-1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div id="timer-parent" className="mb-4 flex flex-col">
            {/* <label htmlFor="time">Time</label> */}
            <div className="flex items-center space-x-2">
              <div className="flex w-full flex-col lg:flex-row lg:space-x-2">
                <SlimInput
                  name="date"
                  label="Date"
                  rootClassName="grow"
                  type="date"
                  value={date ?? ""}
                  // min={minDate}
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
                      // min={isToday ? getCurrentTime() : undefined} // Restrict time to future if today
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
          {/* TODO: */}
          <AssignTaskDropDown
            assignedUsers={assignedUsers}
            companyUsers={companyUsers}
            setAssignedUsers={setAssignedUsers}
            onlyOneUser={onlyOneUser}
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

          <DialogFooter>
            <DialogClose asChild>
              <button
                type="button"
                className="mt-1 rounded-md border px-4 py-1 lg:mt-0"
              >
                Cancel
              </button>
            </DialogClose>
            <Submit
              className="rounded-md border bg-[#6571FF] px-4 py-1 text-white"
              formAction={handleSubmit}
              disabled={isLoading}
            >
              Save
            </Submit>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
