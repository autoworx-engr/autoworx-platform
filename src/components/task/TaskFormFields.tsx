"use client";

import React from "react";
import { Check } from "lucide-react";
import { Select } from "antd";
import { Priority } from "@prisma/client";
import { cn } from "@/lib/cn";
import { SlimInput } from "@/components/SlimInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { taskPriorityStyles } from "@/lib/taskPriorityStyles";
import AssignTaskDropDown from "./AssignTaskDropDown";
import { formatTime12Hour } from "@/utils/formateTime12Hours";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { useFormErrorStore } from "@/stores/form-error";

const { Option } = Select;

interface TaskFormFieldsProps {
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  date: string;
  setDate: (value: string) => void;
  startTime: string;
  endTime: string;
  handleTimeChange: (value: string, type: "start" | "end") => void;
  assignedUsers: number[];
  setAssignedUsers: React.Dispatch<React.SetStateAction<number[]>>;
  priority: Priority;
  setPriority: (priority: Priority) => void;
  onlyOneUser?: boolean;
  fromEdit?: boolean;
  taskData?: any;
}

export function TaskFormFields({
  title,
  setTitle,
  description,
  setDescription,
  date,
  setDate,
  startTime,
  endTime,
  handleTimeChange,
  assignedUsers,
  setAssignedUsers,
  priority,
  setPriority,
  onlyOneUser = false,
  fromEdit = false,
  taskData,
}: TaskFormFieldsProps) {
  const timezone = useCompanyTimezone();
  const { showError, clearError } = useFormErrorStore();

  const timeOptions = Array.from({ length: 24 * 4 }, (_, i) => {
    const hour = Math.floor(i / 4);
    const minute = (i % 4) * 15;
    const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const label = formatTime12Hour(hour, minute, timezone);
    return { value, label };
  });

  // Shared with the task list / calendar so priority colors match everywhere.
  const priorityStyles = taskPriorityStyles;

  const priorityItems = [{ id: "Low" }, { id: "Medium" }, { id: "High" }];

  return (
    <>
      <div className="mb-4 flex flex-col gap-1.5">
        <Label htmlFor="title" className="text-base">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          type="text"
          name="title"
          maxLength={100}
          placeholder="e.g. Follow up with client"
          value={title}
          onChange={(e) => {
            const value = e.target.value;
            setTitle(value);
            if (!value.trim()) {
              showError({ field: "title", message: "Task title is required." });
            } else {
              clearError();
            }
          }}
          autoFocus={false}
        />
      </div>

      <div className="mb-4 flex flex-col gap-1.5">
        <Label htmlFor="description" className="text-base">
          Description
        </Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          placeholder="Add any details, notes or instructions for this task..."
          className="min-h-[120px] resize-y"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div id="timer-parent" className="mb-4 flex flex-col">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <SlimInput
              name="date"
              label="Date"
              rootClassName="w-full"
              type="date"
              value={date ?? ""}
              required
              onChange={(event) => setDate(event.currentTarget.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="startTime" className="text-base">
              Start Time <span className="text-destructive">*</span>
            </Label>
            <Select
              id="startTime"
              value={startTime || undefined}
              placeholder="Start Time"
              onChange={(value) => handleTimeChange(value, "start")}
              className="task-time-select"
              popupClassName="task-time-dropdown"
            >
              {timeOptions
                .filter((time) => time.value <= "22:45")
                .map((time) => (
                  <Option key={time.value} value={time.value}>
                    {time.label}
                  </Option>
                ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="endTime" className="text-base">
              End Time <span className="text-destructive">*</span>
            </Label>
            <Select
              id="endTime"
              value={endTime || undefined}
              placeholder="End Time"
              onChange={(value) => handleTimeChange(value, "end")}
              className="task-time-select"
              popupClassName="task-time-dropdown"
            >
              {timeOptions.map((time) => (
                <Option key={time.value} value={time.value}>
                  {time.label}
                </Option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {taskData?.client && taskData?.createdBy === "sales_agent" && (
        <div className="mb-4 flex flex-col gap-1.5">
          <Label className="text-base">Client Information</Label>
          <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
            <div className="flex flex-col">
              <span className="text-xs text-slate-500">Client Name</span>
              <span className="text-sm font-medium text-slate-700">
                {(() => {
                  const firstName = taskData.client.firstName ?? "";
                  const lastName = taskData.client.lastName ?? "";
                  const mobile = taskData.client.mobile ?? "";
                  if (!firstName || firstName === mobile) return "N/A";
                  return `${firstName} ${lastName}`.trim();
                })()}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-500">Mobile</span>
              <span className="text-sm font-medium text-slate-700">
                {taskData.client.mobile || "N/A"}
              </span>
            </div>
          </div>
        </div>
      )}

      <AssignTaskDropDown
        assignedUsers={assignedUsers}
        setAssignedUsers={setAssignedUsers}
        onlyOneUser={onlyOneUser}
        fromUpdate={fromEdit}
      />

      <div className="mb-6 flex flex-col space-y-3">
        <Label className="text-base">Priority Level</Label>
        <div className="flex items-center gap-3">
          {priorityItems.map((item) => {
            const isActive = priority === item.id;
            const style =
              priorityStyles[item.id as keyof typeof priorityStyles];

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setPriority(item.id as Priority)}
                className={cn(
                  "relative flex w-full items-center justify-center gap-2 rounded-lg py-2.5 px-4 text-sm font-bold transition-all duration-300 ease-out",
                  isActive
                    ? "shadow-lg scale-[1.03]"
                    : "bg-slate-50 text-slate-500 ring-1 ring-slate-200 hover:bg-white hover:ring-slate-300 hover:-translate-y-0.5",
                )}
                style={isActive ? style : {}}
              >
                {item.id}
                {isActive && (
                  <Check
                    className="h-4 w-4 animate-in zoom-in duration-300"
                    strokeWidth={3}
                  />
                )}
                {isActive && (
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
