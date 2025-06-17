"use client";
import { DragDropContext } from "@hello-pangea/dnd";
import LeadDroppableContainer from "./LeadDroppableContainer";
import {
  useColumnDispatch,
  useColumnState,
} from "@/context/sales-pipeline.context";
import { actionTypes } from "@/constants/lead.constant";
import { updateLeadColumn } from "@/actions/pipelines/getLeads";
import { errorToast, successToast } from "@/lib/toast";

export default function SalesPipelineSection() {
  const pipelineColumns = useColumnState() || [];

  const dispatch = useColumnDispatch();

  const handleDragEnd = async (result: any) => {
    const { destination, source, draggableId: draggableLeadId } = result;

    try {
      const newColumnId = pipelineColumns[Number(destination.droppableId)]?.id;

      if (!newColumnId) {
        throw new Error("Lead destination not found");
      }

      if (source.droppableId === destination.droppableId) {
        return;
      }

      // update then state like optimistically
      dispatch({
        type: actionTypes.DRAG_END,
        payload: {
          source,
          destination,
          draggableId: draggableLeadId,
        },
      });

      const updatedLead = await updateLeadColumn(
        Number(draggableLeadId),
        newColumnId,
      );

      if (updatedLead) {
        successToast("Lead column updated successfully");
        console.log("Lead column updated successfully:");
      } else {
        console.error("Failed to update lead column");
      }
    } catch (error) {
      console.error("Error in handleDragEnd:", error);
      dispatch({
        type: actionTypes.DRAG_END,
        payload: {
          source: {
            droppableId: destination?.droppableId,
            index: destination?.index,
          },
          destination: {
            droppableId: source?.droppableId,
            index: source?.index,
          },
          draggableId: draggableLeadId,
        },
      });
      errorToast("Failed to update lead column. Please try again.");
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="h-full w-full overflow-hidden px-2">
        <div className="thin-scrollbar flex touch-pan-x snap-x snap-mandatory flex-nowrap justify-between gap-2 overflow-x-auto">
          {/* Todo: pass children */}
          {pipelineColumns.map((column, columnIndex) => (
            <LeadDroppableContainer
              key={column.id}
              column={column}
              columnIndex={columnIndex}
            />
          ))}
        </div>
      </div>
    </DragDropContext>
  );
}
