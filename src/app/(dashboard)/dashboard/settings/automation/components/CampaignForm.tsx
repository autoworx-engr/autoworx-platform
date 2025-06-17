"use client";
import { Select } from "@radix-ui/react-select"
import React, { useEffect } from "react";
import Selector from "./Selector";
import { useRef, useState } from "react";
import { TimePicker } from "antd";
import type { Dayjs } from "dayjs";

import { format, addDays } from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { CiCalendar } from "react-icons/ci";
import { FaArrowRight } from "react-icons/fa";
import DatePicker from "react-multi-date-picker";
import "react-multi-date-picker/styles/layouts/mobile.css";
import {
  AttachFile as AttachFileIcon,
  Close as CloseIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import {
  Box,
  Chip,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  Radio,
  RadioGroup,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import MultiSelect from "./MultiSelect";
import { SlimInput } from "@/components/SlimInput";
import { cn } from "@/lib/cn";
import { ImAttachment } from "react-icons/im";
import ActiveTemplate from "./ActiveTemplate";
import TemplateVariable from "./TemplateVariable";
import { targetConditions, targetOptions } from "./constants";
import { errorToast } from "@/lib/toast";

export type Campaign = {
  id?: string;
  companyId: number | null;
  target: string[];
  targetCondition: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  isAppointmentCreated: boolean;
  vehicleMinYear?: string;
  vehicleMaxYear?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  communicationType: "SMS" | "EMAIL" | "BOTH";
  templateType: "SMS" | "EMAIL";
  attachments?: File[];
  subject?: string;
  body: string;
  createdBy: string | null;
};

type CampaignFormProps = {
  initialData?: Campaign;
  mode: "create" | "edit" | undefined;
  id?: string | null;
  isEdit: boolean;
};

// Years for vehicle selection
const years = Array.from({ length: 76 }, (_, i) => {
  const year = new Date().getFullYear() - i;
  return year.toString();
});

// Vehicle brands
const vehicleBrands = [
  "Toyota",
  "Honda",
  "Ford",
  "Chevrolet",
  "BMW",
  "Mercedes",
  "Audi",
  "Nissan",
  "Hyundai",
  "Kia",
];

// Vehicle models
const vehicleModels = [
  "Sedan",
  "SUV",
  "Truck",
  "Coupe",
  "Hatchback",
  "Convertible",
  "Minivan",
  "Wagon",
];

const CampaignForm = ({ mode, id, isEdit, initialData }: CampaignFormProps) => {
  const today = new Date().toISOString().split("T")[0];
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<Campaign>(
    initialData || {
      companyId: null,
      target: [],
      targetCondition: "",
      date: today,
      startTime: "",
      endTime: "",
      isAppointmentCreated: false,
      vehicleMinYear: "",
      vehicleMaxYear: "",
      vehicleBrand: "",
      vehicleModel: "",
      communicationType: "SMS",
      templateType: "SMS",
      attachments: [],
      subject: "",
      body: "",
      createdBy: null,
    },
  );

  const [minDate, setMinDate] = useState<string>(today);

  const [activeTemplate, setActiveTemplate] = useState<"SMS" | "EMAIL">("SMS");

  // Type-safe input change handler
  const handleInputChange = <K extends keyof Campaign>(
    field: K,
    value: Campaign[K],
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle input changes
  const handleChange = (field: keyof Campaign, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle time change
  const handleStartTimeChange = (time: Dayjs | null) => {
    if (time) {
      handleInputChange("startTime", time.format("HH:mm"));
    } else {
      handleInputChange("startTime", "");
    }
  };

  const handleEndTimeChange = (time: Dayjs | null) => {
    if (time) {
      handleInputChange("endTime", time.format("HH:mm"));
    } else {
      handleInputChange("endTime", "");
    }
  };

  // Handle communication type change
  const handleCommunicationTypeChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    handleChange("communicationType", (event.target as HTMLInputElement).value);
  };

  // Handle template toggle
  const handleTemplateToggle = (template: "SMS" | "EMAIL") => {
    setActiveTemplate(template);
    setFormData((prev) => ({
      ...prev,
      templateType: template,
    }));
  };

  // Handle file attachment
  const handleFileAttachment = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: string,
  ) => {
    if (event.target.files) {
      const file = event.target.files;
      const fileArray = Array.from(file);
      if (type === "SMS") {
        handleChange("attachments", fileArray);
      } else {
        handleChange("attachments", fileArray);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errors: string[] = [];
    // if (formData.companyId === null) errors.push("Company ID is required.");
    if (!Array.isArray(formData.target) || formData.target.length === 0) {
      errors.push("At least one target is required.");
    }

    // if(!formData.targetCondition) errors.push("Target Condition is required")
    if (!formData.targetCondition) setError("Target Condition is required");

    if (!formData.date) errors.push("Date is required.");
    if (!formData.startTime) errors.push("Start Time is required.");
    if (!formData.endTime) errors.push("End Time is required.");
    if (!formData.templateType) errors.push("Template type is required.");
    if (!formData.communicationType)
      errors.push("Communication type is required.");

    if (errors.length > 0) {
      errors.forEach((err) => errorToast(err));

      // errors.forEach((err) => setError(err));
      return;
    }

    console.log("Form Data", formData);
  };

  const handleTemplateChange = (name: string, value: any) => {
    // This cast is safe because we're only passing valid keys from the ActiveTemplate component
    handleChange(name as keyof Campaign, value);
  };
  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-gray-800 md:text-xl">
        {mode == "create" ? "New Rule" : "Edit Rule"}
      </h2>
      <div className="rounded-md border bg-white p-4 shadow-sm md:p-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Target Field */}
          <div>
            <MultiSelect
              options={targetOptions}
              value={formData.target}
              onChange={(value) => handleChange("target", value)}
              label="Target"
              placeholder="Select options"
              required
              // error={error}
            />
          </div>

          {/* Target Conditions Field */}
          <Selector
            name="targetCondition"
            label="Target Conditions"
            options={targetConditions}
            value={formData.targetCondition}
            onChange={(value) => handleInputChange("targetCondition", value)}
            required
            error={error}
          />

          {/* Date and Time Selector */}
          <div className="mb-4">
            <div className="flew-wrap flex items-center gap-2">
              <SlimInput
                name="date"
                label="Select Date and Time"
                className="w-30"
                type="date"
                value={formData.date ?? ""}
                min={minDate}
                required
                onChange={(e) => handleInputChange("date", e.target.value)}
              />
              <div className="mt-6 flex items-center gap-1">
                <TimePicker
                  format="h:mm A"
                  className="time-picker w-20 rounded border border-slate-400 px-2 py-1"
                  placeholder="1:00 AM"
                  use12Hours
                  onChange={handleStartTimeChange}
                  allowClear={false}
                  suffixIcon={null}
                />
                <FaArrowRight className="text-gray-400" />
                <TimePicker
                  format="h:mm A"
                  className="time-picker w-20 rounded border border-slate-400 px-2 py-1"
                  placeholder="3:00 AM"
                  use12Hours
                  onChange={handleEndTimeChange}
                  allowClear={false}
                  suffixIcon={null}
                />
              </div>
            </div>
          </div>

          {/* Appointment Checkbox */}
          <div className="mb-3 flex items-center">
            <input
              type="checkbox"
              checked={formData.isAppointmentCreated}
              onChange={(e) =>
                handleInputChange("isAppointmentCreated", e.target.checked)
              }
              className="mr-2"
              id="isAppointmentCreated"
            />
            <label htmlFor="isAppointmentCreated" className="">
              Appointment Created?
            </label>
          </div>

          {/* Vehicle Min, Max Year Field */}
          <div className="flex w-full items-center gap-5">
            {/* Min Year */}
            <Selector
              name="vehicleMinYear"
              label="Vehicle Min Year"
              options={years}
              rootClassName="w-1/2"
              value={formData.vehicleMinYear || ""}
              onChange={(value) => handleInputChange("vehicleMinYear", value)}
            />
            {/* Max Year */}
            <Selector
              name="vehicleMaxYear"
              label="Vehicle Max Year"
              options={years}
              rootClassName="w-1/2"
              value={formData.vehicleMaxYear || ""}
              onChange={(value) => handleInputChange("vehicleMaxYear", value)}
            />
          </div>

          {/* Vehicle Make, Model Field */}
          <div className="flex w-full items-center gap-5">
            {/* Vehicle Make */}
            <Selector
              name="vehicleBrand"
              label="Vehicle Make"
              options={vehicleBrands}
              rootClassName="w-1/2"
              value={formData.vehicleBrand || ""}
              onChange={(value) => handleInputChange("vehicleBrand", value)}
            />
            {/* Vehicle Model */}
            <Selector
              name="vehicleModel"
              label="Vehicle Model"
              options={vehicleModels}
              rootClassName="w-1/2"
              value={formData.vehicleModel || ""}
              onChange={(value) => handleInputChange("vehicleModel", value)}
            />
          </div>

          {/* Communication Type */}
          <Box className="my-4">
            <RadioGroup
              row
              name="communication-type"
              value={formData.communicationType}
              onChange={handleCommunicationTypeChange}
            >
              <FormControlLabel value="SMS" control={<Radio />} label="SMS" />
              <FormControlLabel
                value="EMAIL"
                control={<Radio />}
                label="Email"
              />
              <FormControlLabel value="BOTH" control={<Radio />} label="Both" />
            </RadioGroup>
          </Box>

          {/* Templates */}
          <Box className="my-4">
            <label className="mb-2 font-semibold text-gray-500">
              Templates
            </label>

            <Box className="mb-2 flex items-center">
              <Typography className="mr-2">SMS</Typography>
              <Switch
                checked={activeTemplate === "EMAIL"}
                onChange={() =>
                  handleTemplateToggle(
                    activeTemplate === "SMS" ? "EMAIL" : "SMS",
                  )
                }
              />
              <Typography className="ml-2">Email</Typography>
            </Box>

            {/* SMS Template */}
            {(activeTemplate === "SMS" ||
              formData.communicationType === "BOTH") && (
              <Box
                className={`mb-4 ${activeTemplate !== "SMS" ? "hidden" : ""}`}
              >
                <ActiveTemplate
                  activeTemplate="SMS"
                  rows={4}
                  name="body"
                  value={formData.body!}
                  iconBtnClassName="absolute -bottom-9 right-0"
                  attachment={formData.attachments!}
                  attachmentName="attachments"
                  placeholder="Enter SMS template here..."
                  handleChange={handleTemplateChange}
                  handleFileAttachment={handleFileAttachment}
                  attachmentType="sms"
                />
              </Box>
            )}

            {/* EMAIL Template */}
            {(activeTemplate === "EMAIL" ||
              formData.communicationType === "BOTH") && (
              <Box
                className={`mb-4 ${activeTemplate !== "EMAIL" ? "hidden" : ""}`}
              >
                <ActiveTemplate
                  activeTemplate="EMAIL"
                  rows={6}
                  subjectName="subject"
                  name="body"
                  subjectValue={formData.subject}
                  value={formData.body}
                  iconBtnClassName="absolute -bottom-16 right-0"
                  attachment={formData.attachments!}
                  attachmentName="attachments"
                  placeholder="Enter email body here..."
                  handleChange={handleTemplateChange}
                  handleFileAttachment={handleFileAttachment}
                  attachmentType="EMAIL"
                />
              </Box>
            )}

            {/* Template Variables */}
            <TemplateVariable />
          </Box>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
            >
              {initialData?.id ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CampaignForm;
