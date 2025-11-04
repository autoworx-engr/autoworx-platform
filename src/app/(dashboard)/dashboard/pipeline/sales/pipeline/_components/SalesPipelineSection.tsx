"use client";
import { updateLeadColumn } from "@/actions/pipelines/getLeads";
import { actionTypes } from "@/constants/lead.constant";
import {
  useColumnDispatch,
  useColumnState,
} from "@/context/sales-pipeline.context";
import { errorToast, successToast } from "@/lib/toast";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { useEffect, useRef, useState } from "react";
import LeadCard from "./LeadCard";
import LeadInfinityScroll from "./LeadInfinityScroll";

export default function SalesPipelineSection() {
  const pipelineColumns = useColumnState() || [];
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [screenWidth, setScreenWidth] = useState<number>(window.innerWidth);

  function updateWidth() {
    setScreenWidth(window.innerWidth);
  }

  useEffect(() => {
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Mark initial load as complete after first render
  useEffect(() => {
    if (isInitialLoad && pipelineColumns.length > 0) {
      // Small delay to ensure the UI is fully rendered before allowing background operations
      const timer = setTimeout(() => {
        setIsInitialLoad(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isInitialLoad, pipelineColumns.length]);

  // DnD logic - optimized with better error handling
  const dispatch = useColumnDispatch();
  const handleDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Optimistic update - update UI immediately
    dispatch({
      type: actionTypes.DRAG_END,
      payload: { source, destination, draggableId },
    });

    // Only make API call if moving between columns
    if (destination.droppableId !== source.droppableId) {
      try {
        const newColumnId =
          pipelineColumns[Number(destination.droppableId)]?.id;
        if (newColumnId) {
          successToast("Lead column updated successfully");
          await updateLeadColumn(Number(draggableId), newColumnId);
        }
      } catch (error) {
        console.error("Failed to update lead column:", error);
        // Revert the optimistic update on error
        dispatch({
          type: actionTypes.DRAG_END,
          payload: {
            source: destination,
            destination: source,
            draggableId,
          },
        });
        errorToast("Failed to update lead column. Please try again.");
      }
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="h-full w-full overflow-hidden px-2">
        <div className="thin-scrollbar flex touch-pan-x snap-x snap-mandatory flex-nowrap justify-between gap-2 overflow-x-auto">
          {pipelineColumns.map((column, columnIndex) => (
            <Droppable
              droppableId={`${columnIndex}`}
              key={columnIndex}
              isDropDisabled={screenWidth < 768}
            >
              {(provided) => (
                <div
                  ref={(el) => {
                    provided.innerRef(el);
                    columnRefs.current[columnIndex] = el;
                  }}
                  className="mx-2 w-[calc(100vw-2rem)] flex-shrink-0 rounded-md border sm:min-w-80 sm:flex-1 lg:min-w-[calc(100%/3-1.5rem)] xl:min-w-[calc(100%/4-1.5rem)] 2xl:min-w-[calc(100%/6-1.5rem)]"
                  style={{
                    backgroundColor: "rgba(101, 113, 255, 0.15)",
                    padding: "0",
                  }}
                >
                  <h2 className="rounded-lg bg-[#6571FF] px-4 py-3 text-center text-white">
                    <p className="text-base font-bold">
                      {column.title || ""}
                      <span className="ml-2 rounded-lg bg-[#3F49B9] px-2">
                        {column?.leads?.length || 0}
                      </span>
                    </p>
                  </h2>
                  <LeadInfinityScroll
                    provided={provided}
                    columnTitle={column.title || ""}
                    columnId={column.id}
                    leads={column.leads}
                  >
                    {(leads) =>
                      leads.map((lead, leadIndex) => (
                        <Draggable
                          key={lead.id}
                          draggableId={lead.id.toString()}
                          index={leadIndex}
                          isDragDisabled={screenWidth < 768}
                        >
                          {(provided) => (
                            <li
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              ref={provided.innerRef}
                              className="max-w-auto relative mx-1 my-1 h-fit animate-none rounded-xl border bg-background p-1 duration-300 hover:bg-slate-100"
                            >
                              <LeadCard leadData={lead} />
                            </li>
                          )}
                        </Draggable>
                      ))
                    }
                  </LeadInfinityScroll>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </div>
    </DragDropContext>
  );
}
