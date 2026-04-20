"use client";

import React from "react";
import { Check } from "lucide-react";
import { Select } from "antd";
import { Priority } from "@prisma/client";
import { cn } from "@/lib/cn";
import { SlimInput, slimInputClassName } from "@/components/SlimInput";
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

  const priorityStyles = {
    Low: {
      background: "linear-gradient(to right, #f5f3ff, #ede9fe)",
      borderLeft: "3px solid #6d28d9",
      color: "#6d28d9",
      boxShadow: "0 2px 8px rgba(109, 40, 217, 0.15)",
    },
    Medium: {
      background: "linear-gradient(to right, #f0f9ff, #e0f2fe)",
      borderLeft: "3px solid #0284c7",
      color: "#0284c7",
      boxShadow: "0 2px 8px rgba(2, 132, 199, 0.15)",
    },
    High: {
      background: "linear-gradient(to right, #b2f2bb, #d3f9d8)",
      borderLeft: "3px solid #22a7b8",
      color: "#22a7b8",
      boxShadow: "0 2px 8px rgba(34, 167, 184, 0.15)",
    },
  };

  const priorityItems = [{ id: "Low" }, { id: "Medium" }, { id: "High" }];

  return (
    <>
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
              showError({ field: "title", message: "Task title is required." });
            } else {
              clearError();
            }
          }}
          autoFocus={false}
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
        <div className="flex items-center space-x-2">
          <div className="flex w-full flex-col space-y-4 lg:flex-row lg:space-x-2 lg:space-y-0">
            <SlimInput
              name="date"
              label="Date"
              rootClassName="grow"
              type="date"
              value={date ?? ""}
              required
              onChange={(event) => setDate(event.currentTarget.value)}
            />
            <div className="flex items-end gap-2 mt-2 lg:mt-0">
              <label className="flex flex-col items-start">
                <span className="mb-2 font-medium text-slate-600">
                  Start Time <span className="text-[#E9405F]">*</span>
                </span>
                <Select
                  value={startTime}
                  onChange={(value) => handleTimeChange(value, "start")}
                  style={{ width: "100%" }}
                  className="h-[38px] w-full rounded-lg border-none bg-slate-50/50 ring-1 ring-slate-200 transition-all duration-300 hover:bg-white hover:ring-[#6571FF]/80 hover:scale-[1.01] hover:shadow-sm focus-within:ring-2 focus-within:ring-[#6571FF]/40 focus:outline-none text-slate-600 font-medium thin-scrollbar"
                  dropdownClassName="rounded-xl border-none shadow-2xl backdrop-blur-md bg-white/90"
                >
                  <Option value="" className="text-slate-400 italic">
                    Start Time
                  </Option>
                  {timeOptions.map((time) => (
                    <Option
                      key={time.value}
                      value={time.value}
                      className="py-2 px-3 text-slate-600 transition-colors hover:bg-[#6571FF]/10 hover:text-[#6571FF]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300 group-hover:bg-[#6571FF]" />
                        {time.label}
                      </div>
                    </Option>
                  ))}
                </Select>
              </label>

              <label className="flex flex-col items-start">
                <span className="mb-2 font-medium text-slate-600">
                  End Time <span className="text-[#E9405F]">*</span>
                </span>
                <Select
                  value={endTime}
                  onChange={(value) => handleTimeChange(value, "end")}
                  style={{ width: "100%" }}
                  className="h-[38px] w-full rounded-lg border-none bg-slate-50/50 ring-1 ring-slate-200 transition-all duration-300 hover:bg-white hover:ring-[#6571FF]/80 hover:scale-[1.01] hover:shadow-sm focus-within:ring-2 focus-within:ring-[#6571FF]/40 focus:outline-none text-slate-600 font-medium thin-scrollbar"
                  dropdownClassName="rounded-xl border-none shadow-2xl backdrop-blur-md bg-white/90"
                >
                  <Option value="" className="text-slate-400 italic">
                    End Time
                  </Option>
                  {timeOptions.map((time) => (
                    <Option
                      key={time.value}
                      value={time.value}
                      className="py-2 px-3 text-slate-600 transition-colors hover:bg-[#6571FF]/10 hover:text-[#6571FF]"
                    >
                      <div className="flex items-center gap-2">
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

      {taskData?.client && taskData?.createdBy === "sales_agent" && (
        <div className="mb-4 flex flex-col">
          <label className="font-medium text-slate-600">
            Client Information
          </label>
          <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
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
        <label className="font-medium text-slate-600">Priority Level</label>
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
