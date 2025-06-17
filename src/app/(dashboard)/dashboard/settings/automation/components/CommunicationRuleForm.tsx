"use client";
import React, { useState, useEffect } from "react";
import Selector from "./Selector";
import {
  Box,
  FormControlLabel,
  Radio,
  RadioGroup,
  Paper,
  Typography,
  Switch,
} from "@mui/material";
import MultiSelect from "./MultiSelect";
import { SlimInput } from "@/components/SlimInput";
import ActiveTemplate from "./ActiveTemplate";
import TemplateVariable from "./TemplateVariable";
import { usePipelineStagesStore } from "@/stores/pipelineStagesStore";
import { timeDelays } from "./constants";
import { errorToast } from "@/lib/toast";
import { parseTimeDelayToSeconds } from "@/utils/parseTimeDelayToSeconds";
import { useCreateCommunicationAutomationRule } from "@/hooks/communication-automation/useCreateCommunicationAutomationRule";
import { useUpdateCommunicationAutomationRule } from "@/hooks/communication-automation/useUpdateCommunicationAutomationRule";
import { useFindOneCommunicationAutomationRule } from "@/hooks/communication-automation/useFindOneCommunicationAutomationRule";
import { Spin } from "antd";
import { parseSecondsToTimeDelay } from "@/utils/parseSecondsToTimeDelay";

type RuleFormProps = {
  initialData?: Rule;
  mode: "create" | "edit" | undefined;
  id?: string | null;
  isEdit: boolean;
  companyId: any;
  user: any;
};

export type Rule = {
  id?: number;
  companyId: number | null;
  title: string | null;
  stages: number[];
  timeDelay: number | null | string;
  communicationType: "SMS" | "EMAIL" | "BOTH";
  templateType: "SMS" | "EMAIL";
  isSendWeekDays: boolean;
  subject?: string | null;
  body: string | null;
  attachments?: File[];
  targetColumnId: number | null;
  createdBy: string | null;
};

const CommunicationRuleForm: React.FC<RuleFormProps> = ({
  mode,
  id,
  isEdit,
  initialData,
  companyId,
  user,
}) => {
  const [formData, setFormData] = useState<Rule>({
    companyId: null,
    title: "",
    stages: [],
    timeDelay: null,
    communicationType: "SMS",
    templateType: "SMS",
    isSendWeekDays: false,
    subject: "",
    body: "",
    attachments: [],
    createdBy: null,
    targetColumnId: null,
  });
  const { stages, fetchStages, loading, error } = usePipelineStagesStore();
  const [activeTemplate, setActiveTemplate] = useState<"SMS" | "EMAIL">("SMS");
  const { mutate: createRule } = useCreateCommunicationAutomationRule();
  const { mutate: updateRule } = useUpdateCommunicationAutomationRule();
  const { data, isError, isLoading, isFetched } =
    useFindOneCommunicationAutomationRule(Number(id));
  // Update rule on initial data change
  const userEmail = user?.email;
  useEffect(() => {
    const loadData = async () => {
      if (isEdit && id) {
        const timeDelay = parseSecondsToTimeDelay(data?.data?.timeDelay);
        setFormData({
          companyId: data?.data.companyId,
          title: data?.data.title,
          stages: data?.data?.stages?.map((stage: any) => stage.columnId),
          timeDelay: timeDelay,
          communicationType: data?.data.communicationType,
          templateType: data?.data.templateType,
          isSendWeekDays: data?.data.isSendWeekDays ?? false,
          subject: data?.data.subject || "",
          body: data?.data.body || "",
          attachments: data?.data.attachments || [],
          createdBy: data?.data.createdBy,
          targetColumnId: data?.data?.targetColumnId.toString(),
        });
      } else {
        setFormData({
          companyId: null,
          title: "",
          stages: [],
          timeDelay: null,
          communicationType: "SMS",
          templateType: "SMS",
          isSendWeekDays: false,
          subject: "",
          body: "",
          attachments: [],
          createdBy: null,
          targetColumnId: null,
        });
      }
    };
    loadData();
  }, [isEdit, id, data, mode]);

  useEffect(() => {
    fetchStages("sales");
  }, []);

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

  const handleTemplateChange = (name: string, value: any) => {
    // This cast is safe because we're only passing valid keys from the ActiveTemplate component
    handleChange(name as keyof Rule, value);
  };

  // Handle form submission
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const errors: string[] = [];

    // if (formData.companyId === null) errors.push("Company ID is required.");
    if (!formData.title || !formData.title.trim())
      errors.push("Title is required.");
    if (!Array.isArray(formData.stages) || formData.stages.length === 0) {
      errors.push("At least one stage is required.");
    }
    if (formData.timeDelay === null) errors.push("Time delay is required.");
    if (formData.targetColumnId === null) errors.push("Action is required.");
    if (!formData.templateType) errors.push("Template type is required.");
    if (!formData.body) errors.push("body type is required.");
    if (!formData.communicationType)
      errors.push("Communication type is required.");
    if (formData.templateType === "EMAIL") {
      if (!formData.subject || !formData.subject.trim()) {
        errors.push("Subject is required when template type is EMAIL.");
      }
    }

    // if (!formData.createdBy || !formData.createdBy.trim()) {
    //   errors.push("You must be an valid user!.");
    // }

    if (errors.length > 0) {
      errors.forEach((err) => errorToast(err));
      return;
    }

    try {
      if (isEdit && id) {
        if (formData.timeDelay != null) {
          const seconds = parseTimeDelayToSeconds(formData.timeDelay!);
          formData.timeDelay = seconds;
        }
        formData.targetColumnId = Number(formData.targetColumnId);
        formData.companyId = companyId;
        formData.createdBy = userEmail;
        updateRule({ id, companyId: companyId, data: formData });
      } else {
        if (formData.timeDelay != null) {
          const seconds = parseTimeDelayToSeconds(formData.timeDelay!);
          formData.timeDelay = seconds;
        }
        formData.targetColumnId = Number(formData.targetColumnId);
        formData.companyId = companyId;
        formData.createdBy = userEmail;
        createRule(formData);
        setFormData({
          companyId: null,
          title: "",
          stages: [],
          timeDelay: null,
          communicationType: "SMS",
          templateType: "SMS",
          isSendWeekDays: false,
          subject: "",
          body: "",
          attachments: [],
          createdBy: null,
          targetColumnId: null,
        });
      }
    } catch (error) {
      console.error("An error occurred:", error);
      // Optionally show error message
    }
    console.log("formdata from communication", formData);
  };

  if (loading || isLoading) {
    <div className="flex h-[600px] items-center justify-center p-4">
      <Spin />
    </div>;
  }

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-gray-800 md:text-xl">
        {mode == "create" ? "New Rule" : "Edit Rule"}
      </h2>
      <div className="rounded-md border bg-white p-4 shadow-sm md:p-6">
        <Paper elevation={0} className="mx-auto max-w-lg rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <SlimInput
              name="label"
              label="Title"
              value={formData.title!}
              labelClassName="text-gray-500"
              onChange={(e) => handleChange("title", e.target.value)}
              // required
            />

            {/* Stage */}
            <div>
              <MultiSelect
                options={stages}
                value={formData.stages}
                onChange={(value) => handleChange("stages", value)}
                label="Stage"
                placeholder="Select options"
                required
              />
            </div>

            {/* Time Delay */}
            <Selector
              name="delay"
              label="Time Delay"
              options={timeDelays}
              value={formData.timeDelay!}
              onChange={(value) => handleChange("timeDelay", value)}
              required
            />

            {/* Action */}
            <Selector
              name="action"
              label="Action"
              options={stages}
              value={formData.targetColumnId!}
              onChange={(value) => handleChange("targetColumnId", value)}
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
                  value="EMAIL"
                  control={<Radio />}
                  label="Email"
                />
                <FormControlLabel
                  value="BOTH"
                  control={<Radio />}
                  label="Both"
                />
              </RadioGroup>
            </Box>

            {/* Send on Weekdays Only */}
            <div className="mb-3 flex items-center">
              <input
                type="checkbox"
                checked={formData.isSendWeekDays}
                onChange={(e) =>
                  handleChange("isSendWeekDays", e.target.checked)
                }
                className="mr-2"
                id="isSendWeekDays"
              />
              <label htmlFor="isSendWeekDays" className="text-gray-500">
                Send on Weekdays Only
              </label>
            </div>

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
              {activeTemplate === "EMAIL" && (
                <Box
                  className={`mb-4 ${activeTemplate !== "EMAIL" ? "hidden" : ""}`}
                >
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
              <TemplateVariable />
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

export default CommunicationRuleForm;
