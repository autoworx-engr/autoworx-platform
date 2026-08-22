"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import { Priority, Task } from "@prisma/client";
import { createTask } from "@/actions/task/createTask.ts";
import { editTask } from "@/actions/task/editTask";
import { deleteTask } from "@/actions/task/deleteTask";
import useTaskById from "@/hooks/query-hook/useTaskById";
import { useCalendarStore } from "@/stores/calendarStore";
import { taskQueryKey } from "@/app/(dashboard)/dashboard/task/_constant";
import { queryKeys } from "@/lib/queryKeys";
import { errorToast, successToast } from "@/lib/toast";
import { addOneHour } from "@/utils/time";
import { normalizeTime } from "@/utils/normalizeTime";

export type UseTaskFormProps = {
  taskId?: number | null;
  fromEdit?: boolean;
  clientId?: number | null;
  leadId?: number | null;
  invoiceId?: string | null;
  onClose?: () => void;
  onTaskCreated?: (task: Task) => void;
  onTaskUpdated?: (task: Task) => void;
  onTaskDeleted?: (taskId: number) => void;
  revalidateOnDelete?: boolean;
};

export function useTaskForm({
  taskId,
  fromEdit = false,
  clientId = null,
  leadId = null,
  invoiceId = null,
  onClose,
  onTaskCreated,
  onTaskUpdated,
  onTaskDeleted,
  revalidateOnDelete = true,
}: UseTaskFormProps) {
  const queryClient = useQueryClient();
  const { setUpdateVariable } = useCalendarStore();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const showError = useCallback(
    ({ field, message }: { field: string; message: string }) => {
      if (field === "title") {
        setFieldErrors((prev) => ({ ...prev, title: message }));
      } else {
        errorToast(message);
      }
    },
    [],
  );
  const clearError = useCallback(() => setFieldErrors({}), []);
  const clearFieldError = useCallback(
    (field: string) =>
      setFieldErrors((prev) => {
        if (!(field in prev)) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      }),
    [],
  );

  const {
    data: taskData,
    isError,
    isFetched,
  } = useTaskById(taskId!, {
    enabled: fromEdit && !!taskId,
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedUsers, setAssignedUsers] = useState<number[]>([]);
  const [priority, setPriority] = useState<Priority>("Low");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [isLoading, setIsLoading] = useState(fromEdit && !!taskId);

  const handleDateChange = (value: string) => {
    setDate(value);
    if (!value.trim()) {
      setStartTime("");
      setEndTime("");
    }
  };

  const prevStartTimeRef = useRef<string>("");

  // Sync task data for update
  useEffect(() => {
    if (fromEdit && taskId && !taskData && !isFetched) {
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
          setEndTime(parsed.format("HH:mm"));
        }
      }
      setPriority(taskData?.priority || "Low");
      setIsLoading(false);
    } else if (isFetched && !taskData && fromEdit) {
      setIsLoading(false);
    }
  }, [taskData, fromEdit, taskId, isFetched]);

  const getDefaultEndTime = (start: string) => {
    if (!start) return "";
    const [hours, minutes] = start.split(":").map(Number);
    let endHours = hours + 1;
    let endMinutes = minutes;
    if (endHours === 24) endHours = 0;
    return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
  };

  const handleTimeChange = (value: string, type: "start" | "end") => {
    if (type === "start") {
      setStartTime(value);
      setEndTime(addOneHour(value));
    } else if (type === "end") {
      if (startTime && value <= startTime) {
        errorToast("End time cannot be before or equal to start time!");
        return;
      }
      setEndTime(value);
    }
  };

  useEffect(() => {
    if (startTime && endTime && endTime <= startTime) {
      const isStartTimeChange =
        !prevStartTimeRef.current || prevStartTimeRef.current !== startTime;

      if (isStartTimeChange) {
        const newEndTime = getDefaultEndTime(startTime);
        setEndTime(newEndTime);
      }
    }
    prevStartTimeRef.current = startTime;
  }, [startTime, endTime]);

  async function handleSubmit() {
    if (!title.trim()) {
      showError({ field: "title", message: "Task title is required." });
      return;
    }

    if (title.trim().length > 100) {
      showError({
        field: "title",
        message: "Title must be 100 characters or fewer",
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

    if (startTime && endTime && startTime === endTime) {
      showError({
        field: "all",
        message: "Start time and End time cannot be the same.",
      });
      return;
    }

    setIsLoading(true);
    let res: any = null;

    const commonTaskData = {
      title,
      description,
      assignedUsers,
      priority: priority as "Low" | "Medium" | "High",
      startTime,
      endTime,
      date:
        date && date.trim() !== "" && moment(date).isValid()
          ? new Date(date).toISOString()
          : undefined,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      createdBy: "user" as "user" | "sales_agent",
    };

    if (fromEdit && taskId) {
      res = await editTask({
        id: taskId,
        task: commonTaskData,
      });

      if (res.type === "success") {
        queryClient.invalidateQueries({
          queryKey: taskQueryKey.taskById(taskId.toString()),
        });
        onTaskUpdated && onTaskUpdated(res.data as Task);
      }
    } else {
      res = await createTask({
        ...commonTaskData,
        clientId,
        leadId: leadId || undefined,
        invoiceId: invoiceId || undefined,
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

    if (res.type === "success") {
      successToast(
        fromEdit ? "Task updated successfully" : "Task created successfully",
      );
      resetForm();
      onClose && onClose();
    }
  }

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAssignedUsers([]);
    setPriority("Low");
    setStartTime("");
    setEndTime("");
    setDate("");
    clearError();
  };

  const handleDeleteTask = async (id: number) => {
    try {
      setIsLoading(true);
      const result = await deleteTask(id, { revalidate: revalidateOnDelete });

      if (result.type === "success") {
        queryClient.invalidateQueries({
          queryKey: taskQueryKey.taskById(id.toString()),
        });

        queryClient.setQueriesData(
          { queryKey: queryKeys.dashboardTask },
          (old: { id: number }[] | undefined) =>
            Array.isArray(old) ? old.filter((t) => t.id !== id) : old,
        );
        setUpdateVariable();
        onTaskDeleted && onTaskDeleted(id);
        successToast("Task deleted successfully.");
        onClose && onClose();
      } else {
        errorToast("Failed to delete task");
      }
    } catch {
      errorToast("Failed to delete task");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    state: {
      title,
      description,
      assignedUsers,
      priority,
      startTime,
      endTime,
      date,
      isLoading,
      isError,
      isFetched,
      taskData,
      fieldErrors,
    },
    actions: {
      setTitle,
      clearFieldError,
      setDescription,
      setAssignedUsers,
      setPriority,
      setDate: handleDateChange,
      handleTimeChange,
      handleSubmit,
      handleDeleteTask,
    },
  };
}
