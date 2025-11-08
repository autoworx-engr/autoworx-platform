"use client";
import { SlimInput } from "@/components/SlimInput";
import Selector from "./Selector";
import {
  Conditions,
  Funnels,
  invoiceTimeDelays,
  PipelineType,
} from "./constants";
import { ChangeEvent, useEffect, useState } from "react";
import { getSalesTags } from "@/actions/pipelines/leadTag";
import { Company, InfobipConfig, Tag, TwilioCredentials } from "@prisma/client";
import MultiSelect from "./MultiSelect";
import { getInvoiceTags } from "@/actions/pipelines/invoiceTag";
import { usePipelineStagesStore } from "@/stores/pipelineStagesStore";
import { TAttachments } from "@/types/automation";
import CustomRadioGroup from "./CustomRadioGroup";
import { Box, Paper, Switch, Typography } from "@mui/material";
import ActiveTemplate from "./ActiveTemplate";
import TemplateVariable from "./TemplateVariable";
import { useCharacterLimit } from "@/hooks/useCharecterLimit";
import { handleFileSelection } from "@/utils/handleFileAttachment";
import { parseTimeDelayToSeconds } from "@/utils/parseTimeDelayToSeconds";
import { useCreateTagAutomationRule } from "@/hooks/tag-automation/useCreateTagAutomationRule";

type RuleFormProps = {
  mode: "create" | "edit" | undefined;
  id?: string | null;
  isEdit: boolean;
  companyId: any;
  user: any;
  company: Company;
  twilio: TwilioCredentials | InfobipConfig | null;
};

type Rule = {
  companyId: any;
  title: string;
  pipelineType: "SALES" | "SHOP" | "";
  tagIds: number[];
  // funnel: string;
  timeDelay: number | null | string;
  condition_type: "pipeline" | "communication" | "post-tag" | "";
  targetColumnId: number | number[] | null;
  communicationType: "SMS" | "EMAIL" | "BOTH";
  templateType: "SMS" | "EMAIL";
  isSendWeekDays: boolean;
  isSendOfficeHours: boolean;
  subject?: string | null;
  emailBody?: string | null;
  smsBody?: string | null;
  attachments?: TAttachments | [];
  ruleType: string;
};

const TagRuleForm = ({
  mode,
  id,
  isEdit,
  companyId,
  user,
  company,
  twilio,
}: RuleFormProps) => {
  const [formData, setFormData] = useState<Rule>({
    companyId: companyId,
    title: "",
    pipelineType: "",
    tagIds: [],
    // funnel: "",
    timeDelay: null,
    condition_type: "",
    targetColumnId: null,
    communicationType: "SMS",
    templateType: "SMS",
    isSendWeekDays: false,
    isSendOfficeHours: false,
    subject: "",
    emailBody: "",
    smsBody: "",
    attachments: [],
    ruleType: "",
  });

  const [salesTags, setSalesTags] = useState<Tag[]>([]);
  const [shopTags, setShopTags] = useState<Tag[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<"SMS" | "EMAIL">("SMS");
  const maxLength = 300;
  const { length, isLimitExceeded } = useCharacterLimit(
    // safe fallback to avoid non-null assertions
    (formData.emailBody || formData.smsBody || "") as string,
    maxLength
  );
  const [error, setError] = useState<Record<string, string>>({});
  const {
    stages,
    fetchStages,
    loading: stagesLoading,
  } = usePipelineStagesStore();

  const { mutate: createRule, isPending } = useCreateTagAutomationRule();
  // sales tag
  useEffect(() => {
    const fetchTags = async () => {
      const res = await getSalesTags();
      if (res.type === "success" && res.data) setSalesTags(res.data);
    };
    fetchTags();
  }, []);

  // shop tags
  useEffect(() => {
    const fetchInvoiceTags = async () => {
      const res = await getInvoiceTags();
      if (res.type === "success" && res.data) setShopTags(res.data);
    };
    fetchInvoiceTags();
  }, []);

  // fetch stages when pipelineType changes
  useEffect(() => {
    const pipelineTypeLower = formData.pipelineType.toLowerCase();
    if (pipelineTypeLower === "sales" || pipelineTypeLower === "SHOP") {
      fetchStages(pipelineTypeLower);
    }
  }, [formData.pipelineType, fetchStages])

  // Prepare tag options for MultiSelect
  const salesTagOptions = salesTags.map((tag) => ({
    id: tag.id,
    title: tag.name,
  }));

  const shopTagOptions = shopTags.map((tag) => ({
    id: tag.id,
    title: tag.name,
  }));

  // Stage options for post-tag condition_type (stages are fetched based on pipelineType)
  const stageOptions = stages.map((s: any) => ({
    id: s.id,
    title: s.title || s.name,
  }));

  console.log("stages", stageOptions);
;
  // Handle form field changes
  const handleChange = (field: keyof Rule, value: any) => {
    setFormData((prev) => {
      const newState: any = { ...prev };

      // Normalize targetColumnId value depending on the field source
      if (field === "targetColumnId") {
        // If the incoming value is an array (from MultiSelect), use it directly
        if (Array.isArray(value)) {
          newState.targetColumnId = value;
        } else if (typeof value === "string" && value !== "") {
          // If it's a string (from Selector), convert to number
          const parsed = Number(value);
          newState.targetColumnId = Number.isNaN(parsed) ? value : parsed;
        } else if (value === "" || value === null || value === undefined) {
          newState.targetColumnId = null;
        } else {
          newState.targetColumnId = value;
        }
      } else {
        newState[field] = value;
      }

      // If condition_type changed, reset targetColumnId
      if (field === "condition_type" && prev.condition_type !== value) {
        newState.targetColumnId = null;
      }

      return newState as Rule;
    });

    if (error[field]) {
      setError((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Clear subject-related errors when subject field changes
    if (field === "subject" && (error.emailSubject || error.emailBody)) {
      setError((prev) => {
        const newErrors = { ...prev };
        delete newErrors.emailSubject;
        return newErrors;
      });
    }
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
  const handleFileAttachment = async (
    e: ChangeEvent<HTMLInputElement>,
    type: string
  ) => {
    handleFileSelection({
      event: e,
      formData,
      setFormData,
    });
  };

  const handleTemplateChange = (name: string, value: any) => {
    handleChange(name as keyof Rule, value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!formData.title || !formData.title.trim()) {
      newErrors.title = "Title is required.";
    }
    if (!formData.pipelineType) {
      newErrors.pipelineType = "Pipeline type is required.";
    }
    if (!Array.isArray(formData.tagIds) || formData.tagIds.length === 0) {
      newErrors.tagIds = "At least one tag is required.";
    }
    // if (!formData.funnel) {
    //   newErrors.funnel = "Funnel is required.";
    // }
    if (!formData.condition_type) {
      newErrors.condition = "Condition is required.";
    }

    // condition-specific
    if (formData.condition_type === "pipeline") {
      if (
        formData.targetColumnId === null ||
        formData.targetColumnId === undefined
      ) {
        newErrors.targetColumnId = "Action is required for pipeline condition.";
      }
    }
    if (formData.condition_type === "post-tag") {
      const actions = Array.isArray(formData.targetColumnId)
        ? formData.targetColumnId
        : formData.targetColumnId
          ? [formData.targetColumnId]
          : [];
      if (actions.length === 0) {
        newErrors.targetColumnId =
          "At least one tag is required for post-tag condition.";
      }
    }

    if (formData.condition_type === "communication") {
      if (formData.communicationType === "EMAIL") {
        const isSubjectEmpty = !formData.subject || !formData.subject.trim();
        const isBodyEmpty = !formData.emailBody || !formData.emailBody.trim();

        if (isSubjectEmpty && isBodyEmpty) {
          newErrors.emailBody = "Email subject and body are required.";
          newErrors.emailSubject = "Subject is required.";
        } else if (isSubjectEmpty) {
          newErrors.emailSubject = "Subject is required.";
          newErrors.emailBody = "Email subject is required.";
        } else if (isBodyEmpty) {
          newErrors.emailBody = "Email body is required.";
        }

        // if (company?.email === null) {
        //   newErrors.businessEmail = "You haven't added your business email.";
        //   errorToast(newError.businessEmail);
        // }
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setError(newErrors);
    }

    if (formData.timeDelay != null) {
      const seconds = parseTimeDelayToSeconds(formData.timeDelay!);
      formData.timeDelay = seconds;
    }

    try {
      const finalData = {
        ...formData,
        companyId: companyId,
      };

      createRule(finalData);
    } catch (err) {}
    setError({});
    // Submit formData to server or perform desired action
    console.log("Form Data Submitted:", formData);
  };

  const isCreatePending = false;
  const isUpdatePending = false;
  return (
    <div className="rounded-md border bg-white p-4 shadow-sm md:p-6">
      <Paper elevation={0} className="mx-auto max-w-lg rounded-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <SlimInput
            name="label"
            label="Title"
            placeholder="Enter rule title"
            value={formData?.title}
            labelClassName="text-gray-500"
            onChange={(e) => handleChange("title", e.target.value)}
            error={error.title}
            required
          />

          <Selector
            name="pipelineType"
            label="Pipeline Type"
            options={PipelineType}
            value={formData.pipelineType}
            onChange={(value) => handleChange("pipelineType", value)}
            required
            error={error.pipelineType}
          />

          {formData.pipelineType !== "" && (
            <MultiSelect
              options={
                formData.pipelineType === "SHOP"
                  ? shopTagOptions
                  : salesTagOptions
              }
              value={formData.tagIds}
              onChange={(value) => handleChange("tagIds", value)}
              label="Tag"
              isSearch
              placeholder={
                formData.pipelineType === "SHOP"
                  ? "Select shop tags"
                  : "Select sales tags"
              }
              required
              error={error.tagIds}
            />
          )}

          {/* <Selector
            name="funnel"
            label="Funnel"
            options={Funnels}
            value={formData.funnel}
            onChange={(value) => handleChange("funnel", value)}
            required
            placeholder="Select a funnel"
            error={error.funnel}
          /> */}
          <Selector
            name="delay"
            label="Time Delay"
            options={invoiceTimeDelays}
            value={formData.timeDelay!}
            onChange={(value) => handleChange("timeDelay", value)}
            required
            placeholder="Select a time delay"
          />
          <Selector
            name="condition"
            label="Condition"
            options={Conditions}
            value={formData.condition_type!}
            onChange={(value) => handleChange("condition_type", value)}
            required
            placeholder="Select a condition"
            error={error.condition_type}
          />

          {formData.condition_type === "pipeline" && (
            <Selector
              name="targetColumnId"
              label="Action"
              options={stages}
              value={
                Array.isArray(formData.targetColumnId)
                  ? undefined
                  : (formData.targetColumnId ?? undefined)
              }
              onChange={(value) => handleChange("targetColumnId", value)}
              required
              placeholder="Select a action"
              error={error.targetColumnId}
            />
          )}

          {formData.condition_type === "post-tag" && (
            <MultiSelect
              // For post-tag condition we need to pick stages (columns) from the pipeline
              options={stageOptions}
              value={
                Array.isArray(formData.targetColumnId)
                  ? formData.targetColumnId
                  : formData.targetColumnId
                    ? [formData.targetColumnId]
                    : []
              }
              onChange={(value) => handleChange("targetColumnId", value)}
              label="Select Stages to Trigger Rule"
              placeholder={
                formData.pipelineType === "SHOP"
                  ? "Select shop stages"
                  : "Select sales stages"
              }
              required
              error={error.targetColumnId}
            />
          )}

          {formData.condition_type === "communication" && (
            <>
              {/* Communication Type */}
              <CustomRadioGroup
                name="communicationType"
                label="Select Communication Type"
                value={formData.communicationType}
                onChange={handleChange}
                options={[
                  { label: "SMS", value: "SMS" },
                  { label: "Email", value: "EMAIL" },
                  { label: "Both", value: "BOTH" },
                ]}
              />

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
                  Send on weekdays Only
                </label>
              </div>
              {/* Send on office hours Only */}
              <div className="mb-3 flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isSendOfficeHours}
                  onChange={(e) =>
                    handleChange("isSendOfficeHours", e.target.checked)
                  }
                  className="mr-2"
                  id="isSendOfficeHours"
                />
                <label htmlFor="isSendOfficeHours" className="text-gray-500">
                  Send on office hours only
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
                        activeTemplate === "SMS" ? "EMAIL" : "SMS"
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
                      name="smsBody"
                      setFormData={setFormData}
                      value={formData.smsBody!}
                      iconBtnClassName="absolute -bottom-9 right-0"
                      attachments={formData.attachments}
                      attachmentName="attachments"
                      placeholder="Enter SMS template here..."
                      handleChange={handleTemplateChange}
                      handleFileAttachment={handleFileAttachment}
                      attachmentType="sms"
                      error={
                        error.smsBody || error.emailBody || error.emailSubject
                      }
                      maxLength={maxLength}
                      characterLength={length}
                      isLimitExceeded={isLimitExceeded}
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
                      name="emailBody"
                      setFormData={setFormData}
                      subjectValue={formData.subject!}
                      value={formData.emailBody!}
                      iconBtnClassName="absolute -bottom-16 right-0"
                      attachments={formData.attachments}
                      attachmentName="emailAttachment"
                      placeholder="Enter email body here..."
                      handleChange={handleTemplateChange}
                      handleFileAttachment={handleFileAttachment}
                      attachmentType="email"
                      error={
                        error.emailBody || error.emailSubject || error.smsBody
                      }
                      subjectError={!!error.emailSubject}
                      maxLength={maxLength}
                      characterLength={length}
                      isLimitExceeded={isLimitExceeded}
                    />
                  </Box>
                )}

                {/* Template Variables */}
                <TemplateVariable />
              </Box>
            </>
          )}

          {formData.condition_type === "post-tag" && (
            <CustomRadioGroup
              name="ruleType"
              label="Rule Type"
              value={formData.ruleType}
              onChange={handleChange}
              options={[
                { label: "One-time", value: "one-time" },
                {
                  label: "Recurring (after condition is met)",
                  value: "recurring",
                },
              ]}
            />
          )}

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isCreatePending || isUpdatePending || isLimitExceeded}
              className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
                isUpdatePending || isCreatePending || isLimitExceeded
                  ? "cursor-not-allowed bg-indigo-300"
                  : "bg-indigo-500 hover:bg-indigo-600"
              }`}
            >
              {isUpdatePending || isCreatePending
                ? isEdit && id
                  ? "Updating..."
                  : "Saving..."
                : isEdit && id
                  ? "Update"
                  : "Save"}
            </button>
          </div>
        </form>
      </Paper>
    </div>
  );
};

export default TagRuleForm;
