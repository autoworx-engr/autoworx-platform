"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";

import { actionTypes } from "@/constants/lead.constant";
import {
  useColumnDispatch,
  useColumnState,
} from "@/context/sales-pipeline.context";
import { errorToast, successToast } from "@/lib/toast";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import LeadCard from "./LeadCard";
import LeadInfinityScroll from "./LeadInfinityScroll";

export default function SalesPipelineSection() {
  const columnState = useColumnState();
  const pipelineColumns = useMemo(() => columnState || [], [columnState]);
  const dispatch = useColumnDispatch();
  const [screenWidth, setScreenWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1200,
  );
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function updateWidth() {
      setScreenWidth(window.innerWidth);
    }
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useEffect(() => {
    // Disable drag and drop on mobile
    if (screenWidth < 768) {
      return;
    }

    return monitorForElements({
      onDrop({ source, location }) {
        const destination = location.current.dropTargets[0];
        if (!destination) {
          return;
        }

        const dragData = source.data as {
          leadId: string;
          columnIndex: number;
          leadIndex: number;
        };
        const dropData = destination.data as {
          columnIndex: number;
          targetType: "column" | "card";
          targetLeadIndex?: number;
          closestEdge?: "top" | "bottom";
        };

        const sourceColumnIndex = dragData.columnIndex;
        const sourceLeadIndex = dragData.leadIndex;
        const destinationColumnIndex = dropData.columnIndex;

        // Calculate destination index - get all leads in destination column
        // const destinationLeads =
        //   pipelineColumns[destinationColumnIndex]?.leads || [];
        // const destinationLeadIndex = destinationLeads.length;

        let destinationLeadIndex: number;

        if (
          dropData.targetType === "card" &&
          dropData.targetLeadIndex !== undefined
        ) {
          // Dropped on a specific card
          const edge = dropData.closestEdge;
          destinationLeadIndex = dropData.targetLeadIndex;

          // If dropping below, insert after the target
          if (edge === "bottom") {
            destinationLeadIndex += 1;
          }

          // Adjust index if moving within same column
          if (
            sourceColumnIndex === destinationColumnIndex &&
            sourceLeadIndex < destinationLeadIndex
          ) {
            destinationLeadIndex -= 1;
          }
        } else {
          // Dropped on empty column area - add to end
          const destinationLeads =
            pipelineColumns[destinationColumnIndex]?.leads || [];
          destinationLeadIndex = destinationLeads.length;
        }
        // Don't do anything if dropped in same position
        if (
          sourceColumnIndex === destinationColumnIndex &&
          sourceLeadIndex === destinationLeadIndex
        ) {
          return;
        }

        // Optimistic update - update UI immediately
        dispatch({
          type: actionTypes.DRAG_END,
          payload: {
            source: {
              droppableId: sourceColumnIndex.toString(),
              index: sourceLeadIndex,
            },
            destination: {
              droppableId: destinationColumnIndex.toString(),
              index: destinationLeadIndex,
            },
            draggableId: dragData.leadId,
          },
        });

        // Only make API call if moving between columns
        if (sourceColumnIndex !== destinationColumnIndex) {
          const newColumnId = pipelineColumns[destinationColumnIndex]?.id;
          if (newColumnId) {
            successToast("Lead column updated successfully");
            fetch(`/api/pipeline/sales/leads/${dragData.leadId}/column`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ newColumnId }),
            })
              .then((res) => res.json())
              .then((data) => {
                if (!data.success) throw new Error(data.error);
              })
              .catch((error) => {
                console.error("Failed to update lead column:", error);
                // Revert the optimistic update on error
                dispatch({
                  type: actionTypes.DRAG_END,
                  payload: {
                    source: {
                      droppableId: destinationColumnIndex.toString(),
                      index: destinationLeadIndex,
                    },
                    destination: {
                      droppableId: sourceColumnIndex.toString(),
                      index: sourceLeadIndex,
                    },
                    draggableId: dragData.leadId,
                  },
                });
                errorToast("Failed to update lead column. Please try again.");
              });
          }
        }
      },
    });
  }, [dispatch, pipelineColumns, screenWidth]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || screenWidth < 768) return;
    return autoScrollForElements({ element: el });
  }, [screenWidth]);
  return (
    <div className="h-full w-full overflow-hidden px-2">
      <div
        ref={scrollContainerRef}
        className="flex touch-pan-x snap-x snap-mandatory flex-nowrap justify-between gap-2 overflow-x-auto"
      >
        {pipelineColumns.map((column, columnIndex) => {
          return (
            <LeadInfinityScroll
              key={columnIndex}
              columnTitle={column.title || ""}
              columnId={column.id}
              columnIndex={columnIndex}
              leads={column.leads}
              screenWidth={screenWidth}
              totalLeads={column?.totalLeads || 0}
            >
              {(leads) =>
                leads.map((lead, leadIndex) => (
                  <LeadCard
                    key={lead.id}
                    leadData={lead}
                    index={leadIndex}
                    columnIndex={columnIndex}
                    isDragDisabled={screenWidth < 768}
                    leadIndex={leadIndex}
                  />
                ))
              }
            </LeadInfinityScroll>
          );
        })}
      </div>
    </div>
  );
}
