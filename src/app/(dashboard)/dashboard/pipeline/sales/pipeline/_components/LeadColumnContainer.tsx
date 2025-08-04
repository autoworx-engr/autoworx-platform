import PipelineTitle from "./PipelineTitle";
import LeadInfinityScroll from "./LeadInfinityScroll";
import LeadCard from "./LeadCard";
import { Draggable, DroppableProvided } from "@hello-pangea/dnd";
import { ColumnWithLeads } from "@/types/invoiceLead";

type TLeadColumnContainerProps = {
  provided: DroppableProvided;
  column: ColumnWithLeads;
};

export default function LeadColumnContainer({
  provided,
  column,
}: TLeadColumnContainerProps) {
  const leads = column.leads;
  return (
    <div
      ref={provided.innerRef}
      className="mx-2 w-[calc(100vw-2rem)] flex-shrink-0 rounded-md border sm:min-w-80 sm:flex-1 lg:min-w-[calc(100%/3-1.5rem)] xl:min-w-[calc(100%/4-1.5rem)] 2xl:min-w-[calc(100%/6-1.5rem)]"
      style={{
        backgroundColor: "rgba(101, 113, 255, 0.15)",
        padding: "0",
      }}
    >
      <PipelineTitle title={column.title} leadsCount={column.totalLeads} />

      <LeadInfinityScroll
        provided={provided}
        columnTitle={column.title}
        columnId={column.id}
        leads={leads}
      >
        {(leads) => {
          return (
            <>
              {leads.map((lead, leadIndex) => (
                <Draggable
                  key={lead.id}
                  draggableId={lead.id.toString()}
                  index={leadIndex}
                >
                  {(provided) => (
                    <LeadCard leadData={lead} />
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </>
          );
        }}
      </LeadInfinityScroll>
    </div>
  );
}
