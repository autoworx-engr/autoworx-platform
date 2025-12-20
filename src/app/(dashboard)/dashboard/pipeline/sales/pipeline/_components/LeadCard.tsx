"use client";

import React, { memo, useState, useRef, useEffect } from "react";
import { removeLeadFromPipeline } from "@/actions/pipelines/updateLeadSalesUser";
import { updateLeadColumn } from "@/actions/pipelines/getLeads";
import { actionTypes } from "@/constants/lead.constant";
import {
  useColumnDispatch,
  useColumnState,
} from "@/context/sales-pipeline.context";
import { cn } from "@/lib/cn";
import { LeadWithSalesUser } from "@/types/invoiceLead";
import { Popconfirm } from "antd";
import { errorToast, successToast } from "@/lib/toast";
import ColumnDropdown from "./ColumnDropdown";
import LeadActions from "./LeadActions";
import LeadTags from "./LeadTags";
import { ArrowRightLeft, X } from "lucide-react";
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { attachClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";

type LeadCardProps = {
  leadData: LeadWithSalesUser;
  highlight?: boolean;
  index: number;
  columnIndex: number;
  isDragDisabled: boolean;
};

export default memo(function LeadCard({
  leadData,
  highlight = false,
  index,
  columnIndex,
  isDragDisabled,
}: LeadCardProps) {
  const dispatch = useColumnDispatch();
  const pipelineColumns = useColumnState() || [];
  const [showColumnSelect, setShowColumnSelect] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || isDragDisabled) return;

    return combine(
      draggable({
        element: el,
        getInitialData: () => ({
          type: "card",
          leadId: leadData.id,
          index,
          columnId: leadData.columnId,
          columnIndex,
        }),
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false),
      }),
      dropTargetForElements({
        element: el,
        getData: ({ input, element }) => {
          const data = {
            type: "card",
            leadId: leadData.id,
            index,
            columnId: leadData.columnId,
            columnIndex,
          };
          return attachClosestEdge(data, {
            input,
            element,
            allowedEdges: ["top", "bottom"],
          });
        },
      })
    );
  }, [leadData, index, columnIndex, isDragDisabled]);

  const handleRemoveLead = async (leadId: number, columnId: number) => {
    try {
      await removeLeadFromPipeline(leadId);
      dispatch({
        type: actionTypes.REMOVE_LEAD,
        payload: { leadId, columnId },
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleColumnChange = async (newColumnId: string | null) => {
    if (!newColumnId || newColumnId === leadData.columnId?.toString()) {
      setShowColumnSelect(false);
      return;
    }

    try {
      const currentColumnIndex = pipelineColumns.findIndex(col => col.id === leadData.columnId);
      const destinationColumnIndex = pipelineColumns.findIndex(col => col.id === parseInt(newColumnId));
      if (currentColumnIndex === -1 || destinationColumnIndex === -1) return;

      const leadIndex = pipelineColumns[currentColumnIndex].leads.findIndex(l => l.id === leadData.id);

      dispatch({
        type: actionTypes.DRAG_END,
        payload: {
          source: { droppableId: currentColumnIndex.toString(), index: leadIndex },
          destination: { droppableId: destinationColumnIndex.toString(), index: pipelineColumns[destinationColumnIndex].leads.length },
          draggableId: leadData.id.toString(),
        },
      });

      await updateLeadColumn(leadData.id, parseInt(newColumnId));
      setShowColumnSelect(false);
      successToast("Job moved successfully");
    } catch (error) {
      errorToast("Failed to move job.");
    }
  };

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
      className={cn(
        "max-w-auto relative mx-1 my-1 h-fit rounded-xl border bg-background p-1 duration-300 hover:bg-slate-100",
        highlight && "bg-yellow-100",
        isDragging && "opacity-20 grayscale bg-slate-200"
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
        {new Date(leadData.createdAt).toLocaleDateString()}
      </p>

      <LeadActions lead={leadData} />
    </li>
  );
});