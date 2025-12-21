"use client";

import React, { useEffect, useRef, useState } from "react";
import { updateLeadColumn } from "@/actions/pipelines/getLeads";
import { actionTypes } from "@/constants/lead.constant";
import {
  useColumnDispatch,
  useColumnState,
} from "@/context/sales-pipeline.context";
import { errorToast, successToast } from "@/lib/toast";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { getReorderDestinationIndex } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index";
import LeadCard from "./LeadCard";
import LeadInfinityScroll from "./LeadInfinityScroll";

export default function SalesPipelineSection() {
  const pipelineColumns = useColumnState() || [];
  const dispatch = useColumnDispatch();
  const [screenWidth, setScreenWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function updateWidth() {
      setScreenWidth(window.innerWidth);
    }
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Enable horizontal auto-scroll of the columns container during drag (desktop)
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || screenWidth < 768) return;
    return autoScrollForElements({ element: el });
  }, [screenWidth]);

  useEffect(() => {
    return monitorForElements({
      onDrop({ source, location }) {
        const destination = location.current.dropTargets[0];
        if (!destination) return;

        const sourceData = source.data as {
          type: string;
          leadId: number;
          index: number;
          columnIndex: number;
          columnId: number | null;
        };

        const destinationData = destination.data as {
          type: string;
          columnId: number | null;
          columnIndex: number;
          index: number;
        };

        if (sourceData.type === "card") {
          const closestEdgeOfTarget = extractClosestEdge(destination.data);

          // Use getReorderDestinationIndex for all cases - it handles both same-column and cross-column correctly
          const finalIndex = getReorderDestinationIndex({
            startIndex: sourceData.index,
            indexOfTarget: destinationData.index,
            closestEdgeOfTarget,
            axis: "vertical",
          });

          if (
            sourceData.columnIndex === destinationData.columnIndex &&
            sourceData.index === finalIndex
          ) {
            return;
          }

          const draggableId = sourceData.leadId.toString();
          const sourcePayload = {
            droppableId: sourceData.columnIndex.toString(),
            index: sourceData.index,
          };
          const destinationPayload = {
            droppableId: destinationData.columnIndex.toString(),
            index: finalIndex,
          };

          dispatch({
            type: actionTypes.DRAG_END,
            payload: {
              source: sourcePayload,
              destination: destinationPayload,
              draggableId,
            },
          });

          if (sourceData.columnId !== destinationData.columnId) {
            const newColumnId = destinationData.columnId;
            if (newColumnId !== null) {
              updateLeadColumn(sourceData.leadId, newColumnId)
                .then(() => {
                  successToast("Lead column updated successfully");
                })
                .catch((error) => {
                  console.error(error);
                  dispatch({
                    type: actionTypes.DRAG_END,
                    payload: {
                      source: destinationPayload,
                      destination: sourcePayload,
                      draggableId,
                    },
                  });
                  errorToast("Failed to update lead column.");
                });
            }
          }
        }
      },
    });
  }, [dispatch]);

  return (
    <div className="h-full w-full overflow-hidden px-2">
      <div
        ref={scrollContainerRef}
        className="thin-scrollbar flex touch-pan-x snap-x snap-mandatory flex-nowrap justify-between gap-2 overflow-x-auto"
      >
        {pipelineColumns.map((column, columnIndex) => (
          <div
            key={column.id || columnIndex}
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
                  {column?.totalLeads || 0}
                </span>
              </p>
            </h2>
            <LeadInfinityScroll
              columnTitle={column.title || ""}
              columnId={column.id}
              columnIndex={columnIndex}
              leads={column.leads}
            >
              {(leads) =>
                leads.map((lead, leadIndex) => (
                  <LeadCard
                    key={lead.id}
                    leadData={lead}
                    index={leadIndex}
                    columnIndex={columnIndex}
                    isDragDisabled={screenWidth < 768}
                  />
                ))
              }
            </LeadInfinityScroll>
          </div>
        ))}
      </div>
    </div>
  );
}