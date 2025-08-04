"use client";
import { FC, useState } from "react";
import { BiSolidEditAlt } from "react-icons/bi";
import { FaRegCirclePause } from "react-icons/fa6";
import { FiTrash2 } from "react-icons/fi";
import { IoPlayCircleOutline } from "react-icons/io5";
import { useDeletePipelineAutomationRule } from "../../../../../../hooks/pipeline-automation/useDeletePipelineAutomationRule";
import { useUpdatePipelineAutomationRule } from "../../../../../../hooks/pipeline-automation/useUpdatePipelineAutomationRule";
import { useUpdateCommunicationAutomationRule } from "@/hooks/communication-automation/useUpdateCommunicationAutomationRule";
import { useDeleteCommunicationAutomationRule } from "@/hooks/communication-automation/useDeleteCommunicationAutomationRule";
import { getTitleById, targetOptions } from "./constants";
import moment from "moment";
import { useDeleteMarketingAutomationRule } from "@/hooks/marketing-automation/useDeleteMarketingAutomationRule";
import { useUpdateMarketingAutomationRule } from "@/hooks/marketing-automation/useUpdateMarketingAutomationRule";
import { errorToast } from "@/lib/toast";
import { useUpdateServiceMaintenanceAutomationRule } from "@/hooks/service-maintenance-automation/useUpdateServiceMaintenanceAutomationRule";
import { useDeleteServiceMaintenanceAutomationRule } from "@/hooks/service-maintenance-automation/useDeleteServicemaintenanceAutomationRule";
import { RiLoader2Fill } from "react-icons/ri";
import { Popconfirm, Spin } from "antd";
import { useDeleteInvoiceAutomationRule } from "@/hooks/invoice-automation/useDeleteInvoiceAutomationRule";
import { useUpdateInvoiceAutomationRule } from "@/hooks/invoice-automation/useUpdateInvoiceAutomationRule";
import { useDeleteInventoryAutomationRule } from "@/hooks/inventory-automation/useDeleteInventoryAutomationRule";
import { useUpdateInventoryAutomationRule } from "@/hooks/inventory-automation/useUpdateInventoryAutomationRule";

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

  const { mutate: updateInvoiceRule, isPending: isInvoiceUpdating } =
    useUpdateInvoiceAutomationRule();
  const { mutate: updateInventory, isPending: isInventoryUpdating } =
    useUpdateInventoryAutomationRule();

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
          <div className="absolute left-1/2 top-0 flex w-[85%] -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-2 rounded-md bg-[#6571FF] px-4 py-0.5 text-xs text-white shadow-md 2xl:w-[60%]">
            <span className="font-semibold">Starts:</span>
            <span>
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
          {isPipelineUpdating ||
          isCommunicationUpdating ||
          isMarketingUpdating ||
          isServiceUpdating ? (
            <button>
              <Spin />
            </button>
          ) : (
            <button
              onClick={() => handlePause(item.id)}
              className="text-[#6571FF] hover:text-indigo-700"
            >
              {item?.isPaused ? (
                <IoPlayCircleOutline className="h-5 w-5" />
              ) : (
                <FaRegCirclePause />
              )}
            </button>
          )}

          <button
            onClick={() => handleSetIsEdit(item.id)}
            className="text-[#6571FF] hover:text-indigo-700"
          >
            <BiSolidEditAlt />
          </button>

          {isPipelineDeleting ||
          isCommunicationDeleting ||
          isMarketingDeleting ||
          isServiceDeleting ? (
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
            >
              <span>
                <FiTrash2 cursor="pointer" color="#f87171" fontSize={20} />
              </span>
            </Popconfirm>
          )}
        </div>
      </div>
    </div>
  );
};

export default AutomationCard;
