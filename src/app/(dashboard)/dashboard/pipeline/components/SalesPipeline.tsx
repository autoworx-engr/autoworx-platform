"use client";
import { updateLeadColumn } from "@/actions/pipelines/getLeads";
import { getCompanyUser } from "@/actions/user/getCompanyUser";
import { usePopupStore } from "@/stores/popup";
import SessionUserType from "@/types/sessionUserType";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { Appointment, Column, User } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NewAppointmentPipeline } from "./NewAppointmentPipeline";
import PipelineLoadingSkeleton from "./PipelineLoadingSkeleton";
// import SalesLeadCard from "./SalesLeadCard";
// import SalesPipelineInfinityScroll from "./SalesPipelineInfinityScroll";
import { getAppointmentByIdForEdit } from "@/actions/pipelines/getAppointmentByIdForEdit";
import { errorToast } from "@/lib/toast";
import PipelineTitle from "./PipelineTitle";
import {
  salesPipelineKeyStr,
  salesPipelineQueryKeys,
} from "@/utils/enums/query-key-constant";
import SearchScroll from "./SearchScroll";
import { LeadWithSalesUser } from "@/types/invoiceLead";
import { usePipelineFilterStore } from "@/stores/PipelineFilterStore";
import usePipelineTrigger from "@/hooks/usePipelineTrigger";
import useCommunicationTrigger from "@/hooks/useCommunicationTrigger";
import dynamic from "next/dynamic";
interface SalesPipelineProps {
  salesPipelineDataProp: Column[];
  currentUser: SessionUserType | undefined;
}

const SalesPipelineInfinityScroll = dynamic(
  () => import("./SalesPipelineInfinityScroll"),
  { ssr: false },
);

const SalesLeadCard = dynamic(() => import("./SalesLeadCard"), { ssr: false });

export default function SalesPipeline({
  salesPipelineDataProp,
  currentUser,
}: SalesPipelineProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const queryClient = useQueryClient();

  const { dispatch } = usePipelineTrigger();
  const { dispatch: communicationDispatch } = useCommunicationTrigger();
  // References for scrolling to leads
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const leadRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(
    null,
  );
  const [pipelineData, setPipelineData] = useState<Column[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<{
    [key: string]: User | null;
  }>({});
  const [openSalesSelector, setOpenSalesSelector] = useState<{
    [key: string]: boolean;
  }>({});

  const [tagDropdownStates, setTagDropdownStates] = useState<{
    [key: string]: boolean;
  }>({});

  const { popup, open, close } = usePopupStore();

  const resetPipelineState = usePipelineFilterStore(
    (state) => state.resetStatus,
  );

  //the sales selector
  const salesSelectorRef = useRef<HTMLDivElement>(null);

  const removeClientIdFromParams = () => {
    const params = new URLSearchParams(searchParams!);
    // if (params.has("clientId")) {
    //   params.delete("clientId");
    //   router.push(`${pathname}?${params.toString()}`);
    // }
  };

  useEffect(() => {
    // setLoading(true);
    setPipelineData(salesPipelineDataProp);
    columnRefs.current = new Array(salesPipelineDataProp.length).fill(null);
    leadRefs.current = new Map();
    setLoading(false);
    return () => {
      resetPipelineState();
    };
  }, [salesPipelineDataProp]);

  // Function to handle search result
  const handleSearchResult = (
    result: { columnIndex: number; leadIndex: number } | null,
  ) => {
    if (!result) return;

    const { columnIndex, leadIndex } = result;

    // Scroll to the column first
    if (columnRefs.current[columnIndex]) {
      columnRefs.current[columnIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "start",
      });

      // Wait a bit for the column scroll to complete before scrolling to the lead
      setTimeout(() => {
        // Generate the key the same way we do when creating refs
        const leadKey = `${columnIndex}-${leadIndex}`;
        const leadElement = leadRefs.current.get(leadKey);

        if (leadElement) {
          leadElement.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });

          // Highlight the found item temporarily
          leadElement.classList.add("bg-yellow-100");
          setTimeout(() => {
            leadElement.classList.remove("bg-yellow-100");
          }, 2000);
        }
      }, 300);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    // setLoading(true);
    const fetchCompanyUsers = async () => {
      try {
        const users = await getCompanyUser();
        setCompanyUsers(users ?? []);
      } catch (error) {
        console.error("Error fetching company users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyUsers();
    removeClientIdFromParams();
  }, [currentUser, pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        salesSelectorRef.current &&
        !salesSelectorRef.current.contains(event.target as Node)
      ) {
        setOpenSalesSelector({});
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const refetchLeads = () => {
    queryClient.refetchQueries({
      queryKey: [salesPipelineKeyStr.salesPipeline],
    });
    queryClient.refetchQueries({
      queryKey: [salesPipelineKeyStr.salesPipelineCount],
    });
  };

  //drag part of sales pipeline
  const handleDragEnd = async (result: any) => {
    const { destination, source } = result;

    if (!destination) return;

    // If the item is dropped in the same position, do nothing
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }
    const leadSearchTerm = usePipelineFilterStore.getState().searchTerm;
    // Handle drag-and-drop within the same column
    if (destination.droppableId === source.droppableId) {
      const columnIndex = parseInt(source.droppableId);
      const columnId = pipelineData[columnIndex].id;
      const columnItems =
        queryClient.getQueryData<LeadWithSalesUser[]>(
          salesPipelineQueryKeys
            .getLeadsKey(columnId)
            .concat(leadSearchTerm ?? ""),
        ) || [];

      // Remove the item from the source index
      const [removed] = columnItems.splice(source.index, 1);

      // Re-insert the item at the destination index
      columnItems.splice(destination.index, 0, removed);

      // Update the state with the reordered column items
      pipelineData.forEach((column, index) => {
        if (index === columnIndex) {
          queryClient.setQueryData(
            salesPipelineQueryKeys
              .getLeadsKey(column.id)
              .concat(leadSearchTerm ?? ""),
            () => {
              return columnItems;
            },
          );
        }
      });

      // setPipelineData(updatedData);
      return;
    }

    // Handle drag-and-drop between different columns
    const sourceColumn = pipelineData[source.droppableId];
    const destinationColumn = pipelineData[destination.droppableId];

    const sourceItems =
      queryClient.getQueryData<LeadWithSalesUser[]>(
        salesPipelineQueryKeys
          .getLeadsKey(sourceColumn.id)
          .concat(leadSearchTerm ?? ""),
      ) || [];
    const destinationItems =
      queryClient.getQueryData<LeadWithSalesUser[]>(
        salesPipelineQueryKeys
          .getLeadsKey(destinationColumn.id)
          .concat(leadSearchTerm ?? ""),
      ) || [];

    // const sourceItems = [...sourceColumn.leads];
    // const destinationItems = [...destinationColumn.leads];

    const [removed] = sourceItems.splice(source.index, 1);
    destinationItems.splice(destination.index, 0, {
      ...removed,
      columnId: destinationColumn.id,
      column: destinationColumn,
    });

    // setPipelineData(updatedData);

    // Update the column ID in the lead table
    const leadId = removed.id;
    const newColumnId = destinationColumn.id;
    if (newColumnId !== null) {
      try {
        pipelineData.forEach((column, index) => {
          if (index === parseInt(source.droppableId)) {
            queryClient.setQueryData<number>(
              salesPipelineQueryKeys
                .getLeadsCountKey(column.id)
                .concat(leadSearchTerm ?? ""),
              (prevLeadCount) => prevLeadCount! - 1,
            );
            queryClient.setQueryData(
              salesPipelineQueryKeys
                .getLeadsKey(column.id)
                .concat(leadSearchTerm ?? ""),
              () => {
                return sourceItems;
              },
            );
          } else if (index === parseInt(destination.droppableId)) {
            queryClient.setQueryData(
              salesPipelineQueryKeys
                .getLeadsKey(column.id)
                .concat(leadSearchTerm ?? ""),
              () => {
                return destinationItems;
              },
            );
          }
        });
        queryClient.setQueryData<number>(
          salesPipelineQueryKeys
            .getLeadsCountKey(newColumnId)
            .concat(leadSearchTerm ?? ""),
          (prevLeadCount) => prevLeadCount! + 1,
        );
        const updatedLead = await updateLeadColumn(leadId, newColumnId);
        if (updatedLead) {
          console.log("Lead column updated successfully:");
        } else {
          console.error("Failed to update lead column");
        }
      } catch (error) {
        refetchLeads();
        console.error("Error updating lead column:", error);
      }
    } else {
      console.error("newColumnId is null");
    }
  };

  const handleAppointmentOpen = (clientId?: number, vehicleId?: number) => {
    // removeClientIdFromParams();
    if (clientId) {
      setSelectedClientId(clientId);
    } else {
      setSelectedClientId(null);
      errorToast("Client Not found");
    }

    if (vehicleId) {
      setSelectedVehicleId(vehicleId);
    } else {
      setSelectedVehicleId(null);
    }
    open("ADD_TASK");
  };

  const handleUpdateAppointment = async (appointmentId?: number) => {
    try {
      const { extra, ...appointment } =
        (await getAppointmentByIdForEdit(appointmentId)) || {};
      open("UPDATE_APPOINTMENT", {
        appointment,
        employees: extra.employees,
        customers: extra.customers,
        vehicles: extra.vehicles,
        templates: extra.emailTemplates,
        settings: extra.settings,
      });
    } catch (err) {
      errorToast("Error fetching appointment data");
    }
  };

  const handleAppointmentAutomationTrigger = async (columnInfo: {
    leadId: number;
    columnId: number;
  }) => {
    if (!currentUser) return;
    dispatch("UPDATE_PIPELINE_AUTOMATION_TRIGGER", {
      columnId: columnInfo.columnId,
      leadId: columnInfo.leadId,
      companyId: currentUser?.companyId!,
      condition: "APPOINTMENT_SCHEDULED",
    });

    communicationDispatch("UPDATE_COMMUNICATION_AUTOMATION_TRIGGER", {
      columnId: columnInfo.columnId,
      leadId: columnInfo.leadId,
      companyId: currentUser?.companyId!,
    });
  };

  const handleUpdateAppointmentInLead = (
    appointment: Appointment,
    columnInfo: { leadId: number; columnId: number },
  ) => {
    dispatch("UPDATE_LEAD_APPOINTMENT_STATE", {
      appointment,
      leadId: columnInfo.leadId,
      columnId: columnInfo.columnId,
    });
  };
  return (
    <>
      {/* Add the search component at the top */}
      <div className="mb-4 px-2">
        <SearchScroll
          pipelineData={pipelineData}
          onSearchResult={handleSearchResult}
        />
      </div>

      {loading ? (
        <PipelineLoadingSkeleton />
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="h-full w-full overflow-hidden px-2">
            <div className="thin-scrollbar flex touch-pan-x snap-x snap-mandatory flex-nowrap justify-between gap-2 overflow-x-auto">
              {pipelineData.map((item, categoryIndex) => (
                <Droppable droppableId={`${categoryIndex}`} key={item.id}>
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={(el) => {
                        provided.innerRef(el);
                        columnRefs.current[categoryIndex] = el;
                      }}
                      className="mx-2 w-[calc(100vw-2rem)] flex-shrink-0  rounded-md border sm:min-w-80 sm:flex-1 lg:min-w-[calc(100%/6-1.5rem)]"
                      style={{
                        backgroundColor: "rgba(101, 113, 255, 0.15)",
                        padding: "0",
                      }}
                    >
                      <PipelineTitle title={item?.title} columnId={item.id} />

                      <SalesPipelineInfinityScroll
                        columnTitle={item.title}
                        columnId={item.id}
                      >
                        {(leads) => {
                          return (
                            <>
                              {leads.map((lead, leadIndex) => {
                                const key = `${categoryIndex}-${leadIndex}`;
                                const isSalesSelectorOpen =
                                  openSalesSelector[key];
                                const selectedUserForLead =
                                  selectedUser[key] || lead?.salesUser;
                                const isTagDropdownOpen =
                                  tagDropdownStates[key];
                                return (
                                  <SalesLeadCard
                                    key={lead.leadId}
                                    ref={leadRefs}
                                    onAppointmentOpen={handleAppointmentOpen}
                                    onAppointmentUpdate={
                                      handleUpdateAppointment
                                    }
                                    salesKey={key}
                                    categoryIndex={categoryIndex}
                                    columnItem={item}
                                    currentUser={currentUser}
                                    isSalesSelectorOpen={isSalesSelectorOpen}
                                    isTagDropdownOpen={isTagDropdownOpen}
                                    lead={lead}
                                    leadIndex={leadIndex}
                                    pipelineData={pipelineData}
                                    selectedUserForLead={selectedUserForLead}
                                    setOpenSalesSelector={setOpenSalesSelector}
                                    setSelectedUser={setSelectedUser}
                                    setTagDropdownStates={setTagDropdownStates}
                                  />
                                );
                              })}
                              {provided.placeholder}
                            </>
                          );
                        }}
                      </SalesPipelineInfinityScroll>
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          </div>
          {selectedClientId && (
            <NewAppointmentPipeline
              onAutomationTrigger={handleAppointmentAutomationTrigger}
              onUpdateAppointmentInLead={handleUpdateAppointmentInLead}
              clientId={selectedClientId}
              vehicleId={selectedVehicleId}
              popup={popup}
              open={open}
              close={close}
            />
          )}
        </DragDropContext>
      )}
    </>
  );
}
