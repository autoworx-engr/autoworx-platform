"use client";
import React, { useState, useEffect } from "react";
import Selector from "./Selector";
import {
  TextField,
  Box,
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
import MultiSelect from "./MultiSelect";
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
  companyId: number | null;
  id?: string;
  title: string;
  service: string[];
  condition: string;
  delay: string;
  action: string;
  templateType: "SMS" | "EMAIL";
  attachments?: File[];
  subject?: string;
  body: string;
};

// Template variables
const template_variable_options = [
  { name: "[CONTACT]", description: "Contact" },
  { name: "[INTEREST]", description: "Interest" },
  { name: "[VEHICLE]", description: "Vehicle" },
  { name: "[BUSINESS_NAME]", description: "Your business name" },
  { name: "[BUSINESS_PHONE]", description: "Your business phone" },
  { name: "[BUSINESS_ADDRESS]", description: "Your business address" },
  { name: "[VIDEO_DIRECTION]", description: "Video direction" },
  { name: "[GOOGLE_MAP_LINK]", description: "Google map link" },
];



const ServiceRuleForm: React.FC<RuleFormProps> = ({
  mode,
  id,
  isEdit,
  initialData,
}) => {
  // Default empty rule
  const [formData, setFormData] = useState<Rule>(
    initialData || {
      title: "",
      service: [],
      condition: "",
      delay: "",
      action: "",
      templateType: "SMS",
      attachments: [],
      subject: "",
      body: "",
      companyId: null
      
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
      const fileArray = Array.from(file)
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

    const errors: string[] = [];
        // if (formData.companyId === null) errors.push("Company ID is required.");
        if (!formData.title || !formData.title.trim())
      errors.push("Title is required.");

            if (!Array.isArray(formData.service) || formData.service.length === 0) {
              errors.push("At least one service is required.");
            }
           
              if (!formData.condition)
      errors.push("Condition is required.");
              if (!formData.action)
      errors.push("Action is required.");
            if (!formData.templateType) errors.push("Template type is required.");
           
            if (formData.templateType === "EMAIL") {
              if (!formData.subject || !formData.subject.trim()) {
                errors.push("Subject is required for the EMAIL.");
              }
            }
        
           
        
            if (errors.length > 0) {
              errors.forEach((err) => errorToast(err));
              return;
            }

            console.log("FOrmData", formData)
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

            {/* Service */}
            <div>
              <MultiSelect
                options={[{id:"service1", title:"Service1"}, {id:"service2", title:"Service2"}]}
                value={formData.service}
                onChange={(value) => handleChange("service", value)}
                label="Service"
                placeholder="Select options"
                required
              />
            </div>

            {/* Condition */}
            <Selector
              name="condition"
              label="Condition"
              options={["condition1", "condition2"]}
              value={formData.condition}
              onChange={(value) => handleChange("condition", value)}
              required
            />
            {/* Action */}
            <Selector
              name="action"
              label="Action"
              options={["action1", "action2"]}
              value={formData.action}
              onChange={(value) => handleChange("action", value)}
              required
            />
            {/* Time Delay */}
            <Selector
              name="delay"
              label="Time Delay"
              options={timeDelays}
              value={formData.delay}
              onChange={(value) => handleChange("delay", value)}
              required
            />

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
                  {formData.attachments! && (
                    <Box className="mt-2 flex items-center">
                      <Chip
                        label={formData.attachments!.name}
                        onDelete={() => handleChange("attachments!", null)}
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

export default ServiceRuleForm;
