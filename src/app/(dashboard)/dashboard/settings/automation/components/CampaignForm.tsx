"use client";
import React, { ChangeEvent, useEffect, useMemo } from "react";
import Selector from "./Selector";
import { useState } from "react";
import { Spin, TimePicker } from "antd";
import type { Dayjs } from "dayjs";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import "react-multi-date-picker/styles/layouts/mobile.css";
import { Box, Switch, Typography } from "@mui/material";
import MultiSelect from "./MultiSelect";
import { SlimInput } from "@/components/SlimInput";
import ActiveTemplate from "./ActiveTemplate";
import { targetConditions, targetOptions } from "./constants";
import { errorToast } from "@/lib/toast";
import { useCreateMarketingAutomationRule } from "@/hooks/marketing-automation/useCreateMarketingAutomationRule";
import { useFindOneMarketingAutomationRule } from "@/hooks/marketing-automation/useFindOneMarketingAutomationRule";
import { useUpdateMarketingAutomationRule } from "@/hooks/marketing-automation/useUpdateMarketingAutomationRule";
import dayjs from "dayjs";
import {
  handleFileSelection,
  uploadAllAttachments,
} from "@/utils/handleFileAttachment";
import { TAttachments } from "@/types/automation";
import CustomRadioGroup from "./CustomRadioGroup";
import {
  useGetAllYears,
  useGetMake,
  useGetModelsByYearAndMake,
} from "@/hooks/useCarData";
import { Company, TwilioCredentials, InfobipConfig } from "@prisma/client";
import { useCalendarSettingsStore } from "@/stores/calendarSettingsStore";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import moment from "moment-timezone";
import { useCharacterLimit } from "@/hooks/useCharecterLimit";
import CarLoading from "@/components/common/CarLoading";
import { AppointmentTemplateVariable } from "@/components/Lists/NewTemplate";
import TooltipLabel from "./ToolTipLabel";
import { getCampaignConditionHelp, getTargetHelp } from "./AllAutomationHelper";
import InfoCard from "./InfoCard";
import { TipBox } from "./TagautomationHelper";
import { TEMPLATE_VARIABLES } from "./TemplateVariable";

export type Campaign = {
  id?: number;
  companyId: number | null;
  target: string[];
  targetCondition: string;
  date?: string;
  startTime?: string;
  isActive?: boolean;
  isPaused?: boolean;
  isAppointmentCreated: boolean;
  vehicleMinYear?: string;
  vehicleMaxYear?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  communicationType: "SMS" | "EMAIL" | "BOTH";
  attachments?: TAttachments | [];
  emailSubject?: string | null;
  emailBody?: string | null;
  smsBody?: string | null;
  createdBy: string | null;
};

type CampaignFormProps = {
  initialData?: Campaign;
  mode: "create" | "edit" | undefined;
  id?: string | null;
  isEdit: boolean;
  companyId: any;
  user: any;
  company: Company;
  twilio: TwilioCredentials | InfobipConfig | null;
};

const CampaignForm = ({
  mode,
  id,
  isEdit,
  companyId,
  user,
  company,
  twilio,
}: CampaignFormProps) => {
  const companyTimezone = useCompanyTimezone();
  const today = moment.tz(companyTimezone).format("YYYY-MM-DD");
  const [error, setError] = useState<Record<string, string>>({});
  const [initialFormData, setInitialFormData] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState<Campaign>({
    companyId: null,
    target: [],
    targetCondition: "",
    date: today,
    startTime: "",
    isAppointmentCreated: false,
    vehicleMinYear: "",
    vehicleMaxYear: "",
    vehicleBrand: "",
    vehicleModel: "",
    communicationType: "SMS",
    attachments: [],
    emailSubject: "",
    emailBody: "",
    smsBody: "",
    createdBy: null,
  });

  const [minDate, setMinDate] = useState<string>(today);
  const userEmail = user?.email;
  const maxLength = 300;
  const { length, isLimitExceeded } = useCharacterLimit(
    formData?.emailBody! || formData?.smsBody!,
    maxLength,
  );
  // Update minDate whenever today changes (when timezone loads)
  useEffect(() => {
    setMinDate(today);
    // Also update the form data date if it's still the old default
    setFormData((prev) => ({
      ...prev,
      date: today,
    }));
  }, [today]);
  const [activeTemplate, setActiveTemplate] = useState<"SMS" | "EMAIL">("SMS");
  const { data: years, isLoading: isYearsLoading }: any = useGetAllYears();
  const { data: makes, isLoading: isMakeLoading }: any = useGetMake();
  const { data: models }: any = useGetModelsByYearAndMake(
    formData.vehicleMinYear!,
    formData.vehicleBrand!,
  );
  const { mutate: createMarketing, isPending: isCreatePending } =
    useCreateMarketingAutomationRule();
  const { mutate: updateMarketing, isPending: isUpdatePending } =
    useUpdateMarketingAutomationRule();
  const { calendarSettings, fetchCalendarSettings } =
    useCalendarSettingsStore();
  const { data, isLoading, isFetching } = useFindOneMarketingAutomationRule(
    Number(id),
  );

  useEffect(() => {
    const loadData = async () => {
      if (isEdit && id) {
        const payload: Campaign = {
          companyId: data?.data.companyId,
          target: data?.data.target,
          targetCondition: data?.data.targetCondition,
          date: dayjs(data?.data.date).format("YYYY-MM-DD"),
          startTime: data?.data.startTime,
          isAppointmentCreated: data?.data.isAppointmentCreated,
          vehicleMinYear: data?.data.vehicleMinYear,
          vehicleMaxYear: data?.data.vehicleMaxYear,
          vehicleBrand: data?.data.vehicleBrand,
          vehicleModel: data?.data.vehicleModel,
          communicationType: data?.data.communicationType,
          emailSubject: data?.data.emailSubject || "",
          emailBody: data?.data.emailBody || "",
          smsBody: data?.data.smsBody || "",
          attachments: data?.data.attachments || [],
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
        const payload: Campaign = {
          companyId: null,
          target: [],
          targetCondition: "",
          date: today,
          startTime: "",
          isAppointmentCreated: false,
          vehicleMinYear: "",
          vehicleMaxYear: "",
          vehicleBrand: "",
          vehicleModel: "",
          communicationType: "SMS",
          attachments: [],
          emailSubject: "",
          emailBody: "",
          smsBody: "",
          createdBy: null,
        };
        setFormData(payload);
        setInitialFormData(payload);
      }
    };
    loadData();
    fetchCalendarSettings();
  }, [isEdit, id, data, mode, fetchCalendarSettings]);

  // Type-safe input change handler
  const handleInputChange = <K extends keyof Campaign>(
    field: K,
    value: Campaign[K],
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (error[field]) {
      setError((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const vehicleOptions = makes?.data?.map((vehicle: any) => ({
    title: vehicle.name ?? "Unknown",
    id: vehicle.name,
  }));
  const vehicleModelOptions = models?.data?.map((vehicle: any) => ({
    title: vehicle.name ?? "Unknown",
    id: vehicle.name,
  }));

  // Handle input changes
  const handleChange = (field: keyof Campaign, value: any) => {
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
  };

  // Handle time change
  const handleStartTimeChange = (time: Dayjs | null) => {
    if (!calendarSettings?.dayStart || !calendarSettings?.dayEnd) {
      errorToast("Working hour limits are not available.");
      return;
    }
    if (time && formData.date) {
      const date = formData.date;

      // Combine selected date with calendar settings
      const minTime = moment(
        `${date} ${calendarSettings?.dayStart}`,
        "YYYY-MM-DD HH:mm",
      );
      const maxTime = moment(
        `${date} ${calendarSettings?.dayEnd}`,
        "YYYY-MM-DD HH:mm",
      );
      const selectedTime = moment(
        `${date} ${time.format("HH:mm")}`,
        "YYYY-MM-DD HH:mm",
      );

      const isValid =
        selectedTime.isSame(minTime) ||
        selectedTime.isSame(maxTime) ||
        (selectedTime.isAfter(minTime) && selectedTime.isBefore(maxTime));

      if (!isValid) {
        errorToast(
          `Please select a time between working hours (${minTime.format("hh:mm A")} - ${maxTime.format("hh:mm A")}).`,
        );
        return;
      }

      const dateTimeString = selectedTime.toDate().toString();
      handleInputChange("startTime", dateTimeString);
    } else {
      handleInputChange("startTime", "");
    }
  };

  // Helper function to convert ISO string to dayjs object for TimePicker
  const getTimeFromISOString = (isoString: string): Dayjs | null => {
    if (!isoString) return null;
    return dayjs(isoString);
  };

  // Handle template toggle
  const handleTemplateToggle = (template: "SMS" | "EMAIL") => {
    setActiveTemplate(template);
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

  const isFormUnchanged = useMemo(() => {
    if (!initialFormData) return false;
    return JSON.stringify(formData) === JSON.stringify(initialFormData);
  }, [formData, initialFormData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: string[] = [];
    const newErrors: Record<string, string> = {};

    if (!Array.isArray(formData.target) || formData.target.length === 0) {
      newErrors.target = "At least one target is required.";
    }

    if (!formData.targetCondition)
      newErrors.targetCondition = "Target Condition is required";

    if (!formData.date) newErrors.date = "Date is required.";
    if (!formData.startTime) newErrors.startTime = "Start Time is required.";

    if (formData.vehicleMinYear) {
      if (!formData.vehicleBrand) {
        errors.push("Vehicle brand is required.");
        newErrors.vehicleBrand = "Vehicle brand is required.";
      }
      if (!formData.vehicleModel) {
        errors.push("Vehicle model is required.");
        newErrors.vehicleModel = "Vehicle model is required.";
      }
    }

    if (!formData.communicationType)
      errors.push("Communication type is required.");
    if (formData.communicationType === "EMAIL") {
      const isSubjectEmpty =
        !formData.emailSubject || !formData.emailSubject.trim();
      const isBodyEmpty = !formData.emailBody || !formData.emailBody.trim();

      if (isSubjectEmpty && isBodyEmpty) {
        newErrors.emailBody = "Email subject and body are required.";
        newErrors.emailSubject = "Email subject is required.";
      } else if (isSubjectEmpty) {
        newErrors.emailBody = "Email subject is required.";
        newErrors.emailSubject = "Email subject is required.";
      } else if (isBodyEmpty) {
        newErrors.emailBody = "Email body is required.";
      }

      if (company?.email === null) {
        newErrors.businessEmail = "You haven't added your business email.";
        errorToast(newErrors.businessEmail);
      }
    }

    if (formData.communicationType === "BOTH") {
      if (!formData.emailSubject || !formData.emailSubject.trim()) {
        newErrors.emailSubject = "Subject is required.";
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
    if (errors.length > 0) {
      errors.forEach((err) => errorToast(err));

      return;
    }

    if (Object.keys(newErrors).length > 0) {
      setError(newErrors);

      return;
    }
    try {
      const finalData = {
        ...formData,
        date: new Date(`${formData.date}T00:00:00.000Z`).toISOString(),
        createdBy: userEmail,
        companyId,
      };

      // Upload attachments
      const uploadedAttachments = await uploadAllAttachments(
        formData.attachments || [],
      );

      const payload = {
        ...finalData,
        attachments: uploadedAttachments, // array of string URLs
      };

      if (isEdit && id) {
        updateMarketing({
          id,
          data: payload,
        });
      } else {
        createMarketing(payload);

        setFormData({
          companyId: null,
          target: [],
          targetCondition: "",
          date: today,
          startTime: "",
          isAppointmentCreated: false,
          vehicleMinYear: "",
          vehicleMaxYear: "",
          vehicleBrand: "",
          vehicleModel: "",
          communicationType: "SMS",
          attachments: [],
          emailSubject: "",
          emailBody: "",
          smsBody: "",
          createdBy: null,
        });
      }
    } catch (error) {
      errorToast("Something went wrong!");
    }
  };

  const handleTemplateChange = (name: string, value: any) => {
    // This cast is safe because we're only passing valid keys from the ActiveTemplate component
    handleChange(name as keyof Campaign, value);
  };

  const selectedTargets = targetOptions
    .filter((opt) => formData?.target?.includes(opt.id))
    .map((opt) => opt?.title)
    .join(", ");

  const condition = targetConditions?.find(
    (c) => c.id === formData?.targetCondition,
  );

  const targetHelp = getTargetHelp({
    selectedTargets,
    length: formData?.target?.length,
  });

  const conditionHelp = getCampaignConditionHelp({
    conditionLabel: condition ? condition.title : "",
  });

  if (isLoading || isFetching || isYearsLoading || isMakeLoading) {
    return (
      <div className="flex h-[800px] w-full animate-pulse items-center justify-center rounded-md bg-gray-200 p-4 shadow-sm md:p-6">
        <CarLoading />
      </div>
    );
  }

  return (
    <>
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
              error={error.target}
            />

            {targetHelp && (
              <InfoCard
                icon={targetHelp.icon}
                title={targetHelp.title}
                description={targetHelp.desc}
                bgColor={targetHelp.bgColor}
                borderColor={targetHelp.borderColor}
                textColor={targetHelp.textColor}
              />
            )}
          </div>

          {/* Target Conditions Field */}

          <div>
            <TooltipLabel
              label="Target Conditions"
              tooltipText={
                <div className="space-y-2">
                  <p className="font-semibold mb-1">Time-based filtering:</p>
                  <p>
                    Choose the time period for targeting customers based on
                    their last interaction with your business.
                  </p>
                  <p className="mt-2">
                    <strong>Example:</strong> "All clients from 2 months" will
                    target customers who interacted in the last 2 months.
                  </p>
                </div>
              }
              required
            />
            <Selector
              name="targetCondition"
              options={targetConditions}
              value={formData.targetCondition}
              onChange={(value) => handleInputChange("targetCondition", value)}
              required
              error={error.targetCondition}
              labelClassName="hidden"
            />

            {conditionHelp && (
              <InfoCard
                icon={conditionHelp.icon}
                title={conditionHelp.title}
                description={conditionHelp.desc}
                bgColor={conditionHelp.bgColor}
                borderColor={conditionHelp.borderColor}
                textColor={conditionHelp.textColor}
              />
            )}
          </div>

          {/* Date and Time Selector */}
          <div className="mb-4">
            <TooltipLabel
              label="Select Date and Time"
              tooltipText={
                <div className="space-y-2">
                  <p className="font-semibold mb-1">Schedule your campaign:</p>
                  <p>
                    Choose when you want this campaign to start. The system will
                    automatically send messages at the scheduled time.
                  </p>
                  <p className="mt-2 text-xs italic">
                    Make sure to schedule within your business hours for better
                    engagement.
                  </p>
                </div>
              }
            />
            <div className="flew-wrap flex items-center gap-2">
              <SlimInput
                name="date"
                className=""
                type="date"
                value={formData.date ?? ""}
                min={minDate}
                onChange={(e) => handleInputChange("date", e.target.value)}
                error={error.date}
                labelClassName="hidden"
              />
              <div className=" w-full">
                <div className="flex items-center gap-1">
                  <TimePicker
                    format="h:mm A"
                    placeholder="1:00 AM"
                    use12Hours
                    onChange={handleStartTimeChange}
                    allowClear={false}
                    suffixIcon={null}
                    value={
                      formData.startTime
                        ? getTimeFromISOString(formData.startTime)
                        : null
                    }
                    className={`${error.startTime ? "!border-red-500" : ""}`}
                  />

                  {error.startTime && (
                    <div className="min-h-[20px] px-1 text-xs text-red-500">
                      {error.startTime}
                    </div>
                  )}
                </div>
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
              options={years?.data}
              rootClassName="w-1/2"
              value={formData.vehicleMinYear || ""}
              onChange={(value) => handleInputChange("vehicleMinYear", value)}
              isSearch={true}
              isClear={true}
              error={error.vehicleMinYear}
            />
            {/* Max Year */}
            <Selector
              name="vehicleMaxYear"
              label="Vehicle Max Year"
              options={years?.data}
              rootClassName="w-1/2"
              value={formData.vehicleMaxYear || ""}
              onChange={(value) => handleInputChange("vehicleMaxYear", value)}
              isSearch={true}
              isClear={true}
              error={error.vehicleMaxYear}
            />
          </div>

          {/* Vehicle Make, Model Field */}
          <div className="flex w-full items-center gap-5">
            {/* Vehicle Make */}
            <Selector
              name="vehicleBrand"
              label="Vehicle Make"
              options={vehicleOptions || []}
              rootClassName="w-1/2"
              value={formData.vehicleBrand}
              onChange={(value) => handleInputChange("vehicleBrand", value)}
              isSearch={true}
              isClear={true}
              error={error.vehicleBrand}
            />
            {/* Vehicle Model */}
            <Selector
              name="vehicleModel"
              label="Vehicle Model"
              options={vehicleModelOptions}
              rootClassName="w-1/2"
              value={formData.vehicleModel}
              onChange={(value) => handleInputChange("vehicleModel", value)}
              isSearch={true}
              disabled={!formData.vehicleBrand} // Disable if vehicle brand is not selected
              isClear={true}
              error={error.vehicleModel}
            />
          </div>

          {/* Communication Type */}
          <div>
            <TooltipLabel
              label="Select Communication Type"
              tooltipText="Choose how you want to send your campaign: SMS for quick messages, Email for detailed content, or Both for maximum reach."
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
                  error={error.smsBody || error.emailBody || error.emailSubject}
                  maxLength={maxLength}
                  characterLength={length}
                  isLimitExceeded={isLimitExceeded}
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
                  error={error.emailBody || error.smsBody || error.emailSubject}
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
              message="Click any variable to copy it, then paste it into your campaign message. Example: 'Hi <CLIENT>, check out our special offer for your <VEHICLE>!'"
              variant="info"
            />
          </Box>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={
                isUpdatePending ||
                isCreatePending ||
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
      </div>
    </>
  );
};

export default CampaignForm;
