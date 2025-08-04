"use client";
import { ColumnWithLeads } from "@/types/invoiceLead";
import { Droppable } from "@hello-pangea/dnd";
import { memo } from "react";
import LeadColumnContainer from "./LeadColumnContainer";

type TLeadColumnContainerProps = {
  columnIndex: number;
  column: ColumnWithLeads;
  dropDisable?: boolean;
};

export default function LeadDroppableContainer({
  columnIndex,
  column,
  dropDisable,
}: TLeadColumnContainerProps) {
  return (
    <Droppable
      isDropDisabled={dropDisable}
      droppableId={`${columnIndex}`}
      key={column?.id}
    >
      {(provided) => (
        <LeadColumnContainer provided={provided} column={column} />
      )}
    </Droppable>
  );
}
