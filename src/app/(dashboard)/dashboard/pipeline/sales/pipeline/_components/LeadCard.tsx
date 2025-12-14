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
import { memo, useState } from "react";
import { errorToast, successToast } from "@/lib/toast";
import ColumnDropdown from "./ColumnDropdown";
import LeadActions from "./LeadActions";
import LeadTags from "./LeadTags";
import { ArrowRightLeft, CircleX, X } from "lucide-react";

type LeadCardProps = {
  leadData: LeadWithSalesUser;
  highlight?: boolean;
};

export default memo(function LeadCard({
  leadData,
  highlight = false,
}: LeadCardProps) {
  const dispatch = useColumnDispatch();
  const pipelineColumns = useColumnState() || [];
  const [showColumnSelect, setShowColumnSelect] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  const handleRemoveLead = async (leadId: number, columnId: number) => {
    try {
      await removeLeadFromPipeline(leadId);
      dispatch({
        type: actionTypes.REMOVE_LEAD,
        payload: { leadId, columnId },
      });
    } catch (error) {
      console.error("Error removing lead:", error);
    }
  };

  const handleColumnChange = async (newColumnId: string | null) => {
    if (!newColumnId || newColumnId === leadData.columnId?.toString()) {
      setShowColumnSelect(false);
      return;
    }

    try {
      const currentColumnIndex = pipelineColumns.findIndex(
        (col) => col.id === leadData.columnId
      );
      const destinationColumnIndex = pipelineColumns.findIndex(
        (col) => col.id === parseInt(newColumnId)
      );

      if (currentColumnIndex === -1 || destinationColumnIndex === -1) {
        errorToast("Invalid column selection");
        return;
      }

      const leadIndex = pipelineColumns[currentColumnIndex].leads.findIndex(
        (lead) => lead.id === leadData.id
      );

      if (leadIndex === -1) {
        errorToast("Lead not found in current column");
        return;
      }

      dispatch({
        type: actionTypes.DRAG_END,
        payload: {
          source: {
            droppableId: currentColumnIndex.toString(),
            index: leadIndex,
          },
          destination: {
            droppableId: destinationColumnIndex.toString(),
            index: pipelineColumns[destinationColumnIndex].leads.length,
          },
          draggableId: leadData.id.toString(),
        },
      });

      successToast("Job moved successfully");
      await updateLeadColumn(leadData.id, parseInt(newColumnId));
      setShowColumnSelect(false);
    } catch (error) {
      errorToast("Failed to move job. Please try again.");
      console.error("Error moving job:", error);
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
      className={cn(
        "max-w-auto relative mx-1 my-1 h-fit animate-none rounded-xl duration-300 hover:bg-slate-100",
        highlight && "bg-yellow-100"
      )}
    >
      <div className="relative flex justify-between">
        <h3 className="font-inter pb-2 font-semibold text-black">
          {leadData.clientName || "No Name Provided"}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowColumnSelect(!showColumnSelect);
              setIsOpen(!isOpen);
            }}
            className="cursor-pointer hover:text-blue-600 transition-colors md:hidden text-xl"
            title="Move to different column"
          >
            <ArrowRightLeft
              size={24}
              strokeWidth={2}
              style={{ color: "#6571FFed" }}
            />
          </button>

          <Popconfirm
            title="Delete the lead"
            description="Are you sure to delete this lead?It can't be undone"
            okText="Yes"
            cancelText="No"
            disabled={false}
            className="disabled:cursor-not-allowed disabled:opacity-50"
            onConfirm={() => handleRemoveLead(leadData.id, leadData?.columnId!)}
          >
            <div className="-mr-4 -mt-10 bg-[#6571FFed] rounded-full">
              <X
                size={18}
                strokeWidth={3}
                className=" cursor-pointer text-white p-0.5"
              />
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
        Creation Date: {new Date(leadData.createdAt).toLocaleDateString()}
      </p>

      <LeadActions lead={leadData} />
    </li>
  );
});
