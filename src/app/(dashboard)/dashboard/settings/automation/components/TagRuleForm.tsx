"use client";
import { getInvoiceTags } from "@/actions/pipelines/invoiceTag";
import { getSalesTags } from "@/actions/pipelines/leadTag";
import { SlimInput } from "@/components/SlimInput";
import { useAllTagAutomationRules } from "@/hooks/tag-automation/useAllTagAutomationRules";
import { usePipelineStagesStore } from "@/stores/pipelineStagesStore";
import { TAttachments } from "@/types/automation";
import { Box, Paper, Switch, Typography } from "@mui/material";
import { Company, InfobipConfig, Tag, TwilioCredentials } from "@prisma/client";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import ActiveTemplate from "./ActiveTemplate";
import CustomRadioGroup from "./CustomRadioGroup";
import MultiSelect from "./MultiSelect";
import Selector from "./Selector";
import { Conditions, invoiceTimeDelays, PipelineType } from "./constants";

import { useCreateTagAutomationRule } from "@/hooks/tag-automation/useCreateTagAutomationRule";
import { useCharacterLimit } from "@/hooks/useCharecterLimit";
import {
  handleFileSelection,
  uploadAllAttachments,
} from "@/utils/handleFileAttachment";

import { useFindOneTagAutomationRule } from "@/hooks/tag-automation/useFindOneTagAutomationRule";
import { useUpdateTagAutomationRule } from "@/hooks/tag-automation/useUpdateTagAutomationRule";

import { AppointmentTemplateVariable } from "@/components/Lists/NewTemplate";
import { errorToast } from "@/lib/toast";
import {
  convertSecondsToTime,
  convertTimeToSeconds,
} from "@/utils/timeConvertToSeconds";
import CarLoading from "@/components/common/CarLoading";
import InfoCard from "./InfoCard";
import { getConditionHelp, TipBox } from "./TagautomationHelper";
import { TEMPLATE_VARIABLES } from "./TemplateVariable";
import TooltipLabel from "./ToolTipLabel";

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
  timeDelay: number | null | string;
  condition_type: "pipeline" | "communication" | "post_tag" | "";
  targetColumnId: number | number[] | null;
  columnIds?: number[];
  communicationType: "SMS" | "EMAIL" | "BOTH";
  templateType?: "SMS" | "EMAIL";
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
  const [initialFormData, setInitialFormData] = useState<Rule | null>(null);
  const [formData, setFormData] = useState<Rule>({
    companyId: companyId,
    title: "",
    pipelineType: "",
    tagIds: [],
    timeDelay: null,
    condition_type: "",
    targetColumnId: null,
    columnIds: [],
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
    maxLength,
  );

  const helpContent = getConditionHelp(formData.condition_type);
  const [showGuide, setShowGuide] = useState(true);
  const [error, setError] = useState<Record<string, string>>({});

  const isFormUnchanged = useMemo(() => {
    if (!initialFormData) return false;
    return JSON.stringify(formData) === JSON.stringify(initialFormData);
  }, [formData, initialFormData]);
  const {
    stages,
    fetchStages,
    loading: stagesLoading,
  } = usePipelineStagesStore();

  const { mutate: createRule, isPending: isCreatePending } =
    useCreateTagAutomationRule();
  const { data, isLoading, isFetching } = useFindOneTagAutomationRule(
    Number(id),
  );
  const { mutate: updateRule, isPending: isUpdatePending } =
    useUpdateTagAutomationRule();

  const { data: allTagAutomationData, isLoading: isAllTagRuleLoading } =
    useAllTagAutomationRules(Number(companyId), true);

  useEffect(() => {
    const loadData = async () => {
      if (isEdit && id && data && data.data) {
        const payload = data.data;

        const timeDelay = convertSecondsToTime(payload?.timeDelay);

        // derive pipelineType in uppercase to match form enum (only allow SALES or SHOP)
        const rawPipeline = payload.pipelineType
          ? String(payload.pipelineType).toUpperCase()
          : "";
        const pipelineTypeValue: Rule["pipelineType"] =
          rawPipeline === "SALES"
            ? "SALES"
            : rawPipeline === "SHOP"
              ? "SHOP"
              : "";

        // derive columnIds: prefer explicit columnIds, fall back to stages' columnId or stage ids
        let columnIds: number[] = [];
        if (Array.isArray(payload.columnIds) && payload.columnIds.length > 0) {
          columnIds = payload.columnIds;
        } else if (Array.isArray(payload.stages) && payload.stages.length > 0) {
          // stages may contain columnId or id
          columnIds = payload.stages
            .map((s: any) => s.columnId ?? s.id)
            .filter((v: any) => typeof v === "number");
        }

        const tagAutomationCommunication =
          payload.tagAutomationCommunication || {};
        const tagAutomationPipeline = payload.tagAutomationPipeline || {};
        const tagAutomationPostTag = payload.PostTagAutomationColumn || {};
        const initialData: Rule = {
          companyId: payload.companyId ?? companyId,
          title: payload.title ?? "",
          pipelineType: pipelineTypeValue,
          tagIds: payload.tag.map((tag: any) => tag.id),
          timeDelay:
            data?.data?.timeDelay === "Instant"
              ? data?.data?.timeDelay
              : timeDelay,
          condition_type: payload.condition_type ?? payload.conditionType ?? "",
          targetColumnId:
            tagAutomationPipeline !== undefined &&
            tagAutomationPipeline !== null
              ? Number(tagAutomationPipeline?.targetColumnId)
              : null,
          columnIds:
            tagAutomationPostTag?.columnIds?.map((item: any) => item?.id) || [],
          communicationType:
            tagAutomationCommunication?.communicationType ?? "SMS",
          // templateType: payload.templateType ?? "SMS",
          isSendWeekDays: !!tagAutomationCommunication?.isSendWeekDays,
          isSendOfficeHours: !!tagAutomationCommunication?.isSendOfficeHours,
          subject: tagAutomationCommunication?.subject ?? "",
          emailBody: tagAutomationCommunication?.emailBody ?? "",
          smsBody: tagAutomationCommunication?.smsBody ?? "",
          attachments: tagAutomationCommunication?.attachments ?? [],
          ruleType: payload.ruleType ?? "",
        };
        setFormData(initialData);
        setInitialFormData(initialData);

        setActiveTemplate(
          tagAutomationCommunication?.communicationType === "BOTH" ||
            !tagAutomationCommunication?.communicationType
            ? "SMS"
            : tagAutomationCommunication.communicationType,
        );
      } else {
        const initialData: Rule = {
          companyId: companyId,
          title: "",
          pipelineType: "",
          tagIds: [],
          timeDelay: null,
          condition_type: "",
          targetColumnId: null,
          columnIds: [],
          communicationType: "SMS",
          templateType: "SMS",
          isSendWeekDays: false,
          isSendOfficeHours: false,
          subject: "",
          emailBody: "",
          smsBody: "",
          attachments: [],
          ruleType: "",
        };
        setFormData(initialData);
        setInitialFormData(initialData);
      }
    };

    loadData();
  }, [isEdit, id, data, companyId]);
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
    const pipelineTypeLower = String(formData.pipelineType || "").toLowerCase();
    // fetch stages for both sales and shop pipelines
    if (pipelineTypeLower === "sales" || pipelineTypeLower === "shop") {
      fetchStages(pipelineTypeLower);
    }
  }, [formData.pipelineType, fetchStages]);

  // Prepare tag options for MultiSelect
  const salesTagOptions = salesTags.map((tag) => ({
    id: tag.id,
    title: tag.name,
  }));

  const shopTagOptions = shopTags.map((tag) => ({
    id: tag.id,
    title: tag.name,
  }));

  const usedTagIds = new Set<number>();
  allTagAutomationData?.data.forEach((rule: any) => {
    try {
      const ruleCondition = rule.condition_type || rule.conditionType;
      if (
        ruleCondition &&
        formData.condition_type &&
        ruleCondition === formData.condition_type
      ) {
        (rule.tag || []).forEach((t: any) => {
          if (t && t.id) usedTagIds.add(Number(t.id));
        });
      }
    } catch (e) {
      errorToast("Something went wrong!");
    }
  });

  // If editing, allow tags already present on the current rule
  const currentRuleTagIds = new Set<number>(
    (data?.data?.tag || []).map((t: any) => Number(t.id)),
  );

  const filteredSalesTagOptions = salesTagOptions.filter(
    (opt) =>
      !usedTagIds.has(Number(opt.id)) || currentRuleTagIds.has(Number(opt.id)),
  );

  const filteredShopTagOptions = shopTagOptions.filter(
    (opt) =>
      !usedTagIds.has(Number(opt.id)) || currentRuleTagIds.has(Number(opt.id)),
  );

  // Stage options for post-tag condition_type (stages are fetched based on pipelineType)
  const stageOptions = stages.map((s: any) => ({
    id: s.id,
    title: s.title || s.name,
  }));

  // Handle form field changes
  const handleChange = (field: keyof Rule, value: any) => {
    setFormData((prev) => {
      const newState: any = { ...prev };

      // Normalize targetColumnId / columnIds value depending on the field source
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
      }

      if (field === "columnIds") {
        // columnIds should always be an array (from MultiSelect)
        if (Array.isArray(value)) {
          newState.columnIds = value;
        } else if (value === null || value === undefined) {
          newState.columnIds = [];
        } else {
          // coerce single value to array
          newState.columnIds = [value];
        }
      } else {
        newState[field] = value;
      }

      if (field === "communicationType" && prev.communicationType !== value) {
        if (value === "EMAIL") newState.templateType = "EMAIL";
        else if (value === "SMS") newState.templateType = "SMS";
      }

      // If condition_type changed, reset targetColumnId and columnIds
      if (field === "condition_type" && prev.condition_type !== value) {
        newState.targetColumnId = null;
        newState.columnIds = [];
      }

      // If pipelineType changed, reset selected tags so selections don't leak between pipelines
      if (field === "pipelineType" && prev.pipelineType !== value) {
        newState.tagIds = [];
        // also reset any pipeline-specific selections
        newState.targetColumnId = null;
        newState.columnIds = [];
      }

      return newState as Rule;
    });

    if (field === "communicationType") {
      if (value === "EMAIL") setActiveTemplate("EMAIL");
      else if (value === "SMS") setActiveTemplate("SMS");
    }

    if (field === "condition_type" && value === "communication") {
      setActiveTemplate((prev) => (prev === "EMAIL" ? "EMAIL" : "SMS"));
    }

    if (error[field]) {
      setError((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Clear subject-related errors when subject field changes
    if (field === "subject" && (error.subject || error.emailBody)) {
      setError((prev) => {
        const newErrors = { ...prev };
        delete newErrors.subject;
        return newErrors;
      });
    }
  };

  // Handle template toggle
  const handleTemplateToggle = (template: "SMS" | "EMAIL") => {
    setActiveTemplate(template);

    setFormData((prev) => ({ ...prev, templateType: template }));
  };

  // Handle file attachment
  const handleFileAttachment = async (
    e: ChangeEvent<HTMLInputElement>,
    type: string,
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

  const handleSubmit = async (e: React.FormEvent) => {
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
    if (!formData.condition_type) {
      newErrors.condition_type = "Condition is required.";
    }

    if (
      formData.timeDelay === null ||
      formData.timeDelay === undefined ||
      String(formData.timeDelay).trim() === ""
    ) {
      newErrors.timeDelay = "Time delay is required.";
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
    if (formData.condition_type === "post_tag") {
      const actions = Array.isArray(formData.columnIds)
        ? formData.columnIds
        : formData.columnIds
          ? formData.columnIds
          : [];
      if (actions.length === 0) {
        newErrors.columnIds =
          "At least one stage is required for post-tag condition.";
      }
    }

    if (formData.condition_type === "communication") {
      if (formData.communicationType === "EMAIL") {
        const isSubjectEmpty = !formData.subject || !formData.subject.trim();
        const isBodyEmpty = !formData.emailBody || !formData.emailBody.trim();

        if (isSubjectEmpty && isBodyEmpty) {
          newErrors.emailBody = "Email subject and body are required.";
          newErrors.subject = "Subject is required.";
        } else if (isSubjectEmpty) {
          newErrors.subject = "Subject is required.";
          newErrors.emailBody = "Email subject is required.";
        } else if (isBodyEmpty) {
          newErrors.emailBody = "Email body is required.";
        }

        if (company?.email === null) {
          newErrors.businessEmail = "You haven't added your business email.";
          errorToast(newErrors.businessEmail);
        }
      }

      if (formData.communicationType === "BOTH") {
        if (!formData.subject || !formData.subject.trim()) {
          newErrors.subject = "Subject is required.";
          newErrors.emailBody = "Subject is required.";
        }

        if (!formData.emailBody || !formData.emailBody.trim()) {
          newErrors.emailBody = "Email body is required.";
        }
        if (!formData.smsBody || !formData.smsBody.trim()) {
          newErrors.smsBody = "SMS body is required.";
        }

        if (company?.email === null) {
          newErrors.businessEmail = "You haven't added your business email.";
          errorToast(newErrors.businessEmail);
        }

        if (twilio === null) {
          newErrors.twilio = "SMS gateway not available";
          errorToast(newErrors.twilio);
        }
      }
      if (formData.communicationType === "SMS") {
        if (!formData.smsBody || !formData.smsBody.trim()) {
          newErrors.smsBody = "SMS body is required.";
        }

        if (twilio === null) {
          newErrors.twilio = "SMS gateway not configured";
          errorToast(newErrors.twilio);
        }
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setError(newErrors);
      return;
    }

    // Parse selected timeDelay (label or option id) without mutating form state
    const parseSelectedTimeDelay = (value: any) => {
      if (value === null || value === undefined || value === "") return null;

      const optId = (o: any) =>
        o && typeof o === "object" && "id" in o ? o.id : o;
      const optTitle = (o: any) =>
        o && typeof o === "object" && "title" in o ? o.title : o;

      const match = invoiceTimeDelays.find(
        (o: any) =>
          String(optId(o)) === String(value) ||
          String(optTitle(o)) === String(value),
      );
      if (match) {
        const idVal = optId(match);
        const n = Number(idVal);
        if (!Number.isNaN(n)) return n;
        return convertTimeToSeconds(String(optTitle(match)));
      }

      const n = Number(value);
      if (!Number.isNaN(n)) return n;
      return convertTimeToSeconds(String(value));
    };

    const parsedTimeDelay = parseSelectedTimeDelay(formData.timeDelay);

    try {
      const uploadedAttachments = await uploadAllAttachments(
        formData.attachments!,
      );

      const images = uploadedAttachments.map((img) => ({ fileUrl: img })) || [];

      // Prepare final payload
      const finalData: any = {
        ...formData,
        companyId: companyId,
        timeDelay: parsedTimeDelay,
        attachments: images,
        ruleType: formData.ruleType ? formData.ruleType : "one_time",
      };

      // Ensure `templateType` is never sent to the API during update/create
      if (
        finalData &&
        Object.prototype.hasOwnProperty.call(finalData, "templateType")
      ) {
        delete finalData.templateType;
      }

      if (
        finalData.condition_type === "pipeline" &&
        finalData.targetColumnId !== null &&
        finalData.targetColumnId !== undefined
      ) {
        finalData.targetColumnId = Number(finalData.targetColumnId);
      }

      // columnIds should be an array of numbers for post_tag
      if (finalData.condition_type === "post_tag") {
        finalData.columnIds = Array.isArray(finalData.columnIds)
          ? finalData.columnIds.map((v: any) => Number(v))
          : [];
      } else {
        // if not post_tag, ensure columnIds is empty
        delete finalData.columnIds;
      }

      if (isEdit && id) {
        // Update existing rule
        updateRule({
          id: String(id),
          companyId: String(companyId),
          data: finalData,
        });
      } else {
        createRule(finalData);
      }
    } catch (err) {
      errorToast("Something went wrong!");
    }
    setError({});
  };

  if (isLoading || isFetching || stagesLoading || isAllTagRuleLoading) {
    return (
      <div className="flex h-[800px] w-full animate-pulse items-center justify-center rounded-md bg-gray-200 p-4 shadow-sm md:p-6">
        <CarLoading />
      </div>
    );
  }
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
          <div className="relative">
            <TooltipLabel
              label="Condition"
              tooltipText={
                <div className="space-y-1 py-1">
                  <p className="font-semibold">Three types of conditions:</p>
                  <p>
                    <strong>Pipeline:</strong> Move lead to another column
                  </p>
                  <p>
                    <strong>Communication:</strong> Send message to client
                  </p>
                  <p>
                    <strong>Post-Tag:</strong> Add tags after reaching column
                  </p>
                </div>
              }
              required
              icon="question"
            />
            <Selector
              name="condition_type"
              label="Condition"
              options={Conditions}
              value={formData.condition_type!}
              onChange={(value) => handleChange("condition_type", value)}
              required
              placeholder="Select a condition"
              error={error.condition_type}
              labelClassName="hidden"
            />

            {helpContent && (
              <InfoCard
                icon={helpContent.icon}
                title={helpContent.title}
                description={helpContent.desc}
                bgColor={helpContent.bgColor}
                borderColor={helpContent.borderColor}
                textColor={helpContent.textColor}
              />
            )}
          </div>
          {formData.pipelineType !== "" && (
            <MultiSelect
              options={
                formData.pipelineType === "SHOP"
                  ? filteredShopTagOptions
                  : filteredSalesTagOptions
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
            error={error.timeDelay}
          />

          {/* {formData.condition_type === "pipeline" && (
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
          )} */}

          {formData.condition_type === "pipeline" && (
            <Selector
              key={`action-selector-${formData.pipelineType}`}
              name="targetColumnId"
              label="Action"
              options={stageOptions}
              value={
                typeof formData.targetColumnId === "number"
                  ? formData.targetColumnId
                  : undefined
              }
              onChange={(value) => handleChange("targetColumnId", value)}
              required
              placeholder="Select an action"
              error={error.targetColumnId}
            />
          )}
          {formData.condition_type === "post_tag" && (
            <div>
              <MultiSelect
                key={`stage-multiselect-${formData.pipelineType}`}
                // For post-tag condition we need to pick stages (columns) from the pipeline
                options={stageOptions}
                value={formData.columnIds || []}
                onChange={(value) => handleChange("columnIds", value)}
                label="Select Stages to Trigger Rule"
                placeholder={
                  formData.pipelineType === "SHOP"
                    ? "Select shop stages"
                    : "Select sales stages"
                }
                required
                error={error.columnIds}
                disabled={stagesLoading}
              />
              <TipBox message="When a lead reaches this column, the selected tags will be automatically added to it." />
            </div>
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
                      error={error.smsBody || error.emailBody || error.subject}
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
                      error={error.emailBody || error.subject || error.smsBody}
                      subjectError={!!error.subject}
                      maxLength={maxLength}
                      characterLength={length}
                      isLimitExceeded={isLimitExceeded}
                    />
                  </Box>
                )}

                {/* Template Variables */}
                {/* <TemplateVariable /> */}
                <AppointmentTemplateVariable
                  VARIABLES={TEMPLATE_VARIABLES}
                  hasBackground={true}
                />
              </Box>
            </>
          )}

          {formData.condition_type === "post_tag" && (
            <div className="relative">
              <TooltipLabel
                label="Rule Type"
                tooltipText="One-time: tags added only once. Recurring: tags added every time the condition is met"
              />
              <CustomRadioGroup
                name="ruleType"
                value={formData.ruleType}
                onChange={handleChange}
                options={[
                  { label: "One-time", value: "one_time" },
                  {
                    label: "Recurring (after condition is met)",
                    value: "recurring",
                  },
                ]}
              />
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={
                isCreatePending ||
                isUpdatePending ||
                isLimitExceeded ||
                isFormUnchanged
              }
              className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
                isUpdatePending ||
                isCreatePending ||
                isLimitExceeded ||
                isFormUnchanged
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
