"use client";
import React, { useEffect, useState } from "react";
import Selector from "./Selector";
import MultiSelect from "./MultiSelect";
import { SlimInput } from "@/components/SlimInput";
import { conditions, timeDelays } from "./constants";
import { useUpdatePipelineAutomationRule } from "@/hooks/pipeline-automation/useUpdatePipelineAutomationRule";
import { useCreatePipelineAutomationRule } from "@/hooks/pipeline-automation/useCreatePipelineAutomationRule";
import { useFindOnePipelineAutomationRule } from "@/hooks/pipeline-automation/useFindOnePipelineAutomationRule";
import { parseTimeDelayToSeconds } from "@/utils/parseTimeDelayToSeconds";
import { parseSecondsToTimeDelay } from "@/utils/parseSecondsToTimeDelay";
import { errorToast } from "@/lib/toast";
import { usePipelineStagesStore } from "@/stores/pipelineStagesStore";
import { Spin } from "antd";

export type Rule = {
  id?: string;
  title: string;
  stageIds: number[];
  conditionType: string;
  timeDelay?: number | string | null;
  targetColumnId: number | null;
  companyId: number | null;
  // createdBy: string | null;
};

type PipelineRuleFormProps = {
  initialData?: Rule;
  mode: "create" | "edit" | undefined;
  id?: string | null;
  isEdit: boolean;
  companyId: any;
  user: any;
};

const PipelineRuleForm = ({
  mode,
  id,
  isEdit,
  companyId,
  user,
}: PipelineRuleFormProps) => {
  const [formData, setFormData] = useState<Rule>({
    title: "",
    stageIds: [],
    conditionType: "",
    timeDelay: null,
    targetColumnId: null,
    companyId: companyId,
    // createdBy: null,
  });

  const [showDelayField, setShowDelayField] = useState(
    formData.conditionType === "Time Delay",
  );
  const { stages, fetchStages, loading, error } = usePipelineStagesStore();
  const { mutate: createRule } = useCreatePipelineAutomationRule();
  const { mutate: updateRule } = useUpdatePipelineAutomationRule();
  const { data, isError, isLoading, isFetched } =
    useFindOnePipelineAutomationRule(Number(id));

  useEffect(() => {
    fetchStages("sales");
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (isEdit && id) {
        const timeDelay = parseSecondsToTimeDelay(data?.data?.timeDelay);
        setFormData({
          id: data?.data?.id,
          companyId: data?.data?.companyId,
          conditionType: data?.data?.conditionType,
          stageIds: data?.data?.stages?.map((stage: any) => stage.columnId),
          targetColumnId: data?.data?.targetColumnId.toString(),
          title: data?.data?.title,
          timeDelay: timeDelay,
          // createdBy: data?.data?.createdBy,
        });
      } else {
        setFormData({
          title: "",
          stageIds: [],
          conditionType: "",
          timeDelay: null,
          targetColumnId: null,
          companyId: companyId,
          // createdBy: null,
        });
      }
    };
    loadData();
  }, [isEdit, id, data, mode]);

  useEffect(() => {
    setShowDelayField(formData?.conditionType === "TIME_DELAY");

    // Clear delay value if condition is not TIME_DELAY

    if (formData?.conditionType !== "TIME_DELAY") {
      setFormData((prev) => ({ ...prev, timeDelay: null }));
    }
  }, [formData?.conditionType]);

  const handleInputChange = (field: keyof Rule, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: string[] = [];

    if (!formData.title.trim()) errors.push("Title is required.");
    if (!Array.isArray(formData.stageIds) || formData.stageIds.length === 0) {
      errors.push("At least one stage is required.");
    }
    if (!formData.conditionType.trim())
      errors.push("Condition type is required.");

    if (formData.conditionType === "TIME_DELAY") {
      if (formData.timeDelay === null || formData.timeDelay === "") {
        errors.push(
          "Time delay is required when condition type is TIME_DELAY.",
        );
      }
    }

    if (!formData.targetColumnId) errors.push("Action is required.");
    if (!formData.companyId) errors.push("Company ID is required.");

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
        updateRule({ id, data: formData });
      } else {
        if (formData.timeDelay != null) {
          const seconds = parseTimeDelayToSeconds(formData.timeDelay!);
          formData.timeDelay = seconds;
        }
        formData.targetColumnId = Number(formData.targetColumnId);
        // formData.createdBy = user.firstName + " " + user.lastName;
        createRule(formData);
        setFormData({
          title: "",
          stageIds: [],
          conditionType: "",
          timeDelay: null,
          targetColumnId: null,
          companyId: companyId,
          // createdBy: null,
        });
      }
    } catch (error) {
      console.error("An error occurred:", error);
      // Optionally show error message
    }
  };

  if (loading || isLoading) {
    <div className="flex h-[600px] items-center justify-center p-4">
      <Spin />
    </div>;
  }

  return (
    <div className="">
      <h2 className="mb-6 text-lg font-semibold text-gray-800 md:text-xl">
        {mode == "create" ? "New Rule" : "Edit Rule"}
      </h2>
      <div className="h-[600px] rounded-md border bg-white p-4 shadow-sm md:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <SlimInput
            name="label"
            label="Title"
            value={formData?.title}
            labelClassName="text-gray-500"
            onChange={(e) => handleInputChange("title", e.target.value)}
            required
            disabled={loading}
          />

          {/* Stage */}
          <div>
            <MultiSelect
              options={stages}
              // value={formData?.stageIds}
              value={
                Array.isArray(formData?.stageIds)
                  ? formData?.stageIds
                  : formData?.stageIds
              }
              onChange={(value) => handleInputChange("stageIds", value)}
              label="Stage"
              placeholder="Select options"
              required
            />
          </div>

          {/* Condition */}
          <Selector
            name="condition"
            label="Condition"
            options={conditions}
            value={formData?.conditionType}
            onChange={(value) => handleInputChange("conditionType", value)}
            required
          />

          {/* Delay */}
          {showDelayField && (
            <Selector
              name="delay"
              label="Delay"
              options={timeDelays}
              value={formData?.timeDelay!}
              onChange={(value) => handleInputChange("timeDelay", value)}
            />
          )}

          {/* Action */}

          <Selector
            name="action"
            label="Action"
            options={stages}
            value={formData?.targetColumnId!}
            onChange={(value) => handleInputChange("targetColumnId", value)}
            required
          />

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
            >
              {isEdit && id ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PipelineRuleForm;
