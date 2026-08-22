"use client";
import React, { useState, useEffect, useMemo } from "react";
import Selector from "./Selector";
import { Paper } from "@mui/material";
import { SlimInput } from "@/components/SlimInput";
import {
  DaysOfWeek,
  ReportingActions,
  ReportingAutomationFrequency,
} from "./constants";
import { errorToast } from "@/lib/toast";
import { User } from "@prisma/client";
import MultiSelect from "./MultiSelect";

import CarLoading from "@/components/common/CarLoading";
import TooltipLabel from "./ToolTipLabel";
import InfoCard from "./InfoCard";
import { getInventoryActionHelp } from "./InventoryAutomationHelper";
import { TipBox } from "./TagautomationHelper";
import { useCreateReportingAutomationRule } from "@/hooks/reporting-automation/useCreateReportingAutomationRule";
import { useFindOneReportingAutomationRule } from "@/hooks/reporting-automation/useFindOneReportingAutomationRule";
import { useUpdateReportingAutomationRule } from "@/hooks/reporting-automation/useUpdateReportingAutomationRule";

type RuleFormProps = {
  initialData?: Rule;
  mode: "create" | "edit" | undefined;
  id?: string | null;
  isEdit: boolean;
  employees: User[] | null;
  user: any;
  companyId: any;
};

export type Rule = {
  companyId: number | null;
  id?: string;
  title: string;
  frequency: string;
  day: string;
  action: string;
  teamMemberUserIds: number[];
};

const ReportingAutomationRuleForm: React.FC<RuleFormProps> = ({
  mode,
  id,
  isEdit,
  initialData,
  employees,
  user,
  companyId,
}) => {
  const [initialFormData, setInitialFormData] = useState<Rule | null>(
    initialData || null,
  );
  // Default empty rule
  const [formData, setFormData] = useState<Rule>(
    initialData || {
      companyId: null,
      title: "",
      frequency: "",
      action: "",
      day: "",
      teamMemberUserIds: [],
    },
  );

  const { mutate: createRule, isPending: isCreatePending } =
    useCreateReportingAutomationRule();
  const { mutate: updateRule, isPending: isUpdatePending } =
    useUpdateReportingAutomationRule();
  const { data, isLoading, isFetching } = useFindOneReportingAutomationRule(
    Number(id),
  );
  const [error, setError] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadData = async () => {
      if (isEdit && id) {
        const payload: Rule = {
          companyId: data?.data.companyId,
          title: data?.data.title,
          frequency: data?.data.frequency,
          action: data?.data.action,
          day: data?.data.day,
          teamMemberUserIds: data?.data?.teamMembers?.map(
            (item: any) => item.userId,
          ),
        };
        setFormData(payload);
        setInitialFormData(payload);
      } else {
        const payload: Rule = {
          companyId: null,
          title: "",
          frequency: "",
          action: "",
          day: "",
          teamMemberUserIds: [],
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

  const teamMembersOptions = employees?.map((item: User) => ({
    id: item.id,
    title: `${item.firstName} ${item.lastName} (${item.role})`,
  }));
  // Handle input changes
  const handleChange = (field: keyof Rule, value: any) => {
    setFormData((prev) => {
      if (field === "frequency" && value !== "WEEKLY") {
        return { ...prev, [field]: value, day: "" };
      }
      return { ...prev, [field]: value };
    });

    if (error[field]) {
      setError((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle form submission
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const errors: string[] = [];
    const newError: Record<string, string> = {};

    if (!formData.title || !formData.title.trim())
      newError.title = "Title is required";

    if (!formData.frequency) newError.frequency = "Frequency is required";
    if (formData.frequency === "WEEKLY") {
      if (!formData.day) newError.day = "Day is required";
    }

    if (!formData.action) newError.action = "Action is required";

    if (!formData.teamMemberUserIds || formData.teamMemberUserIds.length === 0)
      newError.teamMemberUserIds = "At least one team member is required";

    if (errors.length > 0) {
      errors.forEach((err) => errorToast(err));
      return;
    }

    if (Object.keys(newError).length > 0) {
      setError(newError);

      return;
    }

    try {
      const finalData = {
        ...formData,
        createdBy: user?.firstName,
        companyId: companyId,
      };
      if (isEdit && id) {
        updateRule({ id, data: finalData });
      } else {
        createRule(finalData);
        setFormData({
          companyId: null,
          title: "",
          frequency: "",

          action: "",
          day: "",
          teamMemberUserIds: [],
        });
      }
    } catch (error) {
      errorToast("Something went wrong!");
    }
  };
  const actionHelpContent = getInventoryActionHelp(
    formData?.action || "",
    true,
  );
  return (
    <>
      {isLoading || isFetching ? (
        <div className="flex h-[800px] w-full animate-pulse items-center justify-center rounded-md bg-gray-200 p-4 shadow-sm md:p-6">
          <CarLoading />
        </div>
      ) : (
        <div>
          <div className=" rounded-md border bg-white p-4 shadow-sm md:p-6">
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
                  error={error.title}
                />

                {/* Frequency */}

                <div className="relative">
                  <TooltipLabel
                    label="Frequency"
                    tooltipText={
                      <div className="space-y-1">
                        <p className="font-semibold mb-1">
                          How often to check inventory:
                        </p>
                        <p>
                          <strong>Daily:</strong> Check once every day
                        </p>
                        <p>
                          <strong>Weekly:</strong> Check once every week
                        </p>
                        <p>
                          <strong>Monthly:</strong> Check once every month
                        </p>
                        <p>
                          <strong>Yearly:</strong> Check once every year
                        </p>
                      </div>
                    }
                    required
                    icon="question"
                  />

                  <Selector
                    name="frequency"
                    options={ReportingAutomationFrequency}
                    value={formData.frequency!}
                    onChange={(value) => handleChange("frequency", value)}
                    required
                    error={error.frequency}
                    labelClassName="hidden"
                  />
                </div>

                {/* Day */}

                {formData.frequency === "WEEKLY" && (
                  <Selector
                    name="day"
                    label="Day"
                    options={DaysOfWeek}
                    value={formData.day}
                    onChange={(value) => handleChange("day", value)}
                    required
                    error={error.day}
                  />
                )}

                {/* Action */}
                <div className="relative">
                  <TooltipLabel
                    label="Action"
                    tooltipText="Choose how to notify your team members about stock issues"
                    required
                  />
                  <Selector
                    name="action"
                    options={ReportingActions}
                    value={formData.action}
                    onChange={(value) => handleChange("action", value)}
                    required
                    error={error.action}
                    labelClassName="hidden"
                  />

                  {actionHelpContent && (
                    <InfoCard
                      icon={actionHelpContent.icon}
                      title={actionHelpContent.title}
                      description={actionHelpContent.desc}
                      bgColor={actionHelpContent.bgColor}
                      borderColor={actionHelpContent.borderColor}
                      textColor={actionHelpContent.textColor}
                    />
                  )}

                  {formData.action === "BOTH" && (
                    <TipBox
                      message="When using 'Both', ensure all selected team members have valid email addresses and phone numbers in their profiles."
                      variant="warning"
                    />
                  )}
                </div>

                <div className="relative">
                  <TooltipLabel
                    label="Send to Team"
                    tooltipText="Select team members who will receive the stock alerts. You can choose multiple members."
                    required
                    icon="question"
                  />
                  <MultiSelect
                    options={teamMembersOptions!}
                    value={formData.teamMemberUserIds}
                    onChange={(value) =>
                      handleChange("teamMemberUserIds", value)
                    }
                    placeholder="Select options"
                    required={false}
                    disabled={!employees}
                    isSearch
                    error={error.teamMemberUserIds}
                  />
                </div>

                {/* Save & Cancel Buttons */}
                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={
                      isCreatePending || isUpdatePending || isFormUnchanged
                    }
                    className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
                      isUpdatePending || isCreatePending || isFormUnchanged
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

export default ReportingAutomationRuleForm;
