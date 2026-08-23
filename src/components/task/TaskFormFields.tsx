"use client";

import React from "react";
import { Check } from "lucide-react";
import { Priority } from "@prisma/client";
import { cn } from "@/lib/cn";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TimeScrollPicker } from "@/components/ui/TimeScrollPicker";
import { addMinutes } from "@/utils/time";
import { taskPriorityStyles } from "@/lib/taskPriorityStyles";
import AssignTaskDropDown from "./AssignTaskDropDown";

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
  titleError?: string;
  clearTitleError?: () => void;
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
  titleError,
  clearTitleError,
}: TaskFormFieldsProps) {
  const priorityStyles = taskPriorityStyles;

  const priorityItems = [{ id: "Low" }, { id: "Medium" }, { id: "High" }];

  const hasDate = !!date?.trim();

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
            setTitle(e.target.value);
            clearTitleError?.();
          }}
          aria-invalid={!!titleError}
          autoFocus={false}
        />
        {titleError && (
          <p className="text-sm font-medium text-destructive">{titleError}</p>
        )}
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
        <div className="flex flex-col *:flex-1 gap-3 sm:flex-row">
          <div className="lg:col-span-2">
            <DatePickerField
              label="Date"
              placeholder="Select date"
              clearable
              value={date ?? ""}
              onChange={(value) => setDate(value)}
            />
          </div>

          <TimeScrollPicker
            id="startTime"
            label="Start Time"
            required={hasDate}
            value={startTime || ""}
            maxTime="22:45"
            onChange={(value) => handleTimeChange(value, "start")}
          />

          <TimeScrollPicker
            id="endTime"
            label="End Time"
            required={hasDate}
            value={endTime || ""}
            minTime={startTime ? addMinutes(startTime, 15) : undefined}
            onChange={(value) => handleTimeChange(value, "end")}
          />
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
