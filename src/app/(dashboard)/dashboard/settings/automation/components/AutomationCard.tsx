"use client";
import { useDeleteCommunicationAutomationRule } from "@/hooks/communication-automation/useDeleteCommunicationAutomationRule";
import { useUpdateCommunicationAutomationRule } from "@/hooks/communication-automation/useUpdateCommunicationAutomationRule";
import { useDeleteInventoryAutomationRule } from "@/hooks/inventory-automation/useDeleteInventoryAutomationRule";
import { useUpdateInventoryAutomationRule } from "@/hooks/inventory-automation/useUpdateInventoryAutomationRule";
import { useDeleteInvoiceAutomationRule } from "@/hooks/invoice-automation/useDeleteInvoiceAutomationRule";
import { useUpdateInvoiceAutomationRule } from "@/hooks/invoice-automation/useUpdateInvoiceAutomationRule";
import { useDeleteMarketingAutomationRule } from "@/hooks/marketing-automation/useDeleteMarketingAutomationRule";
import { useUpdateMarketingAutomationRule } from "@/hooks/marketing-automation/useUpdateMarketingAutomationRule";
import { useDeleteReportingAutomationRule } from "@/hooks/reporting-automation/useDeleteReportingAutomationRule";
import { useUpdateReportingAutomationRule } from "@/hooks/reporting-automation/useUpdateReportingAutomationRule";
import { useDeleteServiceMaintenanceAutomationRule } from "@/hooks/service-maintenance-automation/useDeleteServicemaintenanceAutomationRule";
import { useUpdateServiceMaintenanceAutomationRule } from "@/hooks/service-maintenance-automation/useUpdateServiceMaintenanceAutomationRule";
import { useDeleteTagAutomationRule } from "@/hooks/tag-automation/useDeleteTagAutomationRule";
import { useUpdateTagAutomationRule } from "@/hooks/tag-automation/useUpdateTagAutomationRule";
import { errorToast } from "@/lib/toast";
import { Popconfirm, Spin } from "antd";
import { CirclePause, CirclePlay, PencilLineIcon, Trash2 } from "lucide-react";
import moment from "moment";
import { FC } from "react";
import { useDeletePipelineAutomationRule } from "../../../../../../hooks/pipeline-automation/useDeletePipelineAutomationRule";
import { useUpdatePipelineAutomationRule } from "../../../../../../hooks/pipeline-automation/useUpdatePipelineAutomationRule";

interface Item {
  id: string;
  title?: string;
  isPaused?: boolean;
  targetColumnId: number;
  startTime?: Date;
  date?: Date;
  target?: string[];
  isActive?: boolean;
}

interface AutomationCardProps {
  item: Item;
  setIsCreate: any;
  setIsEdit: any;
  setId: any;
  type: string;
  companyId: string;
  index: any;
}

const AutomationCard: FC<AutomationCardProps> = ({
  item,
  setIsCreate,
  setIsEdit,
  setId,
  type,
  companyId,
  index,
}) => {
  const { mutate: deletePipelineRule, isPending: isPipelineDeleting } =
    useDeletePipelineAutomationRule();
  const { mutate: updatePipelineRule, isPending: isPipelineUpdating } =
    useUpdatePipelineAutomationRule();
  const {
    mutate: updateCommunicationRule,
    isPending: isCommunicationUpdating,
  } = useUpdateCommunicationAutomationRule();
  const {
    mutate: deleteCommunicationRule,
    isPending: isCommunicationDeleting,
  } = useDeleteCommunicationAutomationRule();
  const { mutate: updateMarketingRule, isPending: isMarketingUpdating } =
    useUpdateMarketingAutomationRule();
  const { mutate: deleteMarketingRule, isPending: isMarketingDeleting } =
    useDeleteMarketingAutomationRule();

  const { mutate: updateServiceRule, isPending: isServiceUpdating } =
    useUpdateServiceMaintenanceAutomationRule();
  const { mutate: deleteServiceRule, isPending: isServiceDeleting } =
    useDeleteServiceMaintenanceAutomationRule();
  const { mutate: deleteInvoiceRule, isPending: isInvoiceDeleting } =
    useDeleteInvoiceAutomationRule();

  const { mutate: deleteInventoryRule, isPending: isInventoryDeleting } =
    useDeleteInventoryAutomationRule();
  const { mutate: deleteTagRule, isPending: isTagDeleting } =
    useDeleteTagAutomationRule();
  const { mutate: deleteReportingRule, isPending: isReportingDeleting } =
    useDeleteReportingAutomationRule();

  const { mutate: updateInvoiceRule, isPending: isInvoiceUpdating } =
    useUpdateInvoiceAutomationRule();
  const { mutate: updateInventory, isPending: isInventoryUpdating } =
    useUpdateInventoryAutomationRule();
  const { mutate: updateTagRule, isPending: isTagUpdating } =
    useUpdateTagAutomationRule();

  const { mutate: updateReportingAutomation, isPending: isReportingUpdating } =
    useUpdateReportingAutomationRule();
  const handleSetIsEdit = (id: any) => {
    setId(id);
    setIsCreate(false);
    setIsEdit(true);
  };

  const handlePause = (id: string) => {
    let data: { isActive?: boolean; isPaused?: boolean } = {
      isPaused: !item.isPaused,
    };
    if (type == "pipeline") {
      updatePipelineRule({ id: id, data: data });
    } else if (type == "communication") {
      updateCommunicationRule({ id: id, companyId: companyId, data: data });
    } else if (type === "service-maintenance") {
      updateServiceRule({ id: id, data: data });
    } else if (type === "invoice") {
      updateInvoiceRule({ id: id, data: data });
    } else if (type === "inventory") {
      updateInventory({ id, data: data });
    } else if (type === "tag") {
      updateTagRule({ id, companyId, data });
    } else if (type === "reporting") {
      updateReportingAutomation({ id, data: data });
    } else if (type == "marketing") {
      const now = Date.now();

      const ruleDate = new Date(item.date!);
      const startTime = new Date(item.startTime!);
      // Combine date + time to get scheduled timestamp
      const scheduledDateTime = new Date(
        ruleDate.getFullYear(),
        ruleDate.getMonth(),
        ruleDate.getDate(),
        startTime.getHours(),
        startTime.getMinutes(),
        startTime.getSeconds(),
      ).getTime();

      const delay = Math.max(0, scheduledDateTime - now);

      if (
        item.isPaused == true &&
        item.isActive == false &&
        data.isPaused == false
      ) {
        // If delay is 0, it means the scheduled time is now or in the past
        if (delay <= 0) {
          setId(id);
          setIsCreate(false);
          setIsEdit(true);
          errorToast(
            "Please update the campaign start date and then resume the rule!",
          );
          return;
        }

        data = {
          isPaused: false,
          isActive: true,
        };
        updateMarketingRule({ id: id, data: data });
        return;
      }

      updateMarketingRule({ id: id, data: data });
    }
  };

  const handleDelete = (id: string) => {
    if (type == "pipeline") {
      deletePipelineRule(id);
    } else if (type == "communication") {
      deleteCommunicationRule(id);
    } else if (type == "marketing") {
      deleteMarketingRule(id);
    } else if (type == "service-maintenance") {
      deleteServiceRule(id);
    } else if (type == "invoice") {
      deleteInvoiceRule(id);
    } else if (type == "inventory") {
      deleteInventoryRule(id);
    } else if (type === "tag") {
      deleteTagRule(id);
    } else if (type === "reporting") {
      deleteReportingRule(id);
    }

    setIsCreate(false);
    setIsEdit(false);
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <div
        key={item.id}
        className="relative flex items-center justify-between rounded-lg border bg-white p-4 transition hover:shadow"
      >
        <div className="font-medium text-gray-700">
          {type != "marketing" ? item?.title : `Campaign-${index + 1}`}
        </div>

        {item.startTime && type == "marketing" ? (
          <div className="absolute left-1/2 top-0 flex w-[85%] -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-2 rounded-md bg-primary px-4 py-0.5 text-xs text-white shadow-md 2xl:w-[60%]">
            <span className="font-semibold text-xs">Starts:</span>
            <span className="text-xs">
              {moment(item.startTime).format("MMM-DD-YY, h:mm A")}{" "}
              {item.isActive && (
                <span
                  className={`h-2 w-2 rounded-full ${item.isActive ? "bg-green-500" : "bg-red-500"}`}
                ></span>
              )}
            </span>
          </div>
        ) : (
          <></>
        )}

        <div className="flex items-center gap-3 text-lg">
          {(type === "pipeline" && isPipelineUpdating) ||
          (type === "communication" && isCommunicationUpdating) ||
          (type === "marketing" && isMarketingUpdating) ||
          (type === "service-maintenance" && isServiceUpdating) ||
          (type === "tag" && isTagUpdating) ||
          (type === "inventory" && isInventoryUpdating) ||
          (type === "invoice" && isInvoiceUpdating) ||
          (type === "reporting" && isReportingUpdating) ? (
            <button>
              <Spin />
            </button>
          ) : (
            <button
              onClick={() => handlePause(item.id)}
              className="text-primary hover:text-indigo-700"
            >
              {item?.isPaused ? (
                <CirclePlay size={20} />
              ) : (
                <CirclePause size={20} />
              )}
            </button>
          )}

          <button
            onClick={() => handleSetIsEdit(item.id)}
            className="text-primary hover:text-indigo-700"
          >
            <PencilLineIcon size={20} />
          </button>

          {(type === "pipeline" && isPipelineDeleting) ||
          (type === "communication" && isCommunicationDeleting) ||
          (type === "marketing" && isMarketingDeleting) ||
          (type === "service-maintenance" && isServiceDeleting) ||
          (type === "tag" && isTagDeleting) ||
          (type === "inventory" && isInventoryDeleting) ||
          (type === "invoice" && isInvoiceDeleting) ||
          (type === "reporting" && isReportingDeleting) ? (
            <button>
              <Spin />
            </button>
          ) : (
            <Popconfirm
              title="Delete the automation rule"
              description="Are you sure to delete this automation rule?"
              okText="Yes"
              cancelText="No"
              onConfirm={() => handleDelete(item.id)}
              overlayClassName="[&_.ant-popover-inner]:rounded-2xl [&_.ant-popover-inner]:p-4 [&_.ant-popover-message-title]:font-semibold [&_.ant-popover-message-title]:text-slate-800"
              okButtonProps={{
                className:
                  "!rounded-lg !border-none !bg-[#6571ff] !font-semibold !shadow-sm !shadow-[#6571ff]/30 hover:!bg-[#525ceb]",
              }}
              cancelButtonProps={{
                className:
                  "!rounded-lg !border-slate-200 !font-medium !text-slate-600 hover:!border-slate-300 hover:!bg-slate-50 hover:!text-slate-700",
              }}
            >
              <span>
                <Trash2 cursor="pointer" color="#f87171" size={20} />
              </span>
            </Popconfirm>
          )}
        </div>
      </div>
    </div>
  );
};

export default AutomationCard;
