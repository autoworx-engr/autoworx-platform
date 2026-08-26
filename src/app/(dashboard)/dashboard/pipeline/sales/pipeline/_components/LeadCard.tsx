"use client";

import { actionTypes } from "@/constants/lead.constant";
import {
  useColumnDispatch,
  useColumnState,
} from "@/context/sales-pipeline.context";
import {
  useRemoveLeadMutation,
  useUpdateLeadColumnMutation,
} from "@/hooks/pipeline/usePipelineLeads";
import { cn } from "@/lib/cn";
import { errorToast, successToast } from "@/lib/toast";
import { LeadWithSalesUser } from "@/types/invoiceLead";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { Popconfirm } from "antd";
import { ArrowRightLeft, X } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import ColumnDropdown from "./ColumnDropdown";
import LeadActions from "./LeadActions";
import LeadTags from "./LeadTags";

type LeadCardProps = {
  leadData: LeadWithSalesUser;
  highlight?: boolean;
  index?: number;
  columnIndex?: number;
  isDragDisabled?: boolean;
  leadIndex?: number;
};

export default memo(function LeadCard({
  leadData,
  highlight = false,
  columnIndex,
  isDragDisabled,
  leadIndex,
}: LeadCardProps) {
  const dispatch = useColumnDispatch();
  const pipelineColumns = useColumnState() || [];
  const [showColumnSelect, setShowColumnSelect] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const cardRef = useRef<HTMLLIElement>(null);

  const { mutateAsync: removeLead } = useRemoveLeadMutation();
  const { mutateAsync: updateColumn } = useUpdateLeadColumnMutation();

  const handleRemoveLead = async (leadId: number, columnId: number) => {
    try {
      await removeLead(leadId);
      dispatch({
        type: actionTypes.REMOVE_LEAD,
        payload: { leadId, columnId },
      });
    } catch (error) {
      console.error(error);
      errorToast("Failed to remove lead.");
    }
  };

  const handleColumnChange = async (newColumnId: string | null) => {
    if (!newColumnId || newColumnId === leadData.columnId?.toString()) {
      setShowColumnSelect(false);
      return;
    }

    const currentColumnIndex = pipelineColumns.findIndex(
      (col) => col.id === leadData.columnId,
    );
    const destinationColumnIndex = pipelineColumns.findIndex(
      (col) => col.id === parseInt(newColumnId),
    );
    if (currentColumnIndex === -1 || destinationColumnIndex === -1) return;

    const leadIndex = pipelineColumns[currentColumnIndex].leads.findIndex(
      (l) => l.id === leadData.id,
    );
    // Capture original destination length before the optimistic dispatch
    const originalDestLength =
      pipelineColumns[destinationColumnIndex].leads.length;

    try {
      // Optimistic update
      dispatch({
        type: actionTypes.DRAG_END,
        payload: {
          source: {
            droppableId: currentColumnIndex.toString(),
            index: leadIndex,
          },
          destination: {
            droppableId: destinationColumnIndex.toString(),
            index: originalDestLength,
          },
          draggableId: leadData.id.toString(),
        },
      });

      await updateColumn({
        leadId: leadData.id,
        columnId: parseInt(newColumnId),
      });
      setShowColumnSelect(false);
      successToast("Job moved successfully");
    } catch (error) {
      // Rollback: move lead back to its original column and position
      dispatch({
        type: actionTypes.DRAG_END,
        payload: {
          source: {
            droppableId: destinationColumnIndex.toString(),
            index: originalDestLength,
          },
          destination: {
            droppableId: currentColumnIndex.toString(),
            index: leadIndex,
          },
          draggableId: leadData.id.toString(),
        },
      });
      errorToast("Failed to move job.");
    }
  };

  useEffect(() => {
    const element = cardRef.current;
    if (!element || isDragDisabled) {
      return;
    }

    return combine(
      draggable({
        element,
        getInitialData: (): {
          leadId: string;
          columnIndex: number | undefined;
          leadIndex: number | undefined;
        } => ({
          leadId: leadData.id.toString(),
          columnIndex,
          leadIndex,
        }),
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false),
      }),
      dropTargetForElements({
        element,
        getData: () => ({
          leadId: leadData.id.toString(),
          columnIndex,
          leadIndex,
          targetType: "card",
          targetLeadIndex: leadIndex,
        }),
        onDragEnter: () => setIsDropTarget(true),
        onDragLeave: () => setIsDropTarget(false),
        onDrop: () => setIsDropTarget(false),
      }),
    );
  }, [leadData.id, columnIndex, leadIndex, isDragDisabled]);

  const columnOptions = pipelineColumns
    .filter((col) => col.id !== leadData.columnId && col.id != null)
    .map((col) => ({
      id: col.id,
      value: col.id!.toString(),
      label: col.title || "Untitled Column",
    }));

  return (
    <li
      ref={cardRef}
      data-lead-id={leadData.id}
      data-column-index={columnIndex}
      data-lead-index={leadIndex}
      className={cn(
        "max-w-auto relative mx-1 my-1 h-fit rounded-xl border bg-background p-1 duration-300 hover:bg-slate-100 cursor-grab active:cursor-grabbing",
        highlight && "bg-yellow-100",
        isDragging && "opacity-20 grayscale bg-slate-200 ",
        isDropTarget && "ring-2 ring-blue-500 bg-blue-50",
      )}
    >
      <div className="relative flex justify-between">
        <h3 className="font-inter pb-2 font-semibold text-black">
          {leadData.clientName || "No Name Provided"}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowColumnSelect(!showColumnSelect)}
            className="cursor-pointer transition-colors md:hidden text-xl hover:text-blue-600"
          >
            <ArrowRightLeft size={24} style={{ color: "#6571FFed" }} />
          </button>

          <Popconfirm
            title="Delete the lead"
            onConfirm={() => handleRemoveLead(leadData.id, leadData?.columnId!)}
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
            <div className="absolute -top-3 -right-2 bg-[#6571FFed] rounded-full">
              <X size={18} className="cursor-pointer text-white p-0.5" />
            </div>
          </Popconfirm>
        </div>
      </div>

      {showColumnSelect && (
        <ColumnDropdown
          options={columnOptions}
          onSelect={handleColumnChange}
          onClose={() => setShowColumnSelect(false)}
          isOpen={showColumnSelect}
        />
      )}

      <LeadTags leadTags={leadData.leadTags} lead={leadData} />
      <p className="text-xs">{leadData.vehicleInfo}</p>
      <p className="text-xs text-blue-500">{leadData.services}</p>
      <p className="text-xs">{leadData.source}</p>
      <p className="mb-2 text-xs">
        {new Date(leadData.createdAt).toLocaleDateString("en-US")}
      </p>

      <LeadActions lead={leadData} />
    </li>
  );
});
