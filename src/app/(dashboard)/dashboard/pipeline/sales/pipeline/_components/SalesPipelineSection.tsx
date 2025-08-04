"use client";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import SearchScroll from "@/app/(dashboard)/dashboard/pipeline/components/SearchScroll";
import { useRef, useState, useEffect } from "react";
import {
  useColumnState,
  useColumnDispatch,
} from "@/context/sales-pipeline.context";
import { actionTypes } from "@/constants/lead.constant";
import { updateLeadColumn } from "@/actions/pipelines/getLeads";
import { errorToast, successToast } from "@/lib/toast";
import LeadCard from "./LeadCard";
import { useBackgroundLeadLoader } from "@/hooks/useBackgroundLeadLoader";

export default function SalesPipelineSection() {
  const pipelineColumns = useColumnState() || [];
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const leadRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Load remaining leads in background for better perceived performance
  // This is now optimized to not block navigation
  useBackgroundLeadLoader();

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

  // Search and highlight logic (shop pipeline style)
  const handleSearchResult = (
    result: { columnIndex: number; leadIndex: number } | null
  ) => {
    if (!result) return;
    const { columnIndex, leadIndex } = result;
    if (columnRefs.current[columnIndex]) {
      columnRefs.current[columnIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "start",
      });
      setTimeout(() => {
        const leadKey = `${columnIndex}-${leadIndex}`;
        const leadElement = leadRefs.current.get(leadKey);
        if (leadElement) {
          leadElement.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
          leadElement.classList.add("bg-yellow-100");
          setTimeout(() => {
            leadElement.classList.remove("bg-yellow-100");
          }, 2000);
        }
      }, 300);
    }
  };

  // DnD logic (shop pipeline style) - optimized with better error handling
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
          await updateLeadColumn(Number(draggableId), newColumnId);
          successToast("Lead column updated successfully");
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
    <div>
      <div className="mb-4 px-2">
        <SearchScroll
          pipelineData={pipelineColumns}
          onSearchResult={handleSearchResult}
        />
      </div>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="h-full w-full overflow-hidden px-2">
          <div className="thin-scrollbar flex touch-pan-x snap-x snap-mandatory flex-nowrap justify-between gap-2 overflow-x-auto">
            {pipelineColumns.map((column, columnIndex) => (
              <Droppable droppableId={`${columnIndex}`} key={columnIndex}>
                {(provided) => (
                  <div
                    {...provided.droppableProps}
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
                          {column.leads.length}
                        </span>
                      </p>
                    </h2>
                    <ul
                      className="thin-scrollbar mt-1 flex max-h-[70vh] min-h-[70vh] flex-col gap-1 overflow-y-auto p-1"
                      style={{ maxHeight: "70vh" }}
                    >
                      {column.leads.map((lead, leadIndex) => {
                        const key = `${columnIndex}-${leadIndex}`;
                        return (
                          <Draggable
                            key={lead.id}
                            draggableId={lead.id.toString()}
                            index={leadIndex}
                          >
                            {(provided) => (
                              <li
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                ref={(el) => {
                                  provided.innerRef(el);
                                  if (el) leadRefs.current.set(key, el);
                                }}
                                className="max-w-auto relative mx-1 my-1 h-fit animate-none rounded-xl border bg-background p-1 duration-300 hover:bg-slate-100"
                              >
                                <LeadCard leadData={lead} />
                              </li>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </ul>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
