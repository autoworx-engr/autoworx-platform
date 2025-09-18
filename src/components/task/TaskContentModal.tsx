"use client";

import { createTask } from "@/actions/task/createTask.ts";
import { editTask } from "@/actions/task/editTask";
import {
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/Dialog";
import FormError from "@/components/FormError";
import { SlimInput, slimInputClassName } from "@/components/SlimInput";
import Submit from "@/components/Submit";
import useCompanyUsersQuery from "@/hooks/query-hook/useCompanyUsersQuery";
import { cn } from "@/lib/cn";
import { errorToast, successToast } from "@/lib/toast";
import { useCalendarStore } from "@/stores/calendarStore";
import { useFormErrorStore } from "@/stores/form-error";
import { addOneHour } from "@/utils/time";
import { Priority, Task, User } from "@prisma/client";
import moment from "moment";
import { useEffect, useRef, useState } from "react";
import { FaCheck } from "react-icons/fa6";
import AssignTaskDropDown from "./AssignTaskDropDown";
import useTaskById from "@/hooks/query-hook/useTaskById";
import { useQueryClient } from "@tanstack/react-query";
import { taskQueryKey } from "@/app/(dashboard)/dashboard/task/_constant";
import { queryKeys } from "@/lib/queryKeys";
import { FaTrash } from "react-icons/fa";
import { deleteTask } from "@/actions/task/deleteTask";
import { formatTime12Hour } from "@/utils/formateTime12Hours";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { Select } from "antd";
import { normalizeTime } from "@/utils/normalizeTime";

type NewTaskProps = {
  onlyOneUser?: boolean;
  clientId?: number | null;
  taskId?: number | null;
  leadId?: number | null;
  invoiceId?: string | null;
  fromEdit?: boolean;
  onClose?: () => void;
  onTaskCreated?: (task: Task) => void;
  onTaskUpdated?: (task: Task) => void;
  onTaskDeleted?: (taskId: number) => void;
};

export default function TaskContentModal({
  onlyOneUser = false,
  clientId = null,
  leadId = null,
  invoiceId = null,
  taskId,
  fromEdit = false,
  onClose,
  onTaskCreated,
  onTaskUpdated,
  onTaskDeleted,
}: NewTaskProps) {
  const { data: companyUsers = [] } = useCompanyUsersQuery();
  const {
    data: taskData,
    isError,
    isFetched,
  } = useTaskById(taskId!, {
    enabled: fromEdit && !!taskId,
  });

  const queryClient = useQueryClient();
  const timezone = useCompanyTimezone();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { Option } = Select;
  const [assignedUsers, setAssignedUsers] = useState<number[]>([]);
  const [priority, setPriority] = useState<Priority>("Low");
  const [time, setTime] = useState<{ startTime: string; endTime: string }>();
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { showError, clearError } = useFormErrorStore();

  const { setUpdateVariable } = useCalendarStore();

  // get task task data for update task
  useEffect(() => {
    if (taskData && fromEdit) {
      const assignUsers = taskData?.taskUser?.map(
        (taskUserData) => taskUserData.user.id
      );
      setTitle(taskData?.title || "");
      setDescription(taskData?.description || "");
      setAssignedUsers(assignUsers);
      setDate(
        taskData.date ? moment.utc(taskData.date).format("YYYY-MM-DD") : ""
      );
      setStartTime(taskData?.startTime || "");
      setEndTime(taskData?.endTime || "");

      if (taskData?.startTime) {
        const parsed = normalizeTime(taskData.startTime);
        if (parsed) {
          const roundedMinutes = Math.ceil(parsed.minute() / 15) * 15;
          parsed.minute(roundedMinutes).second(0).millisecond(0);
          setStartTime(parsed.format("HH:mm"));
        }
      }

      if (taskData?.endTime) {
        const parsed = normalizeTime(taskData.endTime);
        if (parsed) {
          const roundedMinutes = Math.ceil(parsed.minute() / 15) * 15;
          parsed.minute(roundedMinutes).second(0).millisecond(0);
          setEndTime(parsed.format("HH:mm")); // always 24h
        }
      }
      setPriority(taskData?.priority || "Low");
    }
  }, [taskData, fromEdit]);

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

  const handleTimeChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "start" | "end"
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

    if (date && date.trim() !== "" && (!startTime || !endTime)) {
      return errorToast(
        "Start time and End time are required when a date is selected!"
      );
    }

    setIsLoading(true);
    let res: any = null;
    if (fromEdit && taskId) {
      res = await editTask({
        id: taskId,
        task: {
          title,
          description,
          assignedUsers,
          priority,
          startTime,
          endTime,
          date:
            date && date.trim() !== "" && moment(date).isValid()
              ? new Date(date).toISOString()
              : undefined,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      if (res.type === "success") {
        queryClient.invalidateQueries({
          queryKey: taskQueryKey.taskById(taskId.toString()),
        });
        onTaskUpdated && onTaskUpdated(res.data as Task);
      }
    } else {
      res = await createTask({
        title,
        description,
        assignedUsers,
        priority,
        startTime,
        endTime,
        clientId,
        leadId: leadId ?? undefined,
        invoiceId: invoiceId ?? undefined,
        date:
          date && date.trim() !== "" ? new Date(date).toISOString() : undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      if (res.type === "success") {
        onTaskCreated && onTaskCreated(res.data as Task);
      }
      setUpdateVariable();
    }
    if (res.type === "globalError") {
      showError({
        field: res.field,
        message:
          res.errorSource && res.errorSource?.length > 0
            ? res.errorSource[0].message
            : res.message,
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(false);

    // Only close modal and reset form if the operation was successful
    if (res.type === "success") {
      // Show success message
      if (fromEdit && taskId) {
        successToast("Task updated successfully");
      } else {
        successToast("Task created successfully");
      }

      // reset form
      setTitle("");
      setDescription("");
      setAssignedUsers([]);
      setPriority("Low");
      setTime(undefined);
      setStartTime("");
      setEndTime("");
      setDate("");
      clearError();

      // Close the modal
      onClose && onClose();
    }
  }

  const handleDeleteTask = async (taskId: number) => {
    try {
      setIsLoading(true);
      const result = await deleteTask(taskId);

      if (result.type === "success") {
        successToast("Task deleted successfully");
        // Invalidate multiple query caches to ensure UI updates everywhere
        queryClient.invalidateQueries({
          queryKey: taskQueryKey.taskById(taskId.toString()),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.dashboardTask,
        });
        setUpdateVariable(); // Update calendar store
        onTaskDeleted && onTaskDeleted(taskId);
        onClose && onClose();
      } else {
        errorToast("Failed to delete task");
      }
    } catch (err) {
      console.error("Error deleting task:", err);
      errorToast("Failed to delete task");
    } finally {
      setIsLoading(false);
    }
  };

  if (fromEdit && isError) {
    errorToast("Failed to fetch task data");
    return null; // or handle the error as needed
  }

  // Generate options in 15-min intervals
  const timeOptions = Array.from({ length: 24 * 4 }, (_, i) => {
    const hour = Math.floor(i / 4);
    const minute = (i % 4) * 15;
    const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const label = formatTime12Hour(hour, minute, timezone);
    return { value, label };
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{fromEdit ? "Update Task" : "Add Task"}</DialogTitle>
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
                {/* Start Time */}
                <label className="flex flex-col items-start">
                  <span className="mb-1 text-sm font-medium text-gray-700">
                    Start Time
                  </span>
                  <div>
                    <Select
                      value={startTime}
                      onChange={(value) =>
                        handleTimeChange({ target: { value } } as any, "start")
                      }
                      style={{ width: "100%", height: 34 }}
                      className="border-slate-400 border rounded-md"
                    >
                      <Option value="">Select Start Time</Option>

                      {timeOptions.map((time) => (
                        <Option key={time.value} value={time.value}>
                          <p className="text-base text-gray-600">
                            {time.label}
                          </p>
                        </Option>
                      ))}
                    </Select>
                  </div>
                </label>

                <label className="flex flex-col items-start">
                  <span className="mb-1 text-sm font-medium text-gray-700">
                    End Time
                  </span>
                  <Select
                    value={endTime}
                    onChange={(value) =>
                      handleTimeChange({ target: { value } } as any, "end")
                    }
                    style={{ width: "100%", height: 34 }}
                    className="border-slate-400 border rounded-md"
                  >
                    <Option value="">Select End Time</Option>

                    {timeOptions.map((time) => (
                      <Option key={time.value} value={time.value}>
                        {time.label}
                      </Option>
                    ))}
                  </Select>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* custom radio. show user name and image (column)*/}
        {/* TODO: */}
        {companyUsers?.length > 0 && (
          <AssignTaskDropDown
            companyUsers={companyUsers}
            assignedUsers={assignedUsers}
            setAssignedUsers={setAssignedUsers}
            onlyOneUser={onlyOneUser}
            fromUpdate={fromEdit}
          />
        )}

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

        <div
          className={cn(
            "flex justify-between gap-10 md:gap-0",
            !fromEdit && "justify-end"
          )}
        >
          {fromEdit && taskId && (
            <button
              className="text-xl text-red-500 hover:text-red-700"
              type="button"
              onClick={() => handleDeleteTask(taskId)}
            >
              <FaTrash />
            </button>
          )}
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
              className="rounded-md border bg-[#6571FF] px-4 py-1 text-white disabled:opacity-50"
              formAction={handleSubmit}
              disabled={isLoading || (fromEdit && !isFetched)}
            >
              Save
            </Submit>
          </DialogFooter>
        </div>
      </form>
    </DialogContent>
  );
}
