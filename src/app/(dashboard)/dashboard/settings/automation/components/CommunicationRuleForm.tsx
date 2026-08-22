"use client";
import React, { useState, useEffect, ChangeEvent, useMemo } from "react";
import Selector from "./Selector";
import { Box, Paper, Typography, Switch } from "@mui/material";
import MultiSelect from "./MultiSelect";
import { SlimInput } from "@/components/SlimInput";
import ActiveTemplate from "./ActiveTemplate";
import { usePipelineStagesStore } from "@/stores/pipelineStagesStore";
import { timeDelays } from "./constants";
import { errorToast } from "@/lib/toast";
import { parseTimeDelayToSeconds } from "@/utils/parseTimeDelayToSeconds";
import { useCreateCommunicationAutomationRule } from "@/hooks/communication-automation/useCreateCommunicationAutomationRule";
import { useUpdateCommunicationAutomationRule } from "@/hooks/communication-automation/useUpdateCommunicationAutomationRule";
import { useFindOneCommunicationAutomationRule } from "@/hooks/communication-automation/useFindOneCommunicationAutomationRule";
import { Spin } from "antd";
import { parseSecondsToTimeDelay } from "@/utils/parseSecondsToTimeDelay";
import { TAttachments } from "@/types/automation";
import {
  handleFileSelection,
  uploadAllAttachments,
} from "@/utils/handleFileAttachment";
import CustomRadioGroup from "./CustomRadioGroup";
import { Company, TwilioCredentials, InfobipConfig } from "@prisma/client";
import { useCharacterLimit } from "@/hooks/useCharecterLimit";
import CarLoading from "@/components/common/CarLoading";
import { AppointmentTemplateVariable } from "@/components/Lists/NewTemplate";
import TooltipLabel from "./ToolTipLabel";
import { ArrowRight } from "lucide-react";
import { TipBox } from "./TagautomationHelper";
import { TEMPLATE_VARIABLES } from "./TemplateVariable";

type RuleFormProps = {
  mode: "create" | "edit" | undefined;
  id?: string | null;
  isEdit: boolean;
  companyId: any;
  user: any;
  company: Company;
  twilio: TwilioCredentials | InfobipConfig | null;
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
  isSendOfficeHours: boolean;
  subject?: string | null;
  emailBody?: string | null;
  smsBody?: string | null;
  attachments?: TAttachments | [];
  targetColumnId: number | null;
  createdBy: string | null;
  isPaused?: boolean;
};

const CommunicationRuleForm: React.FC<RuleFormProps> = ({
  mode,
  id,
  isEdit,
  companyId,
  user,
  company,
  twilio,
}) => {
  const [initialFormData, setInitialFormData] = useState<Rule | null>(null);
  const [formData, setFormData] = useState<Rule>({
    companyId: null,
    title: "",
    stages: [],
    timeDelay: null,
    communicationType: "SMS",
    templateType: "SMS",
    isSendWeekDays: false,
    isSendOfficeHours: false,
    subject: "",
    emailBody: "",
    smsBody: "",
    attachments: [],
    createdBy: null,
    targetColumnId: null,
  });
  const {
    stages,
    fetchStages,
    loading: stagesLoading,
  } = usePipelineStagesStore();

  const actionOptions = stages.filter(
    (stage) => !formData.stages?.includes(stage.id),
  );

  const [activeTemplate, setActiveTemplate] = useState<"SMS" | "EMAIL">("SMS");
  const { mutate: createRule, isPending: isCreatePending } =
    useCreateCommunicationAutomationRule();
  const { mutate: updateRule, isPending: isUpdatePending } =
    useUpdateCommunicationAutomationRule();
  const { data, isLoading, isFetching } = useFindOneCommunicationAutomationRule(
    Number(id),
  );
  const [error, setError] = useState<Record<string, string>>({});
  const userEmail = user?.email;
  const maxLength = 300;
  const { length, isLimitExceeded } = useCharacterLimit(
    formData?.emailBody! || formData?.smsBody!,
    maxLength,
  );

  useEffect(() => {
    const loadData = async () => {
      if (isEdit && id) {
        const timeDelay = parseSecondsToTimeDelay(data?.data?.timeDelay);
        const initialData: Rule = {
          companyId: data?.data.companyId,
          title: data?.data.title,
          stages: data?.data?.stages?.map((stage: any) => stage.columnId),
          timeDelay: timeDelay,
          communicationType: data?.data.communicationType,
          templateType: data?.data.templateType,
          isSendWeekDays: data?.data.isSendWeekDays ?? false,
          isSendOfficeHours: data?.data.isSendOfficeHours ?? false,
          subject: data?.data.subject,
          emailBody: data?.data.emailBody,
          smsBody: data?.data.smsBody,
          attachments: data?.data.attachments,
          createdBy: data?.data.createdBy,
          targetColumnId:
            data?.data.targetColumnId == 0
              ? null
              : data?.data.targetColumnId?.toString() || null,
        };
        setFormData(initialData);
        setInitialFormData(initialData);
        setActiveTemplate(data?.data.templateType);
        // setLoading(false);
      } else {
        const initialData: Rule = {
          companyId: null,
          title: "",
          stages: [],
          timeDelay: null,
          communicationType: "SMS",
          templateType: "SMS",
          isSendWeekDays: false,
          isSendOfficeHours: false,
          subject: "",
          emailBody: "",
          smsBody: "",
          attachments: [],
          createdBy: null,
          targetColumnId: null,
        };
        setFormData(initialData);
        setInitialFormData(initialData);
      }
    };
    loadData();
  }, [isEdit, id, data?.data, mode]);

  useEffect(() => {
    fetchStages("sales");
  }, [fetchStages]);

  // Handle input changes
  const handleChange = (field: keyof Rule, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === "communicationType") {
      if (value === "SMS") setActiveTemplate("SMS");
      if (value === "EMAIL") setActiveTemplate("EMAIL");
    }
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

  const isFormUnchanged = useMemo(() => {
    if (!initialFormData) return false;
    return JSON.stringify(formData) === JSON.stringify(initialFormData);
  }, [formData, initialFormData]);

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
    type: string,
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

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const errors: string[] = [];
    const newError: Record<string, string> = {};

    if (!formData.title || !formData.title.trim())
      newError.title = "Title is required.";
    if (!Array.isArray(formData.stages) || formData?.stages?.length === 0) {
      newError.stages = "At least one stage is required.";
    }
    if (formData.timeDelay === null)
      newError.timeDelay = "Time delay is required.";

    if (!formData.templateType) errors.push("Template type is required.");

    if (!formData.communicationType)
      errors.push("Communication type is required.");

    if (formData.communicationType === "EMAIL") {
      const isSubjectEmpty = !formData.subject || !formData.subject.trim();
      const isBodyEmpty = !formData.emailBody || !formData.emailBody.trim();

      if (isSubjectEmpty && isBodyEmpty) {
        newError.emailBody = "Email subject and body are required.";
        newError.emailSubject = "Subject is required.";
      } else if (isSubjectEmpty) {
        newError.emailSubject = "Subject is required.";
        newError.emailBody = "Email subject is required.";
      } else if (isBodyEmpty) {
        newError.emailBody = "Email body is required.";
      }

      if (company?.email === null) {
        newError.businessEmail = "You haven't added your business email.";
        errorToast(newError.businessEmail);
      }
    }

    if (formData.communicationType === "BOTH") {
      const isSubjectEmpty = !formData.subject || !formData.subject.trim();
      const isBodyEmpty = !formData.emailBody || !formData.emailBody.trim();

      if (isSubjectEmpty && isBodyEmpty) {
        newError.emailBody = "Email subject and body are required.";
        newError.emailSubject = "Subject is required.";
      }
      if (isSubjectEmpty) {
        newError.emailSubject = "Subject is required.";
        newError.emailBody = "Subject is required.";
      }
      if (isBodyEmpty) {
        newError.emailBody = "Email body is required.";
      }

      if (!formData.smsBody || !formData.smsBody.trim()) {
        newError.smsBody = "SMS body is required.";
      }

      if (company?.email === null) {
        newError.businessEmail = "You haven't added your business email.";
        errorToast(newError.businessEmail);
      }

      if (twilio === null) {
        newError.twilio = "SMS gateway not available";
        errorToast(newError.twilio);
      }
    }
    if (formData.communicationType === "SMS") {
      if (!formData.smsBody || !formData.smsBody.trim()) {
        newError.smsBody = "SMS body is required.";
      }

      if (twilio === null) {
        newError.twilio = "SMS gateway not available";
        errorToast(newError.twilio);
      }
    }

    if (errors.length > 0) {
      errors.forEach((err) => errorToast(err));

      return;
    }

    if (Object.keys(newError).length > 0) {
      setError(newError);

      return;
    }

    try {
      // Build transformed copy first
      const preparedData = {
        ...formData,
        timeDelay:
          formData.timeDelay != null
            ? parseTimeDelayToSeconds(formData.timeDelay)
            : null,
        targetColumnId:
          formData.targetColumnId != null
            ? Number(formData.targetColumnId)
            : null,
      };

      // Upload attachments
      const uploadedAttachments = await uploadAllAttachments(
        preparedData.attachments || [],
      );

      const images = uploadedAttachments.map((img) => ({
        fileUrl: img,
      }));

      // Build final payload
      const finalData = {
        ...preparedData,
        createdBy: userEmail,
        companyId,
        attachments: images,
      };

      if (isEdit && id) {
        const updatePayload = {
          ...finalData,
          isPaused: false,
          targetColumnId:
            finalData.targetColumnId === 0 ? null : finalData.targetColumnId,
        };

        updateRule({
          id,
          companyId,
          data: updatePayload,
        });
      } else {
        createRule(finalData);

        setFormData({
          companyId: null,
          title: "",
          stages: [],
          timeDelay: null,
          communicationType: "SMS",
          templateType: "SMS",
          isSendWeekDays: false,
          isSendOfficeHours: false,
          subject: "",
          emailBody: "",
          smsBody: "",
          attachments: [],
          createdBy: null,
          targetColumnId: null,
        });

        setActiveTemplate("SMS");
      }
    } catch (error) {
      errorToast("Something went wrong!");
    }
  };

  return (
    <>
      {isLoading || isFetching || stagesLoading ? (
        <div className="flex h-[800px] w-full animate-pulse items-center justify-center rounded-md bg-gray-200 p-4 shadow-sm md:p-6">
          <CarLoading />
        </div>
      ) : (
        <div>
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
                  required
                  error={error.title}
                />

                {/* Stage */}
                <div>
                  <TooltipLabel
                    label="Stage"
                    tooltipText={
                      <div className="space-y-1">
                        <p className="font-semibold mb-1">
                          Select source stages:
                        </p>
                        <p>
                          Choose one or multiple stages where leads will trigger
                          this automation.
                        </p>
                        <p className="mt-2">
                          <strong>Example:</strong> Select "Lead Lost" and "New
                          Leads" to monitor leads in both stages.
                        </p>
                      </div>
                    }
                    required
                    icon="question"
                  />
                  <MultiSelect
                    options={stages}
                    value={formData.stages}
                    onChange={(value) => handleChange("stages", value)}
                    placeholder="Select options"
                    required
                    error={error.stages}
                    labelClassName="hidden"
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
                  error={error.timeDelay}
                />

                {/* Action */}
                <div>
                  <TooltipLabel
                    label="Action"
                    tooltipText={
                      <div className="space-y-1">
                        <p className="font-semibold mb-1">
                          Destination column:
                        </p>
                        <p>
                          Choose which column leads should move to when the
                          condition is met.
                        </p>
                        <p className="mt-2">
                          <strong>Note:</strong> Stages selected in the "Stage"
                          field are automatically excluded to prevent loops.
                        </p>
                      </div>
                    }
                    // required
                    icon="question"
                  />
                  <Selector
                    name="action"
                    options={actionOptions}
                    value={formData.targetColumnId!}
                    onChange={(value) => handleChange("targetColumnId", value)}
                    isClear={true}
                    labelClassName="hidden"
                  />

                  {formData?.stages?.length > 0 && formData.targetColumnId && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded flex items-center gap-2 text-xs text-green-900">
                      <ArrowRight className="w-4 h-4 flex-shrink-0" />
                      <span>
                        A lead in "
                        {formData.stages
                          .map((id) => stages.find((s) => s.id === id)?.title)
                          .join(", ")}{" "}
                        {}
                        will move to "
                        {
                          stages.find(
                            (s) => s.id === Number(formData?.targetColumnId),
                          )?.title
                        }
                        " when the condition is met.
                      </span>
                    </div>
                  )}
                </div>

                {/* Communication Type */}
                <div>
                  <TooltipLabel
                    label="Select Communication Type"
                    tooltipText="Choose how you want to send message: SMS for quick messages, Email for detailed content, or Both for maximum reach."
                  />
                  <CustomRadioGroup
                    name="communicationType"
                    value={formData.communicationType}
                    onChange={handleChange}
                    options={[
                      { label: "SMS", value: "SMS" },
                      { label: "Email", value: "EMAIL" },
                      { label: "Both", value: "BOTH" },
                    ]}
                  />
                </div>

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
                  <AppointmentTemplateVariable
                    VARIABLES={TEMPLATE_VARIABLES}
                    hasBackground={true}
                  />
                  <TipBox
                    message="Click any variable to copy it, then paste it into your template where you want the dynamic content to appear. For example: 'Hi <CLIENT>, your invoice is ready: <INVOICE_LINK>'"
                    variant="info"
                  />
                </Box>

                {/* Save & Cancel Buttons */}
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
        </div>
      )}
    </>
  );
};

export default CommunicationRuleForm;
