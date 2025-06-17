"use client";
import React, { useState, useEffect } from "react";
import Selector from "./Selector";
import { Paper } from "@mui/material";
import { SlimInput } from "@/components/SlimInput";
import { actionTypeOption, conditions } from "./constants";
import { errorToast } from "@/lib/toast";

type RuleFormProps = {
  initialData?: Rule;
  mode: "create" | "edit" | undefined;
  id?: string | null;
  isEdit: boolean;
};

export type Rule = {
  id?: string;
  title: string;
  frequency: string;
  day: string;
  condition: string;
  action: string;
  vendor: string;
  sendToTeam: string;
};

const InventoryRuleForm: React.FC<RuleFormProps> = ({
  mode,
  id,
  isEdit,
  initialData,
}) => {
  // Default empty rule
  const [formData, setFormData] = useState<Rule>(
    initialData || {
      title: "",
      frequency: "",
      condition: "",
      action: "",
      day: "",
      vendor: "",
      sendToTeam: "",
    },
  );

  // Update rule on initial data change
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  // Handle input changes
  const handleChange = (field: keyof Rule, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle form submission
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const errors:string[] = []

    if(!formData.title || !formData.title.trim()) errors.push("Title is required")

     if(!formData.frequency) errors.push("Frequency is required") 
     if(!formData.day) errors.push("Day is required") 
     if(!formData.condition) errors.push("Condition is required") 
     if(!formData.action) errors.push("Frequency is required") 


      if (errors.length > 0) {
                errors.forEach((err) => errorToast(err));
                return;
              }

              console.log("Form Data",formData)
  };

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-gray-800 md:text-xl">
        {mode == "create" ? "New Rule" : "Edit Rule"}
      </h2>
      <div className="h-[600px] rounded-md border bg-white p-4 shadow-sm md:p-6">
        <Paper elevation={0} className="mx-auto max-w-lg rounded-lg">
          <form onSubmit={handleSubmit}>
            {/* Title */}
            <SlimInput
              name="label"
              label="Title"
              value={formData.title}
              labelClassName="text-gray-500"
              onChange={(e) => handleChange("title", e.target.value)}
              required
            />

            {/* Frequency */}
            <Selector
              name="frequency"
              label="Frequency"
              options={["frequency1", "frequency1"]}
              value={formData.frequency}
              onChange={(value) => handleChange("frequency", value)}
              required
            />
            {/* Day */}
            <Selector
              name="day"
              label="Day"
              options={["day1", "day2"]}
              value={formData.day}
              onChange={(value) => handleChange("day", value)}
              required
            />
            {/* Condition */}
            <Selector
              name="condition"
              label="Condition"
              options={conditions}
              value={formData.condition}
              onChange={(value) => handleChange("condition", value)}
              required
            />
            {/* Action */}
            <Selector
              name="action"
              label="Action"
              options={actionTypeOption}
              value={formData.action}
              onChange={(value) => handleChange("action", value)}
              required
            />
            {/* Vendor */}
            <Selector
              name="vendor"
              label="Vendor"
              options={["Vendor1", "Vendor2"]}
              value={formData.vendor}
              onChange={(value) => handleChange("vendor", value)}
            />
            {/* Action */}
            <Selector
              name="sendToTeam"
              label="Send To Team"
              options={["Action1", "Action2"]}
              value={formData.sendToTeam}
              onChange={(value) => handleChange("sendToTeam", value)}
            />

            {/* Save & Cancel Buttons */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
              >
                {initialData?.id ? "Update" : "Save"}
              </button>
            </div>
          </form>
        </Paper>
      </div>
    </div>
  );
};

export default InventoryRuleForm;
