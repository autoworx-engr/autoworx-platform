"use client";
import { SlimInput } from "@/components/SlimInput";
import { Box, Paper, Switch, Typography } from "@mui/material";
import { ArrowRight } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import ActiveTemplate from "./ActiveTemplate";
import { timeDelays } from "./constants";
import MultiSelect from "./MultiSelect";
import Selector from "./Selector";

import { useCreateServiceMaintenanceAutomationRule } from "@/hooks/service-maintenance-automation/useCreateServiceMaintenanceAutomationRule";
import { usePipelineStagesStore } from "@/stores/pipelineStagesStore";
import { TAttachments } from "@/types/automation";
import {
  handleFileSelection,
  uploadAllAttachments,
} from "@/utils/handleFileAttachment";

import CarLoading from "@/components/common/CarLoading";
import { AppointmentTemplateVariable } from "@/components/Lists/NewTemplate";
import { useFindOneServiceMaintenanceAutomationRule } from "@/hooks/service-maintenance-automation/useFindOneServiceMaintenanceAutomationRule";
import { useUpdateServiceMaintenanceAutomationRule } from "@/hooks/service-maintenance-automation/useUpdateServiceMaintenanceAutomationRule";
import { useCharacterLimit } from "@/hooks/useCharecterLimit";
import { errorToast } from "@/lib/toast";
import { useServiceStore } from "@/stores/serviceStore";
import { parseSecondsToTimeDelay } from "@/utils/parseSecondsToTimeDelay";
import { parseTimeDelayToSeconds } from "@/utils/parseTimeDelayToSeconds";
import { Company, InfobipConfig, TwilioCredentials } from "@prisma/client";
import InfoCard from "./InfoCard";
import { TipBox } from "./TagautomationHelper";
import TooltipLabel from "./ToolTipLabel";
type RuleFormProps = {
  initialData?: Rule;
  mode: "create" | "edit" | undefined;
  id?: string | null;
  isEdit: boolean;
  user: any;
  companyId: any;
  company: Company;
  twilio: TwilioCredentials | InfobipConfig | null;
};

export type Rule = {
  companyId: number | null;
  id?: number;
  title: string;
  selectedServiceIds: number[];
  conditionColumnId: number | null;
  timeDelay?: number | string | null;
  targetColumnId: number | null;
  templateType: "SMS" | "EMAIL";
  attachments?: TAttachments | [];
  emailSubject?: string | null;
  emailBody?: string | null;
  smsBody?: string | null;
  createdBy: string | null;
  isPaused?: boolean;
};

// Template variables
const template_variable_options = [
  { name: "<CLIENT>", description: "Client name" },
  { name: "<INTEREST>", description: "Interest" },
  { name: "<VEHICLE>", description: "Vehicle details" },
  { name: "<SERVICE>", description: "Service" },
  { name: "<BUSINESS_NAME>", description: "Your business name" },
  { name: "<PHONE>", description: "Your business phone number" },
  { name: "<ADDRESS>", description: "Your business address" },
  { name: "<VIDEO_DIRECTION>", description: "Video direction" },
  { name: "<GOOGLE_MAP_LINK>", description: "Google map link" },
  { name: "<GOOGLE_REVIEW_LINK>", description: "Google review link" },
];

const ServiceRuleForm: React.FC<RuleFormProps> = ({
  mode,
  id,
  isEdit,
  user,
  companyId,
  company,
  twilio,
}) => {
  const [initialFormData, setInitialFormData] = useState<Rule | null>(null);
  const [formData, setFormData] = useState<Rule>({
    title: "",
    selectedServiceIds: [],
    conditionColumnId: null,
    targetColumnId: null,
    timeDelay: null,
    templateType: "SMS",
    attachments: [],
    emailSubject: "",
    emailBody: "",
    smsBody: "",
    createdBy: null,
    companyId: null,
  });
  const [activeTemplate, setActiveTemplate] = useState<"SMS" | "EMAIL">("SMS");
  const [error, setError] = useState<Record<string, string>>({});
  const userEmail = user?.email;
  const {
    serviceOptions,
    fetchServices,
    loading: serviceLoading,
  } = useServiceStore();
  const { mutate: createService, isPending: isCreatePending } =
    useCreateServiceMaintenanceAutomationRule();
  const {
    stages,
    fetchStages,
    loading: stageLoading,
  } = usePipelineStagesStore();

  const actionOptions = stages.filter(
    (stage) => formData?.conditionColumnId != stage.id,
  );

  const { mutate: updateServiceRule, isPending: isUpdatePending } =
    useUpdateServiceMaintenanceAutomationRule();
  const { data, isLoading, isFetching } =
    useFindOneServiceMaintenanceAutomationRule(Number(id));
  const maxLength = 160;
  const { length, isLimitExceeded } = useCharacterLimit(
    formData?.emailBody! || formData?.smsBody!,
    maxLength,
  );

  // Update rule on initial data change
  useEffect(() => {
    if (isEdit && id) {
      const timeDelay = parseSecondsToTimeDelay(data?.data?.timeDelay);
      const initialData: Rule = {
        companyId: data?.data.companyId,
        title: data?.data.title,
        selectedServiceIds: data?.data.serviceMaintenanceStage?.map(
          (item: any) => item.serviceId,
        ),
        conditionColumnId: data?.data.conditionColumnId,
        targetColumnId:
          data?.data.targetColumnId == 0
            ? null
            : data?.data.targetColumnId || null,
        timeDelay: timeDelay,
        templateType: data?.data.templateType,
        attachments: data?.data.attachments || [],
        emailSubject: data?.data.emailSubject || "",
        emailBody: data?.data.emailBody || "",
        smsBody: data?.data.smsBody || "",
        createdBy: data?.data.createdBy,
      };
      setFormData(initialData);
      setInitialFormData(initialData);
      setActiveTemplate(data?.data.templateType);
    } else {
      const initialData: Rule = {
        title: "",
        selectedServiceIds: [],
        conditionColumnId: null,
        targetColumnId: null,
        timeDelay: null,
        templateType: "SMS",
        attachments: [],
        emailSubject: "",
        emailBody: "",
        smsBody: "",
        createdBy: null,
        companyId: null,
      };
      setFormData(initialData);
      setInitialFormData(initialData);
    }
  }, [isEdit, id, data, mode]);

  const isFormUnchanged = useMemo(() => {
    if (!initialFormData) return false;
    return JSON.stringify(formData) === JSON.stringify(initialFormData);
  }, [formData, initialFormData]);

  useEffect(() => {
    fetchStages("shop");
  }, [fetchStages]);
  // Handle input changes
  const handleChange = (field: keyof Rule, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (error[field]) {
      setError((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

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
    handleFileSelection({
      event: event,
      formData,
      setFormData,
    });
  };

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const newError: Record<string, string> = {};
    const errors: string[] = [];

    if (!formData.title || !formData.title.trim())
      newError.title = "Title is required.";

    if (
      !Array.isArray(formData.selectedServiceIds) ||
      formData.selectedServiceIds.length === 0
    ) {
      newError.selectedServiceIds = "At least one service is required.";
    }

    if (!formData.conditionColumnId)
      newError.conditionColumnId = "Condition is required.";

    if (!formData.templateType) errors.push("Template type is required.");

    if (!formData.timeDelay) newError.timeDelay = "Time Delay is required";

    if (formData.templateType === "EMAIL") {
      const isSubjectEmpty =
        !formData.emailSubject || !formData.emailSubject.trim();
      const isBodyEmpty = !formData.emailBody || !formData.emailBody.trim();

      if (isSubjectEmpty && isBodyEmpty) {
        newError.emailBody = "Email subject and body are required.";
        newError.emailSubject = "Email subject is required.";
      } else if (isSubjectEmpty) {
        newError.emailSubject = "Email subject is required.";
        newError.emailBody = "Email subject is required.";
      } else if (isBodyEmpty) {
        newError.emailBody = "Email body is required.";
      }

      if (company?.email === null) {
        newError.businessEmail = "You haven't added your business email.";
        errorToast(newError.businessEmail);
      }
    }

    if (formData.templateType === "SMS") {
      if (!formData.smsBody || !formData.smsBody.trim()) {
        newError.smsBody = "SMS body is required.";
      }

      if (twilio === null) {
        newError.twilio = "SMS gateway not available";
        errorToast(newError.twilio);
      }
    }

    if (!formData.targetColumnId)
      newError.targetColumnId = "Action is required.";

    if (errors.length > 0) {
      errors.forEach((err) => errorToast(err));

      return;
    }

    if (Object.keys(newError).length > 0) {
      setError(newError);

      return;
    }

    try {
      const { attachments, timeDelay, ...rest } = formData;
      const seconds =
        timeDelay != null ? parseTimeDelayToSeconds(timeDelay) : 0;
      const uploadedAttachments = await uploadAllAttachments(attachments!);

      const finalData = {
        ...rest,
        targetColumnId:
          formData.targetColumnId == 0
            ? null
            : Number(formData.targetColumnId) || null,
        conditionColumnId: Number(formData.conditionColumnId),
        timeDelay: seconds,
        createdBy: userEmail,
        companyId: companyId,
        isPaused: false,
        attachments: uploadedAttachments,
      };

      if (isEdit && id) {
        updateServiceRule({ id: id, data: finalData });
      } else {
        createService(finalData);
        //reset the form data
        setFormData({
          title: "",
          selectedServiceIds: [],
          conditionColumnId: null,
          targetColumnId: null,
          timeDelay: null,
          templateType: "SMS",
          attachments: [],
          emailSubject: "",
          emailBody: "",
          smsBody: "",
          createdBy: null,
          companyId: null,
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

  const getConditionActionHelp = () => {
    const conditionId = formData?.conditionColumnId;
    const actionId = formData?.targetColumnId;

    if (conditionId == null || actionId == null) return null;

    const findStageName = (id: any) => {
      const st: any = stages?.find((s: any) => Number(s.id) === Number(id));
      return st?.title ?? st?.name ?? "";
    };

    const conditionName = findStageName(conditionId);
    const actionName = findStageName(actionId);

    // Add this check to prevent showing generic message when stages aren't found
    if (conditionName === "" || actionName === "") {
      return null;
    }

    const helpConfig = {
      status_transition: {
        icon: <ArrowRight className="w-5 h-5 text-indigo-600" />,
        title: "Status Transition",
        desc: `When service moves from "${conditionName}" to "${actionName}", this automation will trigger and send notifications to the customer.`,
        bgColor: "bg-indigo-50",
        borderColor: "border-indigo-200",
        textColor: "text-indigo-800",
      },
    };

    return helpConfig.status_transition;
  };
  const conditionActionHelp = getConditionActionHelp();

  if (isLoading || isFetching || serviceLoading || stageLoading) {
    return (
      <div className="flex h-[800px] w-full animate-pulse items-center justify-center rounded-md bg-gray-200 p-4 shadow-sm md:p-6">
        <CarLoading />
      </div>
    );
  }

  return (
    <div>
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
              error={error.title}
              required
            />

            {/* Service */}
            <div>
              <TooltipLabel
                label="Service"
                tooltipText={
                  <div className="space-y-2">
                    <p className="font-semibold mb-1">
                      Select services for this automation:
                    </p>
                    <p>
                      Choose one or more services that this automation rule will
                      apply to. You can search and select multiple services.
                    </p>
                  </div>
                }
                required
              />
              <MultiSelect
                options={serviceOptions}
                value={
                  Array.isArray(formData.selectedServiceIds)
                    ? formData.selectedServiceIds
                    : formData.selectedServiceIds
                }
                onChange={(value) => handleChange("selectedServiceIds", value)}
                placeholder="Select options"
                required
                isSearch={true}
                disabled={serviceLoading}
                error={error.selectedServiceIds}
                labelClassName="hidden"
              />
            </div>

            {/* Condition */}
            <div>
              <TooltipLabel
                label="Condition"
                tooltipText={
                  <div className="space-y-2">
                    <p className="font-semibold mb-1">
                      Starting status (FROM):
                    </p>
                    <p>
                      Select the status where the service currently is. This is
                      the starting point of the transition.
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
                name="condition"
                options={stages}
                value={
                  typeof formData.conditionColumnId === "number"
                    ? formData.conditionColumnId
                    : undefined
                }
                placeholder="Select a condition"
                onChange={(value) => handleChange("conditionColumnId", value)}
                required
                disabled={stageLoading}
                error={error.conditionColumnId}
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
                  <div className="space-y-2">
                    <p className="font-semibold mb-1">
                      Destination status (TO):
                    </p>
                    <p>
                      Select the status where the service will move to. When
                      this transition happens, the automation will trigger.
                    </p>
                    <p className="mt-2 text-xs italic">
                      The condition status you selected will not appear here as
                      you cannot move to the same status.
                    </p>
                  </div>
                }
                required
              />
              <Selector
                name="action"
                options={actionOptions}
                value={formData.targetColumnId!}
                onChange={(value) => handleChange("targetColumnId", value)}
                disabled={stageLoading}
                isClear={true}
                labelClassName="hidden"
                error={error.targetColumnId}
              />

              {conditionActionHelp && (
                <InfoCard
                  icon={conditionActionHelp.icon}
                  title={conditionActionHelp.title}
                  description={conditionActionHelp.desc}
                  bgColor={conditionActionHelp.bgColor}
                  borderColor={conditionActionHelp.borderColor}
                  textColor={conditionActionHelp.textColor}
                />
              )}
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
                    error={error.smsBody}
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
                    error={error.emailBody || error.emailSubject}
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

              <TipBox
                message="Click any variable to copy it, then paste it into your template where you want the dynamic content to appear. For example: 'Hi <CONTACT>, your service is complete: <VEHICLE>'"
                variant="info"
              />
            </Box>

            {/* Save & Cancel Buttons */}
            <div className="flex justify-end pt-4">
              <button
                disabled={
                  isUpdatePending ||
                  isCreatePending ||
                  isLimitExceeded ||
                  isFormUnchanged
                }
                type="submit"
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

export default ServiceRuleForm;
