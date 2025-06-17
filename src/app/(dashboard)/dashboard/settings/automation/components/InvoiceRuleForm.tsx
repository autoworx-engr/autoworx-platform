"use client";
import React, { useState, useEffect } from "react";
import Selector from "./Selector";
import {
  TextField,
  Box,
  FormControlLabel,
  Radio,
  RadioGroup,
  Paper,
  Typography,
  IconButton,
  Switch,
  Chip,
} from "@mui/material";
import {
  AttachFile as AttachFileIcon,
  Close as CloseIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { SlimInput } from "@/components/SlimInput";
import TemplateVariable from "./TemplateVariable";
import ActiveTemplate from "./ActiveTemplate";
import { timeDelays } from "./constants";
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
  status: string;
  timeDelay: number | null;
  payment: string;
  communicationType: "SMS" | "EMAIL" | "BOTH";
  templateType: "SMS" | "EMAIL";
  attachments?: File[];
  subject?: string;
  body: string;

};

// Template variables
const template_variable_options = [
  { name: "[INVOICE_LINK]", description: "Invoice link" },
  { name: "[ADDRESS]", description: "Address" },
  { name: "[CLIENT]", description: "Client" },
  { name: "[BUSINESS_NAME]", description: "Your business name" },
  { name: "[DATE]", description: "Date" },
  { name: "[REVIEW_LINK]", description: "Review link" },
  { name: "[SERVICE]", description: "Service" },
  { name: "[PHONE]", description: "Phone" },
];

const ts = [
  "30 seconds",
  "1 minute",
  "2 minutes",
  "5 minutes",
  "10 minutes",
  "15 minutes",
  "30 minutes",
  "45 minutes",
  "1 hour",
  "2 hours",
  "3 hours",
  "5 hours",
  "6 hours",
  "10 hours",
  "12 hours",
  "1 day",
  "2 days",
  "3 days",
  "5 days",
  "7 days",
  "10 days",
  "14 days",
  "1 month",
  "2 months",
  "3 months",
  "6 months",
  "9 months",
  "1 year",
  "1.5 year",
  "2 year",
  "3 year",
];

const InvoiceRuleForm: React.FC<RuleFormProps> = ({
  mode,
  id,
  isEdit,
  initialData,
}) => {
  // Default empty rule
  const [formData, setFormData] = useState<Rule>(
    initialData || {
      title: "",
      status: "",
      timeDelay: null,
      payment: "",
      communicationType: "SMS",
      templateType: "SMS",
       attachments: [],
      subject:"",
      body:""
    },
  );
  const [activeTemplate, setActiveTemplate] = useState<"SMS" | "EMAIL">("SMS");

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

  // Handle communication type change
  const handleCommunicationTypeChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    handleChange("communicationType", (event.target as HTMLInputElement).value);
  };

  // Handle template toggle
  const handleTemplateToggle = (template: "SMS" | "EMAIL") => {
    setActiveTemplate(template);

    setFormData((prev)=>({
      ...prev,
      templateType:template
    }))
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

  // Handle form submission
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const errors: string[] = []

    if(!formData.title || !formData.title.trim()) errors.push("Title is required")

    if(!formData.status) errors.push("Invoice status is required")
 if (formData.timeDelay === null) errors.push("Time delay is required.");
 if (!formData.payment) errors.push("Payment is required.");

  if (!formData.templateType) errors.push("Template type is required.");
    if (!formData.communicationType)
      errors.push("Communication type is required.");
    if (formData.templateType === "EMAIL") {
      if (!formData.subject || !formData.subject.trim()) {
        errors.push("Subject is required when template type is EMAIL.");
      }
    }

    if (errors.length > 0) {
          errors.forEach((err) => errorToast(err));
          return;
        }

        console.log("Form Data", formData)

  };

   const handleTemplateChange = (name: string, value: any) => {
    // This cast is safe because we're only passing valid keys from the ActiveTemplate component
    handleChange(name as keyof Rule, value);
  };
  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-gray-800 md:text-xl">
        {mode == "create" ? "New Rule" : "Edit Rule"}
      </h2>
      <div className="rounded-md border bg-white p-4 shadow-sm md:p-6">
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

            {/* Invoice Status */}
            <Selector
              name="status"
              label="Invoice Status"
              options={["status1", "status2"]}
              value={formData.status}
              onChange={(value) => handleChange("status", value)}
              required
            />
            {/* Payment */}
            <Selector
              name="payment"
              label="Payment"
              options={["payment1", "payment2"]}
              value={formData.payment}
              onChange={(value) => handleChange("payment", value)}
              required
            />
            {/* Time Delay */}
            <Selector
              name="delay"
              label="Time Delay"
              options={timeDelays}
              value={formData.timeDelay!}
              onChange={(value) => handleChange("timeDelay", value)}
              required
            />

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
                  value="Email"
                  control={<Radio />}
                  label="Email"
                />
                <FormControlLabel
                  value="Both"
                  control={<Radio />}
                  label="Both"
                />
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
              {activeTemplate === "SMS" && (
                <Box
                  className={`mb-4 ${activeTemplate !== "SMS" ? "hidden" : ""}`}
                >
                  {/* <TextField
                    multiline
                    rows={4}
                    fullWidth
                    placeholder="Enter SMS template here..."
                    value={formData.smsTemplate}
                    onChange={(e) =>
                      handleChange("smsTemplate", e.target.value)
                    }
                    InputProps={{
                      endAdornment: (
                        <IconButton
                          component="label"
                          size="small"
                          className="absolute -bottom-5 right-1"
                        >
                          <AttachFileIcon />
                          <input
                            type="file"
                            hidden
                            onChange={(e) => handleFileAttachment(e, "sms")}
                          />
                        </IconButton>
                      ),
                    }}
                  />
                  {formData.smsAttachment && (
                    <Box className="mt-2 flex items-center">
                      <Chip
                        label={formData.smsAttachment.name}
                        onDelete={() => handleChange("smsAttachment", null)}
                        deleteIcon={<CloseIcon />}
                        variant="outlined"
                      />
                    </Box>
                  )} */}

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

              {/* Email Template */}
              {activeTemplate === "EMAIL" && (
                <Box
                  className={`mb-4 ${activeTemplate !== "EMAIL" ? "hidden" : ""}`}
                >
                  {/* <input
                    name="emailSubject"
                    type="text"
                    value={formData.emailSubject}
                    placeholder="subject"
                    className="w-full rounded-sm border border-slate-400 bg-background px-2 py-0.5 leading-6 outline-none"
                    onChange={(e) =>
                      handleChange("emailSubject", e.target.value)
                    }
                    required
                  />
                  <TextField
                    multiline
                    rows={6}
                    fullWidth
                    placeholder="Enter email body here..."
                    value={formData.emailBody}
                    onChange={(e) => handleChange("emailBody", e.target.value)}
                    InputProps={{
                      endAdornment: (
                        <IconButton
                          component="label"
                          size="small"
                          className="absolute -bottom-5 right-1"
                        >
                          <AttachFileIcon />
                          <input
                            type="file"
                            hidden
                            onChange={(e) => handleFileAttachment(e, "email")}
                          />
                        </IconButton>
                      ),
                    }}
                  />
                  {formData.emailAttachment && (
                    <Box className="mt-10 flex items-center">
                      <Chip
                        label={formData.emailAttachment.name}
                        onDelete={() => handleChange("emailAttachment", null)}
                        deleteIcon={<CloseIcon />}
                        variant="outlined"
                      />
                    </Box>
                  )} */}

                  <ActiveTemplate
                                      activeTemplate="EMAIL"
                                      rows={6}
                                      subjectName="subject"
                                      name="body"
                                      subjectValue={formData.subject!}
                                      value={formData.body!}
                                      iconBtnClassName="absolute -bottom-16 right-0"
                                      attachment={formData.attachments!}
                                      attachmentName="emailAttachment"
                                      placeholder="Enter email body here..."
                                      handleChange={handleTemplateChange}
                                      handleFileAttachment={handleFileAttachment}
                                      attachmentType="email"
                                    />
                </Box>
              )}

              {/* Template Variables */}
              <TemplateVariable VARIABLES={template_variable_options} />
            </Box>

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

export default InvoiceRuleForm;
