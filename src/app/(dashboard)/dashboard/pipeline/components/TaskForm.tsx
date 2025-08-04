"use client";

import { createTask } from "@/actions/task/createTask";
import AssignTaskDropDown from "@/app/(dashboard)/dashboard/task-v1/[type]/components/task/AssignTaskDropDown";
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
import { useFormErrorStore } from "@/stores/form-error";
import { Priority, Task, User } from "@prisma/client";
// import { TimePicker } from "antd";
import { SlimInput, slimInputClassName } from "@/components/SlimInput";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { cn } from "@/lib/cn";
import { errorToast } from "@/lib/toast";
import { addOneHour, formatDateToToday, getCurrentTime } from "@/utils/time";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { FaCheck } from "react-icons/fa";
export default function TaskForm({
  companyUsers,
  invoiceId,
  previousTasks,
  leadId,
  clientId,
  totalTasksCount = 0,
  setTotalTasks,
  onAutomationTrigger,
  onCommunicationAutomationTrigger,
  onUpdateTaskInLead,
}: {
  companyUsers: Partial<User>[] | null;
  invoiceId?: string;
  leadId?: number;
  clientId?: number;
  previousTasks: Task[];
  totalTasksCount?: number;
  setTotalTasks?: React.Dispatch<React.SetStateAction<number>>;
  onAutomationTrigger?: () => void;
  onCommunicationAutomationTrigger?: () => void;
  onUpdateTaskInLead?: (task: Task) => void;
}) {
  const [open, setOpen] = useState(false);
  // const [showUsers, setShowUsers] = useState(false);
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedUsers, setAssignedUsers] = useState<number[]>([]);
  const [priority, setPriority] = useState<Priority>("Low");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [date, setDate] = useState<string>("");
  const { showError, clearError } = useFormErrorStore();
  const path = usePathname();

  useEffect(() => {
    if (previousTasks) {
      setTasks(previousTasks);
    }
  }, [previousTasks]);

  // Add state for minimum date and time validation
  const [minDate, setMinDate] = useState<string>("");
  const [minStartTime, setMinStartTime] = useState<string>("");

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
      // ❌ Restrict past times if a date is present (today)
      // if (isToday && timeValue < currentTime) {
      //   errorToast("Start time cannot be in the past!");
      //   timeValue = currentTime; // Reset to current time
      // }

      setStartTime(timeValue);

      // ✅ Set `endTime` to 1 hour after `startTime`
      setEndTime(addOneHour(timeValue));
    } else if (type === "end") {
      // ❌ Prevent selecting past time of `startTime`
      // if (timeValue < startTime!) {
      //   errorToast("End time cannot be before start time!");
      //   return;
      // }

      setEndTime(timeValue);
    }
  };

  // Ref to track previous start time
  const prevStartTimeRef = useRef<string>("");

  // Set minimum date to today
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    setMinDate(`${year}-${month}-${day}`);
  }, []);

  // Update minimum start time when date changes
  useEffect(() => {
    if (date === minDate) {
      // If selected date is today, set min time to current time
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const currentTime = `${hours}:${minutes}`;
      setMinStartTime(currentTime);

      // If current start time is before current time, reset it
      if (startTime && startTime < currentTime) {
        setStartTime("");
        setEndTime("");
      }
    } else {
      // For future dates, no min time restrictions
      setMinStartTime("");
    }
  }, [date, minDate, startTime]);

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

  // Validate and update end time when start time changes
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
      }
    }

    // Update previous start time reference
    prevStartTimeRef.current = startTime;
  }, [startTime, endTime]);

  const handleSave = async () => {
    try {
      // Validate title
      if (!title.trim()) {
        return errorToast("Task title is required!");
      }

      // Validate date and time
      if (date && (!startTime || !endTime)) {
        return errorToast(
          "Start time and End time are required when a date is selected!",
        );
      }

      // Validate that at least one user is assigned
      // if (assignedUsers.length === 0) {
      //   return errorToast("Please assign this task to at least one user!");
      // }

      // save task
      const res = await createTask({
        title,
        description,
        assignedUsers,
        priority,
        startTime: startTime,
        endTime: endTime,
        invoiceId,
        leadId,
        clientId,
        date: date ? new Date(date).toISOString() : undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      if (res.type === "success") {
        // update tasks
        onAutomationTrigger && onAutomationTrigger();
        onCommunicationAutomationTrigger && onCommunicationAutomationTrigger();
        onUpdateTaskInLead && onUpdateTaskInLead(res.data);
        setTasks((prevTasks) => [...prevTasks, res.data]);
        setTotalTasks && setTotalTasks((prev) => prev + 1);
        // reset form
        setTitle("");
        setDescription("");
        setAssignedUsers([]);
        setPriority("Low");
        setStartTime("");
        setEndTime("");
        clearError();
        setOpen(false);
      } else if (res.type === "globalError") {
        showError({
          field: res.field,
          message:
            res.errorSource && res.errorSource?.length > 0
              ? res.errorSource[0].message
              : res.message,
        });
      }
    } catch (err) {
      const error = errorHandler(err);
      errorToast(error.message);
    }
  };

  // function onChange(e: any) {
  //   if (!e) return;

  //   const [start, end] = e;
  //   setTime({
  //     startTime: start?.format("HH:mm"),
  //     endTime: end?.format("HH:mm"),
  //   });
  // }

  const isShowTaskCount = totalTasksCount > 0;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        
          <div className="relative">
           <div className="relative h-4 w-4">
             <Image
              src="/icons/addtask.png"
              alt="Add Task"
             sizes="100vw"
             fill
            style={{
              objectFit: 'contain',
            }}
            className="object-contain duration-300 hover:opacity-80"
            />
           </div>
            {isShowTaskCount && (
              <span className="absolute left-[0.6rem] top-[-0.8rem] rounded-full bg-red-400 px-1 py-0.5 text-[10px] text-white">
                {totalTasksCount}
              </span>
            )}
          </div>
        
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
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

          <AssignTaskDropDown
            assignedUsers={assignedUsers}
            companyUsers={companyUsers!}
            setAssignedUsers={setAssignedUsers}
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
              <button type="button" className="rounded-md border px-4 py-1">
                Cancel
              </button>
            </DialogClose>

            <button
              type="button"
              disabled={pending}
              className="rounded-md border bg-[#6571FF] px-4 py-1 text-white disabled:bg-gray-500"
              onClick={() => startTransition(handleSave)}
            >
              Add
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
