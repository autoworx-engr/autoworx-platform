"use client";
import React, { useState, useEffect, useMemo } from "react";
import Selector from "./Selector";
import { Box, Paper, Typography, Switch } from "@mui/material";
import { SlimInput } from "@/components/SlimInput";
import ActiveTemplate from "./ActiveTemplate";
import { invoiceTimeDelays, invoiceTypeOptions, timeDelays } from "./constants";
import { errorToast } from "@/lib/toast";
import { TAttachments } from "@/types/automation";
import {
  handleFileAttachmentUtils,
  uploadAllAttachments,
} from "@/utils/handleFileAttachment";
import CustomRadioGroup from "./CustomRadioGroup";
import { usePipelineStagesStore } from "@/stores/pipelineStagesStore";
import { useCreateInvoiceAutomationRule } from "@/hooks/invoice-automation/useCreateInvoiceAutomationRule";
import { useUpdateInvoiceAutomationRule } from "@/hooks/invoice-automation/useUpdateInvoiceAutomationRule";
import { useFindOneInvoiceAutomationRule } from "@/hooks/invoice-automation/useFindOneInvoiceAutomationRule";
import { parseTimeDelayToSeconds } from "@/utils/parseTimeDelayToSeconds";
import { parseSecondsToTimeDelay } from "@/utils/parseSecondsToTimeDelay";
import { Company, TwilioCredentials, InfobipConfig } from "@prisma/client";
import { useCharacterLimit } from "@/hooks/useCharecterLimit";
import CarLoading from "@/components/common/CarLoading";
import { AppointmentTemplateVariable } from "@/components/Lists/NewTemplate";
import TooltipLabel from "./ToolTipLabel";
import { getInvoiceTypeHelp } from "./AllAutomationHelper";
import InfoCard from "./InfoCard";
import { TipBox } from "./TagautomationHelper";

type RuleFormProps = {
  initialData?: Rule;
  mode: "create" | "edit" | undefined;
  id?: string | null;
  isEdit: boolean;
  companyId: any;
  user: any;
  company: Company;
  twilio: TwilioCredentials | InfobipConfig | null;
};

export type Rule = {
  companyId: number | null;
  createdBy: string | null;
  id?: string;
  title: string;
  type: "Invoice" | "Estimate" | null;
  invoiceStatusId: number | null;
  timeDelay: number | null | string;
  communicationType: "SMS" | "EMAIL" | "BOTH";
  attachments?: TAttachments | [];
  emailSubject?: string | null;
  emailBody?: string | null;
  smsBody?: string | null;
  isPaused?: boolean;
};

// Template variables
const template_variable_options = [
  { name: "<INVOICE_LINK>", description: "Invoice link" },
  { name: "<ADDRESS>", description: "Your business address" },
  { name: "<CLIENT>", description: "Client name" },
  { name: "<BUSINESS_NAME>", description: "Your business name" },
  { name: "<DATE>", description: "Date" },
  { name: "<REVIEW_LINK>", description: "Review link" },
  { name: "<SERVICE>", description: "Service" },
  { name: "<PHONE>", description: "Your business phone number" },
  { name: "<GOOGLE_REVIEW_LINK>", description: "Google review link" },
];

const InvoiceRuleForm: React.FC<RuleFormProps> = ({
  mode,
  id,
  isEdit,
  initialData,
  companyId,
  user,
  twilio,
  company,
}) => {
  const userEmail = user?.email;

  const [initialFormData, setInitialFormData] = useState<Rule | null>(
    initialData || null,
  );
  // Default empty rule
  const [formData, setFormData] = useState<Rule>(
    initialData || {
      createdBy: userEmail,
      companyId: Number(companyId),
      title: "",
      type: null,
      invoiceStatusId: null,
      timeDelay: null,
      communicationType: "SMS",
      attachments: [],
      emailSubject: "",
      emailBody: "",
      smsBody: "",
    },
  );
  const [activeTemplate, setActiveTemplate] = useState<"SMS" | "EMAIL">("SMS");
  const [error, setError] = useState<Record<string, string>>({});
  const {
    stages,
    fetchStages,
    loading: stageLoading,
  } = usePipelineStagesStore();

  const { mutate: createRule, isPending: isCreatePending } =
    useCreateInvoiceAutomationRule();
  const { mutate: updateRule, isPending: isUpdatePending } =
    useUpdateInvoiceAutomationRule();
  const { data, isLoading, isFetching } = useFindOneInvoiceAutomationRule(
    Number(id),
  );

  const maxLength = 160;
  const { length, isLimitExceeded } = useCharacterLimit(
    formData?.emailBody! || formData?.smsBody!,
    maxLength,
  );
  useEffect(() => {
    fetchStages("shop");
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (isEdit && id) {
        const timeDelay =
          data?.data?.timeDelay !== "Instant" &&
          parseSecondsToTimeDelay(data?.data?.timeDelay);
        const payload: Rule = {
          companyId: data?.data.companyId,
          title: data?.data.title,
          type: data?.data.type,
          invoiceStatusId: data?.data?.invoiceStatusId,
          timeDelay:
            data?.data?.timeDelay === "Instant"
              ? data?.data?.timeDelay
              : timeDelay,
          communicationType: data?.data.communicationType,
          emailSubject: data?.data.emailSubject,
          emailBody: data?.data.emailBody,
          smsBody: data?.data.smsBody,
          attachments: data?.data.attachments,
          createdBy: data?.data.createdBy,
        };
        setFormData(payload);
        setInitialFormData(payload);

        setActiveTemplate(
          data?.data.communicationType === "BOTH"
            ? "SMS"
            : data?.data.communicationType,
        );
      } else {
        const payload: Rule = {
          companyId: null,
          title: "",
          type: null,
          invoiceStatusId: null,
          timeDelay: null,
          communicationType: "SMS",
          emailSubject: "",
          emailBody: "",
          smsBody: "",
          attachments: [],
          createdBy: null,
        };
        setFormData(payload);
        setInitialFormData(payload);
      }
    };
    loadData();
  }, [isEdit, id, data?.data, mode]);

  // Update rule on initial data change
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setInitialFormData(initialData);
    }
  }, [initialData]);

  const isFormUnchanged = useMemo(() => {
    if (!initialFormData) return false;
    return JSON.stringify(formData) === JSON.stringify(initialFormData);
  }, [formData, initialFormData]);

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
    if (field === "emailSubject" && (error.emailSubject || error.emailBody)) {
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
    event: React.ChangeEvent<HTMLInputElement>,
    type: string,
  ) => {
    handleFileAttachmentUtils({
      event: event,
      formData,
      setFormData,
    });
  };

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const errors: string[] = [];
    const newError: Record<string, string> = {};

    if (!formData.title || !formData.title.trim())
      newError.title = "Title is required.";

    if (!formData.type) newError.type = "Invoice type is required.";

    if (!formData.invoiceStatusId)
      newError.invoiceStatusId = "Invoice Status is required.";

    if (formData.timeDelay === null)
      newError.timeDelay = "Time delay is required.";

    if (!formData.communicationType)
      errors.push("Communication type is required.");

    if (formData.communicationType === "EMAIL") {
      const isSubjectEmpty =
        !formData.emailSubject || !formData.emailSubject.trim();
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
      const isSubjectEmpty =
        !formData.emailSubject || !formData.emailSubject.trim();
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
      const payload = {
        ...formData,
        timeDelay:
          formData.timeDelay != null && formData.timeDelay !== "Instant"
            ? `${parseTimeDelayToSeconds(formData.timeDelay)}`
            : formData.timeDelay,

        invoiceStatusId:
          formData.invoiceStatusId != null
            ? Number(formData.invoiceStatusId)
            : null,

        createdBy: userEmail,
        companyId,
      };

      if (isEdit && id) {
        const updatePayload = {
          ...payload,
          attachments:
            formData.attachments?.map((attach) => ({
              fileUrl: attach?.fileUrl,
            })) || [],
        };

        updateRule({
          id,
          data: updatePayload,
        });
      } else {
        createRule(payload);

        setFormData({
          title: "",
          type: null,
          invoiceStatusId: null,
          timeDelay: null,
          communicationType: "SMS",
          attachments: [],
          emailSubject: "",
          emailBody: "",
          smsBody: "",
          companyId,
          createdBy: null,
        });
      }
    } catch (error) {
      errorToast("Something went wrong!");
    }
  };

  const handleTemplateChange = (name: string, value: any) => {
    // This cast is safe because we're only passing valid keys from the ActiveTemplate component
    handleChange(name as keyof Rule, value);
  };

  if (
    isLoading ||
    isFetching ||
    isUpdatePending ||
    stageLoading ||
    isCreatePending
  ) {
    return (
      <div className="flex h-[800px] w-full animate-pulse items-center justify-center rounded-md bg-gray-200 p-4 shadow-sm md:p-6">
        <CarLoading />
      </div>
    );
  }

  const typeHelp = getInvoiceTypeHelp(formData?.type!);
  return (
    <div>
      <div className="rounded-md border bg-white p-4 shadow-sm md:p-6">
        <Paper elevation={0} className="mx-auto max-w-lg rounded-lg">
          <form onSubmit={handleSubmit}>
            <div className="space-y-2">
              {/* Title */}
              <SlimInput
                name="label"
                label="Title"
                value={formData.title}
                labelClassName="text-gray-500"
                onChange={(e) => handleChange("title", e.target.value)}
                required
                error={error.title}
              />

              {/* Invoice type */}
              <div className="relative">
                <TooltipLabel
                  label="Type"
                  tooltipText={
                    <div className="space-y-1">
                      <p className="font-semibold mb-1">
                        Choose document type:
                      </p>
                      <p>
                        <strong>Invoice:</strong> Final bill for completed work
                      </p>
                      <p>
                        <strong>Estimate:</strong> Quote for proposed work
                      </p>
                    </div>
                  }
                  required
                  icon="question"
                />

                <Selector
                  name="type"
                  options={invoiceTypeOptions}
                  value={formData.type!}
                  onChange={(value) => handleChange("type", value)}
                  required
                  error={error.type}
                  labelClassName="hidden"
                />

                {typeHelp && (
                  <InfoCard
                    icon={typeHelp.icon}
                    title={typeHelp.title}
                    description={typeHelp.desc}
                    bgColor={typeHelp.bgColor}
                    borderColor={typeHelp.borderColor}
                    textColor={typeHelp.textColor}
                  />
                )}
              </div>

              {/* Invoice Status */}

              <div className="relative">
                <TooltipLabel
                  label="Status"
                  tooltipText={
                    <div className="space-y-2">
                      <p className="font-semibold mb-1">
                        When to trigger this automation:
                      </p>
                      <p>
                        Select the pipeline status that will trigger this
                        automation. When an invoice/estimate moves to this
                        status, the notification will be sent automatically.
                      </p>
                      <p className="mt-2 text-xs italic">
                        These are your shop pipeline stages from the target
                        column.
                      </p>
                    </div>
                  }
                  required
                />
                <Selector
                  name="status"
                  options={stages}
                  value={formData.invoiceStatusId!}
                  onChange={(value) => handleChange("invoiceStatusId", value)}
                  required
                  disabled={stageLoading}
                  isClear={true}
                  error={error.invoiceStatusId}
                  labelClassName="hidden"
                />

                <TipBox
                  message="The automation will trigger when an invoice/estimate reaches this status in your pipeline."
                  variant="info"
                />
              </div>

              {/* Time Delay */}
              <Selector
                name="delay"
                label="Time Delay"
                options={invoiceTimeDelays}
                value={formData.timeDelay!}
                onChange={(value) => handleChange("timeDelay", value)}
                required
                error={error.timeDelay}
              />
            </div>

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

              {/* Email Template */}
              {activeTemplate === "EMAIL" && (
                <Box
                  className={`mb-4 ${activeTemplate !== "EMAIL" ? "hidden" : ""}`}
                >
                  <ActiveTemplate
                    activeTemplate="EMAIL"
                    rows={6}
                    subjectName="emailSubject"
                    name="emailBody"
                    setFormData={setFormData}
                    subjectValue={formData.emailSubject!}
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
                VARIABLES={template_variable_options}
                hasBackground={true}
              />
              <div className="">
                <TipBox
                  message="Click any variable to copy it, then paste it into your template where you want the dynamic content to appear. For example: 'Hi <CLIENT>, your invoice is ready: <INVOICE_LINK>'"
                  variant="info"
                />
              </div>
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
  );
};

export default InvoiceRuleForm;
