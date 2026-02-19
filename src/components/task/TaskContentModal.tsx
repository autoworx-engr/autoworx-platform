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
import { Priority, Task } from "@prisma/client";
import moment from "moment";
import { useEffect, useRef, useState } from "react";
import AssignTaskDropDown from "./AssignTaskDropDown";
import useTaskById from "@/hooks/query-hook/useTaskById";
import { useQueryClient } from "@tanstack/react-query";
import { taskQueryKey } from "@/app/(dashboard)/dashboard/task/_constant";
import { queryKeys } from "@/lib/queryKeys";
import { deleteTask } from "@/actions/task/deleteTask";
import { formatTime12Hour } from "@/utils/formateTime12Hours";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { Popconfirm, Select } from "antd";
import { normalizeTime } from "@/utils/normalizeTime";
import TaskSpinner from "@/app/(dashboard)/dashboard/task/_component/ui/TaskSpinner";
import { Check, Trash2 } from "lucide-react";

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
  const { data: companyUsers = [], isLoading: isCompanyUsersLoading } =
    useCompanyUsersQuery();
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
  const [isLoading, setIsLoading] = useState(fromEdit && !!taskId);
  const { showError, clearError } = useFormErrorStore();

  const { setUpdateVariable } = useCalendarStore();

  // get task task data for update task
  useEffect(() => {
    if (fromEdit && taskId && !taskData && !isFetched && !companyUsers) {
      setIsLoading(true);
      return;
    }

    if (taskData && fromEdit) {
      const assignUsers = taskData?.taskUser?.map(
        (taskUserData) => taskUserData.user.id,
      );
      setTitle(taskData?.title || "");
      setDescription(taskData?.description || "");
      setAssignedUsers(assignUsers);
      setDate(
        taskData.date ? moment.utc(taskData.date).format("YYYY-MM-DD") : "",
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
      setIsLoading(false);
    } else if (isFetched && !taskData && fromEdit) {
      setIsLoading(false);
    }
  }, [taskData, fromEdit, taskId, isFetched, companyUsers]);

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
      showError({
        field: "title",
        message: "Task title is required.",
      });
      return;
    }

    if (date && date.trim() !== "" && (!startTime || !endTime)) {
      showError({
        field: "all",
        message:
          "Start time and End time are required when a date is selected.",
      });
      return;
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
          createdBy: "user",
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
        createdBy: "user",
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
    <DialogContent
      className={cn(isLoading ? "block" : "flex flex-col", "min-h-[500px]")}
    >
      <DialogHeader>
        <DialogTitle>{fromEdit ? "Update Task" : "Add Task"}</DialogTitle>
      </DialogHeader>
      <FormError />
      {isLoading || isCompanyUsersLoading ? (
        <div className="flex min-h-[500px] my-auto items-center justify-center py-10 text-center">
          <TaskSpinner />
        </div>
      ) : (
        <form>
          <div className="mb-4 flex flex-col">
            <label htmlFor="title" className="font-medium text-slate-600">
              Title <span className="text-[#E9405F]">*</span>
            </label>

            <input
              type="text"
              name="title"
              className={cn(
                "mt-2 rounded-md border-2 border-gray-500 p-1",
                slimInputClassName,
              )}
              value={title}
              onChange={(e) => {
                const value = e.target.value;
                setTitle(value);
                if (!value.trim()) {
                  showError({
                    field: "title",
                    message: "Task title is required.",
                  });
                } else {
                  clearError();
                }
              }}
              autoFocus
            />
          </div>

          <div className="mb-4 flex flex-col">
            <label htmlFor="description" className="font-medium text-slate-600">
              Description
            </label>

            <textarea
              name="description"
              className={cn(
                "mt-2 rounded-md border-2 border-gray-500 p-1",
                slimInputClassName,
              )}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div id="timer-parent" className="mb-4 flex flex-col">
            {/* <label htmlFor="time">Time</label> */}
            <div className="flex items-center space-x-2">
              <div className="flex w-full flex-col space-y-4 lg:flex-row lg:space-x-2 lg:space-y-0">
                <SlimInput
                  name="date"
                  label="Date"
                  rootClassName="grow"
                  type="date"
                  value={date ?? ""}
                  // min={minDate}
                  required
                  onChange={(event) => setDate(event.currentTarget.value)}
                />
                <div className="flex items-end gap-2 mt-2 lg:mt-0">
                  {/* Start Time */}
                  <label className="flex flex-col items-start">
                    <span className="mb-2 font-medium text-slate-600">
                      Start Time <span className="text-[#E9405F]">*</span>
                    </span>
                    <div>
                      {/* <Select
                        value={startTime}
                        onChange={(value) =>
                          handleTimeChange(
                            { target: { value } } as any,
                            "start"
                          )
                        }
                        style={{ width: "100%", height: 34 }}
                        className="border-slate-400 border text-gray-500 rounded-md"
                      >
                        <Option value="">Start Time</Option>

                        {timeOptions.map((time) => (
                          <Option key={time.value} value={time.value}>
                            <p className="text-base text-gray-600">
                              {time.label}
                            </p>
                          </Option>
                        ))}
                      </Select> */}
                      <Select
                        value={startTime}
                        onChange={(value) =>
                          handleTimeChange(
                            { target: { value } } as any,
                            "start",
                          )
                        }
                        // Remove inline styles to rely on Tailwind's precision
                        style={{ width: "100%" }}
                        className="
                        h-[38px] w-full 
                        rounded-lg border-none 
                        bg-slate-50/50 
                        ring-1 ring-slate-200 
                        transition-all duration-300 
                        hover:bg-white hover:ring-[#6571FF]/80 hover:scale-[1.01] hover:shadow-sm
                        focus-within:ring-2 focus-within:ring-[#6571FF]/40 focus:outline-none
                        text-slate-600 font-medium thin-scrollbar
                      "
                        // If your library supports custom dropdown styling:
                        dropdownClassName="rounded-xl border-none shadow-2xl backdrop-blur-md bg-white/90"
                      >
                        <Option value="" className="text-slate-400 italic">
                          Start Time
                        </Option>

                        {timeOptions.map((time) => (
                          <Option
                            key={time.value}
                            value={time.value}
                            className="
                            py-2 px-3 
                            text-slate-600 
                            transition-colors 
                            hover:bg-[#6571FF]/10 
                            hover:text-[#6571FF]
                          "
                          >
                            <div className="flex items-center gap-2">
                              {/* Subtle dot indicator for time slots */}
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-300 group-hover:bg-[#6571FF]" />
                              {time.label}
                            </div>
                          </Option>
                        ))}
                      </Select>
                    </div>
                  </label>

                  <label className="flex flex-col items-start">
                    <span className="mb-2 font-medium text-slate-600">
                      End Time <span className="text-[#E9405F]">*</span>
                    </span>
                    {/* <Select
                      value={endTime}
                      onChange={(value) =>
                        handleTimeChange({ target: { value } } as any, "end")
                      }
                      style={{ width: "100%", height: 34 }}
                      className="border-slate-400 border rounded-md"
                    >
                      <Option value="">End Time</Option>

                      {timeOptions.map((time) => (
                        <Option key={time.value} value={time.value}>
                          {time.label}
                        </Option>
                      ))}
                    </Select> */}
                    <Select
                      value={endTime}
                      onChange={(value) =>
                        handleTimeChange({ target: { value } } as any, "end")
                      }
                      // Remove inline styles to rely on Tailwind's precision
                      style={{ width: "100%" }}
                      className="
                        h-[38px] w-full 
                        rounded-lg border-none 
                        bg-slate-50/50 
                        ring-1 ring-slate-200 
                        transition-all duration-300 
                        hover:bg-white hover:ring-[#6571FF]/80 hover:scale-[1.01] hover:shadow-sm
                        focus-within:ring-2 focus-within:ring-[#6571FF]/40 focus:outline-none
                        text-slate-600 font-medium thin-scrollbar
                      "
                      // If your library supports custom dropdown styling:
                      dropdownClassName="rounded-xl border-none shadow-2xl backdrop-blur-md bg-white/90"
                    >
                      <Option value="" className="text-slate-400 italic">
                        End Time
                      </Option>

                      {timeOptions.map((time) => (
                        <Option
                          key={time.value}
                          value={time.value}
                          className="
                            py-2 px-3 
                            text-slate-600
                            transition-colors 
                            hover:bg-[#6571FF]/10 
                            hover:text-[#6571FF]
                          "
                        >
                          <div className="flex items-center gap-2">
                            {/* Subtle dot indicator for time slots */}
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300 group-hover:bg-[#6571FF]" />
                            {time.label}
                          </div>
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

          {/* <div className="mb-4 flex flex-col">
            <label>Priority</label>
            <div className="flex items-center gap-5">
              <button
                className="relative flex w-full items-center justify-center rounded-md bg-[#6571FF] p-2 text-white"
                onClick={() => setPriority("Low")}
                type="button"
              >
                Low
                {priority === "Low" && (
                  <Check className="absolute right-2 text-white" />
                )}
              </button>
              <button
                className="relative flex w-full items-center justify-center rounded-md bg-[#25AADD] p-2 text-white"
                onClick={() => setPriority("Medium")}
                type="button"
              >
                Medium
                {priority === "Medium" && (
                  <Check className="absolute right-2 text-white" />
                )}
              </button>
              <button
                className="relative flex w-full items-center justify-center rounded-md bg-[#006D77] p-2 text-white"
                onClick={() => setPriority("High")}
                type="button"
              >
                High
                {priority === "High" && (
                  <Check className="absolute right-2 text-white" />
                )}
              </button>
            </div>
          </div> */}
          <div className="mb-6 flex flex-col space-y-3">
            <label className="font-medium text-slate-600">Priority Level</label>
            <div className="flex items-center gap-3">
              {[
                {
                  id: "Low",
                  color: "bg-[#6571FF]",
                  shadow: "shadow-[#6571FF]/40",
                  ring: "ring-[#6571FF]",
                },
                {
                  id: "Medium",
                  color: "bg-[#25AADD]",
                  shadow: "shadow-[#25AADD]/40",
                  ring: "ring-[#25AADD]",
                },
                {
                  id: "High",
                  color: "bg-[#006D77]",
                  shadow: "shadow-[#006D77]/40",
                  ring: "ring-[#006D77]",
                },
              ].map((item) => {
                const isActive = priority === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPriority(item.id as Priority)}
                    className={`
                      relative flex w-full items-center justify-center gap-2 rounded-lg py-2.5 px-4
                      text-sm font-semibold transition-all duration-300 ease-out
                      ${
                        isActive
                          ? `${item.color} text-white shadow-lg ${item.shadow} scale-[1.03]`
                          : "bg-slate-50 text-slate-500 ring-1 ring-slate-200 hover:bg-white hover:ring-slate-300 hover:-translate-y-0.5"
                      }
          `}
                  >
                    {item.id}
                    {isActive && (
                      <Check
                        className="h-4 w-4 animate-in zoom-in duration-300"
                        strokeWidth={3}
                      />
                    )}

                    {/* Subtle shine overlay for the active button */}
                    {isActive && (
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className={cn(
              "flex justify-between gap-10 md:gap-0",
              !fromEdit && "justify-end",
            )}
          >
            {fromEdit && taskId && (
              <Popconfirm
                title="Delete Task"
                description="Are you sure you want to delete this task?"
                onConfirm={() => handleDeleteTask(taskId)}
                okText="Yes"
                cancelText="No"
                okButtonProps={{ danger: true }}
              >
                <button
                  className="text-red-500 hover:text-red-700"
                  type="button"
                >
                  <Trash2 size={20} />
                </button>
              </Popconfirm>
            )}
            <DialogFooter className=" flex flex-row justify-end space-x-2 ">
              <DialogClose asChild>
                <button
                  type="button"
                  className="
                rounded-xl mt-2 sm:mt-0 px-5 py-2.5 text-sm font-medium text-slate-500 
                hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800
                transition-colors border
              "
                >
                  Cancel
                </button>
              </DialogClose>
              <Submit
                className="
                rounded-xl px-6 py-2.5 text-sm font-medium text-white
                bg-gradient-to-r from-[#6571FF] to-[#5a66ee]
                shadow-lg shadow-indigo-500/30
                hover:shadow-xl hover:shadow-indigo-500/40
                hover:-translate-y-0.5 hover:scale-[1.02]
                active:translate-y-0 active:scale-100
                transition-all duration-200
              "
                formAction={handleSubmit}
                disabled={isLoading || (fromEdit && !isFetched)}
              >
                Save
              </Submit>
            </DialogFooter>
          </div>
        </form>
      )}
    </DialogContent>
  );
}
