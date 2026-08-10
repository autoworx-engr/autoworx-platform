"use client";
import React, { useEffect, useMemo, useState } from "react";
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
import { useAllPipelineAutomationRules } from "@/hooks/pipeline-automation/useAllPipelineAutomationRules";
import CarLoading from "@/components/common/CarLoading";
import {
  getPipelineConditionHelp,
  PipelineFlowVisualization,
} from "./AllAutomationHelper";
import TooltipLabel from "./ToolTipLabel";
import InfoCard from "./InfoCard";
import { TipBox } from "./TagautomationHelper";
import { ArrowRight } from "lucide-react";

export type Rule = {
  id?: string;
  title: string;
  stageIds: number[];
  conditionType: string;
  timeDelay?: number | string | null;
  targetColumnId: number | null;
  companyId: number | null;
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
  const {
    data: allPipelineRules,
    isLoading: pipelineIsLoading,
    isFetching: pipelineIsFetching,
  } = useAllPipelineAutomationRules(companyId);
  const [initialFormData, setInitialFormData] = useState<Rule | null>(null);
  const [formData, setFormData] = useState<Rule>({
    title: "",
    stageIds: [],
    conditionType: "",
    timeDelay: null,
    targetColumnId: null,
    companyId: companyId,
  });

  const [showGuide, setShowGuide] = useState(true);
  const [showDelayField, setShowDelayField] = useState(
    formData.conditionType === "Time Delay",
  );
  const {
    stages,
    fetchStages,
    loading: stagesLoading,
  } = usePipelineStagesStore();

  const { mutate: createRule, isPending: isCreatePending } =
    useCreatePipelineAutomationRule();
  const { mutate: updateRule, isPending: isUpdatePending } =
    useUpdatePipelineAutomationRule();
  const { data, isLoading, isFetching } = useFindOnePipelineAutomationRule(
    Number(id),
  );
  const [error, setError] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchStages("sales");
  }, [fetchStages]);

  useEffect(() => {
    const loadData = async () => {
      if (isEdit && id && data?.data) {
        const condType = data?.data?.conditionType || "";
        const timeDelay =
          condType === "TIME_DELAY"
            ? parseSecondsToTimeDelay(data?.data?.timeDelay)
            : null;

        const payload: Rule = {
          id: data?.data?.id,
          companyId: data?.data?.companyId,
          conditionType: condType,
          stageIds:
            data?.data?.stages?.map((stage: any) => stage.columnId) || [],
          targetColumnId: data?.data?.targetColumnId?.toString() || null,
          title: data?.data?.title || "",
          timeDelay: timeDelay,
        };
        setFormData(payload);
        setInitialFormData(payload);
      } else {
        const payload: Rule = {
          title: "",
          stageIds: [],
          conditionType: "",
          timeDelay: null,
          targetColumnId: null,
          companyId: companyId,
        };
        setFormData(payload);
        setInitialFormData(payload);
      }
    };
    loadData();
  }, [isEdit, id, data, mode, companyId]);

  useEffect(() => {
    setShowDelayField(formData?.conditionType === "TIME_DELAY");

    // Clear delay value if condition is not TIME_DELAY

    if (formData?.conditionType !== "TIME_DELAY") {
      setFormData((prev) => ({ ...prev, timeDelay: null }));
    }
  }, [formData?.conditionType]);

  const handleInputChange = (field: keyof Rule, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (error[field]) {
      setError((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const isFormUnchanged = useMemo(() => {
    if (!initialFormData) return false;
    return JSON.stringify(formData) === JSON.stringify(initialFormData);
  }, [formData, initialFormData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: string[] = [];
    const newError: Record<string, string> = {};

    if (!formData.title.trim()) newError.title = "Title is required.";
    if (!Array.isArray(formData.stageIds) || formData.stageIds.length === 0) {
      newError.stageIds = "At least one stage is required.";
    }
    if (!formData.conditionType.trim())
      newError.conditionType = "Condition type is required.";

    if (formData.conditionType === "TIME_DELAY") {
      if (formData.timeDelay === null || formData.timeDelay === "") {
        newError.timeDelay =
          "Time delay is required when condition type is TIME_DELAY.";
      }
    }

    if (!formData.targetColumnId)
      newError.targetColumnId = "Action is required.";
    if (!formData.companyId) errors.push("Company ID is required.");

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
          formData.timeDelay != null
            ? parseTimeDelayToSeconds(formData.timeDelay)
            : null,
        targetColumnId:
          formData.targetColumnId != null
            ? Number(formData.targetColumnId)
            : null,
      };

      if (isEdit && id) {
        updateRule({ id, data: payload });
      } else {
        createRule(payload);

        setFormData({
          title: "",
          stageIds: [],
          conditionType: "",
          timeDelay: null,
          targetColumnId: null,
          companyId: companyId,
        });
      }
    } catch (error) {
      errorToast("Something went wrong!");
    }
  };

  const rule = allPipelineRules?.data?.find(
    (r: any) => r?.conditionType === formData?.conditionType,
  );
  const ruleColumnIds = (
    rule?.stages?.map((s: any) => s?.columnId) || []
  ).filter((id: number) => id != formData?.targetColumnId);

  let actionOptions = stages?.filter(
    (stage) =>
      !ruleColumnIds?.includes(stage?.id) &&
      !formData?.stageIds?.includes(stage?.id) &&
      formData.targetColumnId !== stage.id,
  );

  try {
    const selectedTargetId =
      formData?.targetColumnId !== null &&
      formData?.targetColumnId !== undefined
        ? Number(formData.targetColumnId)
        : null;

    if (selectedTargetId && stages && Array.isArray(stages)) {
      const alreadyPresent = actionOptions?.some(
        (s) => s.id === selectedTargetId,
      );
      if (!alreadyPresent) {
        const selectedStage = stages.find((s) => s.id === selectedTargetId);
        if (selectedStage) {
          actionOptions = [selectedStage, ...(actionOptions || [])];
        }
      }
    }
  } catch (err) {
    console.error("Error adjusting action options:", err);
  }

  const conditionHelpContent = getPipelineConditionHelp(formData.conditionType);

  const selectedActionStage = stages?.find(
    (s) => s.id === Number(formData.targetColumnId),
  );
  if (
    stagesLoading ||
    isLoading ||
    isFetching ||
    pipelineIsFetching ||
    pipelineIsLoading
  ) {
    return (
      <div className="flex h-[600px] w-full animate-pulse items-center justify-center rounded-md bg-gray-200 p-4 shadow-sm md:p-6">
        <CarLoading />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-[600px] rounded-md border bg-white p-4 shadow-sm md:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <SlimInput
            name="label"
            label="Title"
            value={formData?.title}
            labelClassName="text-gray-500"
            onChange={(e) => handleInputChange("title", e.target.value)}
            disabled={stagesLoading}
            error={error.title}
            required
          />

          {/* Stage */}
          <div>
            <TooltipLabel
              label="Stage"
              tooltipText={
                <div className="space-y-1">
                  <p className="font-semibold mb-1">Select source stages:</p>
                  <p>
                    Choose one or multiple stages where leads will trigger this
                    automation.
                  </p>
                  <p className="mt-2">
                    <strong>Example:</strong> Select "Lead Lost" and "New Leads"
                    to monitor leads in both stages.
                  </p>
                </div>
              }
              required
              icon="question"
            />
            <MultiSelect
              options={stages}
              value={
                Array.isArray(formData?.stageIds)
                  ? formData?.stageIds
                  : formData?.stageIds
              }
              onChange={(value) => handleInputChange("stageIds", value)}
              placeholder="Select options"
              required
              error={error.stageIds}
              labelClassName="hidden"
            />
          </div>

          {/* Condition */}

          <div>
            <Selector
              name="condition"
              label="Condition"
              options={conditions}
              value={formData?.conditionType}
              onChange={(value) => handleInputChange("conditionType", value)}
              required
              error={error.conditionType}
            />

            {conditionHelpContent && (
              <InfoCard
                icon={conditionHelpContent.icon}
                title={conditionHelpContent.title}
                description={conditionHelpContent.desc}
                bgColor={conditionHelpContent.bgColor}
                borderColor={conditionHelpContent.borderColor}
                textColor={conditionHelpContent.textColor}
              />
            )}
          </div>

          {/* Delay */}
          {showDelayField && (
            <div>
              <Selector
                name="delay"
                label="Delay"
                options={timeDelays}
                value={formData?.timeDelay!}
                onChange={(value) => handleInputChange("timeDelay", value)}
                error={error.timeDelay}
              />

              <TipBox
                message="The timer starts when a lead enters any of the selected stages. After the delay, it will automatically move to your action column."
                variant="warning"
              />
            </div>
          )}

          {/* Action */}

          <div>
            <TooltipLabel
              label="Action"
              tooltipText={
                <div className="space-y-1">
                  <p className="font-semibold mb-1">Destination column:</p>
                  <p>
                    Choose which column leads should move to when the condition
                    is met.
                  </p>
                  <p className="mt-2">
                    <strong>Note:</strong> Stages selected in the "Stage" field
                    are automatically excluded to prevent loops.
                  </p>
                </div>
              }
              required
              icon="question"
            />
            <Selector
              name="action"
              options={actionOptions}
              value={formData?.targetColumnId!}
              onChange={(value) => handleInputChange("targetColumnId", value)}
              required
              error={error.targetColumnId}
              labelClassName="hidden"
            />

            {formData?.stageIds?.length > 0 && formData.targetColumnId && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded flex items-center gap-2 text-xs text-green-900">
                <ArrowRight className="w-4 h-4 flex-shrink-0" />
                <span>
                  A lead in "
                  {formData.stageIds
                    .map((id) => stages.find((s) => s.id === id)?.title)
                    .join(", ")}{" "}
                  {}
                  will move to "{selectedActionStage?.title}" when the condition
                  is met.
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isUpdatePending || isCreatePending || isFormUnchanged}
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

        {/* <PipelineFlowVisualization 
        stageCount={formData.stageIds.length}
        condition={formData.conditionType}
        delay={formData.timeDelay!}
        action={selectedActionStage?.title || ""}
      /> */}

        {/* Add CSS for animations */}
        {/* <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}
      </style> */}
      </div>
    </>
  );
};

export default PipelineRuleForm;
