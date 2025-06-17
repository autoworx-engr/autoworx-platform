import { cn } from "@/lib/cn";
import { DraggableProvided } from "@hello-pangea/dnd";
import { Popconfirm } from "antd";
import { MdCancel } from "react-icons/md";
import LeadActions from "./LeadActions";
import LeadTags from "./LeadTags";
import { LeadWithSalesUser } from "@/types/invoiceLead";
import { memo } from "react";
import { useColumnDispatch } from "@/context/sales-pipeline.context";
import { actionTypes } from "@/constants/lead.constant";
import { removeLeadFromPipeline } from "@/actions/pipelines/updateLeadSalesUser";

type LeadCardProps = {
  provided: DraggableProvided;
  leadData: LeadWithSalesUser;
};

export default memo(function LeadCard({ provided, leadData }: LeadCardProps) {
  const dispatch = useColumnDispatch();

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
  return (
    <li
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      ref={provided.innerRef}
      className={cn(
        "max-w-auto relative mx-1 my-1 h-fit animate-none rounded-xl border bg-background p-1 duration-300 hover:bg-slate-100",
      )}
    >
      <div className="relative flex justify-between">
        <h3 className="font-inter pb-2 font-semibold text-black">
          {leadData.clientName || "No Name Provided"}
        </h3>
        <Popconfirm
          title="Delete the lead"
          description="Are you sure to delete this lead?It can't be undone"
          okText="Yes"
          cancelText="No"
          disabled={false}
          className="disabled:cursor-not-allowed disabled:opacity-50"
          onConfirm={() => handleRemoveLead(leadData.id, leadData?.columnId!)}
        >
          <MdCancel
            fontSize="medium"
            className="-mr-2 -mt-2 cursor-pointer text-2xl"
            style={{ color: "#6571FFed" }}
          />
        </Popconfirm>
      </div>
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
