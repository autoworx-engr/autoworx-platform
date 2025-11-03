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
import { Tag } from "@prisma/client";
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

type Rule = {
  title: string;
  pipelineType: "sales" | "shop" | "";
  tagIds: number[];
  funnel: string;
  timeDelay: number | null | string;
  condition: "pipeline" | "communication" | "post-tag" | "";
  action: number | number[] | null;
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

const TagRuleForm = () => {
  const [formData, setFormData] = useState<Rule>({
    title: "",
    pipelineType: "",
    tagIds: [],
    funnel: "",
    timeDelay: null,
    condition: "",
    action: null,
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
       formData?.emailBody! || formData?.smsBody!,
       maxLength
     );
  const {
    stages,
    fetchStages,
    loading: stagesLoading,
  } = usePipelineStagesStore();
  useEffect(() => {
    const fetchTags = async () => {
      const res = await getSalesTags();
      if (res.type === "success" && res.data) setSalesTags(res.data);
    };
    fetchTags();
  }, []);
  useEffect(() => {
    const fetchInvoiceTags = async () => {
      const res = await getInvoiceTags();
      if (res.type === "success" && res.data) setShopTags(res.data);
    };
    fetchInvoiceTags();
  }, []);

  useEffect(() => {
    if (formData.pipelineType === "sales" || formData.pipelineType === "shop") {
      fetchStages(formData.pipelineType);
    }
  }, [formData.pipelineType, fetchStages]);

  const salesTagOptions = salesTags.map((tag) => ({
    id: tag.id,
    title: tag.name,
  }));
  const shopTagOptions = shopTags.map((tag) => ({
    id: tag.id,
    title: tag.name,
  }));

  const handleChange = (field: keyof Rule, value: any) => {
    setFormData((prev) => {
      const newState: any = { ...prev };

      // Normalize action value depending on the field source
      if (field === "action") {
        // If the incoming value is an array (from MultiSelect), use it directly
        if (Array.isArray(value)) {
          newState.action = value;
        } else if (typeof value === "string" && value !== "") {
          // If it's a string (from Selector), convert to number
          const parsed = Number(value);
          newState.action = Number.isNaN(parsed) ? value : parsed;
        } else if (value === "" || value === null || value === undefined) {
          newState.action = null;
        } else {
          newState.action = value;
        }
      } else {
        newState[field] = value;
      }

      // If condition changed, reset action
      if (field === "condition" && prev.condition !== value) {
        newState.action = null;
      }

      return newState as Rule;
    });
  };

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
      // This cast is safe because we're only passing valid keys from the ActiveTemplate component
      handleChange(name as keyof Rule, value);
    };

    const isEdit = false;
    const id = null;
    const isCreatePending = false;
    const isUpdatePending = false;
  return (
    <div className="rounded-md border bg-white p-4 shadow-sm md:p-6">
      <Paper elevation={0} className="mx-auto max-w-lg rounded-lg">
      <form action="" className="space-y-4">
        <SlimInput
          name="label"
          label="Title"
          placeholder="Enter rule title"
          value={formData?.title}
          labelClassName="text-gray-500"
          onChange={(e) => handleChange("title", e.target.value)}
        />

        <Selector
          name="pipelineType"
          label="Pipeline Type"
          options={PipelineType}
          value={formData.pipelineType}
          onChange={(value) => handleChange("pipelineType", value)}
          required
        />

        {formData.pipelineType !== "" && (
          <MultiSelect
            options={
              formData.pipelineType === "shop"
                ? shopTagOptions
                : salesTagOptions
            }
            value={formData.tagIds}
            onChange={(value) => handleChange("tagIds", value)}
            label="Tag"
            placeholder={
              formData.pipelineType === "shop"
                ? "Select shop tags"
                : "Select sales tags"
            }
            required
          />
        )}

        <Selector
          name="funnel"
          label="Funnel"
          options={Funnels}
          value={formData.funnel}
          onChange={(value) => handleChange("funnel", value)}
          required
          placeholder="Select a funnel"
        />
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
          value={formData.condition!}
          onChange={(value) => handleChange("condition", value)}
          required
          placeholder="Select a condition"
        />

        {formData.condition === "pipeline" && (
          <Selector
            name="action"
            label="Action"
            options={stages}
            value={
              Array.isArray(formData.action)
                ? undefined
                : (formData.action ?? undefined)
            }
            onChange={(value) => handleChange("action", value)}
            required
            placeholder="Select a action"
          />
        )}

        {formData.condition === "post-tag" && (
          <MultiSelect
            options={stages}
            value={
              Array.isArray(formData.action)
                ? formData.action
                : formData.action
                  ? [formData.action]
                  : []
            }
            onChange={(value) => handleChange("action", value)}
            label="Tag"
            placeholder={
              formData.pipelineType === "shop"
                ? "Select shop tags"
                : "Select sales tags"
            }
            required
          />
        )}

        {formData.condition === "communication" && (
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
                                  // error={
                                  //   error.smsBody || error.emailBody || error.emailSubject
                                  // }
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
                                  // error={
                                  //   error.emailBody || error.emailSubject || error.smsBody
                                  // }
                                  // subjectError={!!error.emailSubject}
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

        {formData.condition === "post-tag" &&(
          <CustomRadioGroup
                            name="ruleType"
                            label="Rule Type"
                            value={formData.ruleType}
                            onChange={handleChange}
                            options={[
                              { label: "One-time", value: "one-time" },
                              { label: "Recurring (after condition is met)", value: "recurring" },
                             
                            ]}
                          />
        )}

        <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={
                      isCreatePending || isUpdatePending || isLimitExceeded
                    }
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
