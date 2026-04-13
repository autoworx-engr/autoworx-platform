"use client";
import { getEmployees } from "@/actions/employee/get";
import { updateInvoiceStatus } from "@/actions/estimate/invoice/updateInvoiceStatus";
import { updateTechnicianStatustoComplete } from "@/actions/estimate/invoice/updateTechnicianStatustoComplete";
import { updateAssignedTo } from "@/actions/pipelines/getWorkOrders";
import {
  removeInvoiceTag,
  saveInvoiceTag,
} from "@/actions/pipelines/invoiceTag";
import { AppointmentCreateOrEdit } from "@/components/appointment/AppointmentCreateOrEdit";
import { errorToast, successToast } from "@/lib/toast";
import { updateTagAutomationTrigger } from "@/service/tag-automation-trigger/api";
import { usePipelineFilterStore } from "@/stores/PipelineFilterStore";
import { Column, Employee, ShopPipelineData } from "@/types/invoiceLead";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { Tag, User } from "@prisma/client";
import { useRouter } from "next/navigation";
import { SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import DroppableColumn from "./DroppableColumn";
import PipelineLoadingSkeleton from "./PipelineLoadingSkeleton";
import SearchScroll from "./SearchScroll";

interface PipelinesProps {
  pipelinesTitle: string;
  columns?: Column[];
  shopPipelineDataProp: ShopPipelineData[];
  loading?: boolean;
  isTechnician?: boolean;
}

export default function PipelinesCopy({
  pipelinesTitle: pipelineType,
  columns,
  loading = false,
  shopPipelineDataProp,
  isTechnician,
}: PipelinesProps) {
  const router = useRouter();

  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(
    null,
  );
  const [pipelineData, setPipelineData] =
    useState<ShopPipelineData[]>(shopPipelineDataProp);
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  // References for scrolling to leads
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const leadRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const dragDropContextRef = useRef<HTMLDivElement | null>(null);
  const [screenWidth, setScreenWidth] = useState<number>(window.innerWidth);

  const currentUser = useGetCurrentUser();

  // Get search term from store
  const { searchTerm, resetStatus } = usePipelineFilterStore((state) => state);
  const [selectedSearchColumnId, setSelectedSearchColumnId] = useState<
    number | null
  >(null);

  function updateWidth() {
    setScreenWidth(window.innerWidth);
  }

  useEffect(() => {
    updateWidth();
    resetStatus();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [resetStatus]);

  useEffect(() => {
    setPipelineData(shopPipelineDataProp);
    // Reset refs when data changes
    columnRefs.current = new Array(shopPipelineDataProp.length).fill(null);
    leadRefs.current = new Map();
    setIsLoading(false);
  }, [shopPipelineDataProp]);

  useEffect(() => {
    const fetchCompanyUsers = async () => {
      const fetchedCompanyUsers = await getEmployees({
        excludeCurrentUser: true,
        notType: "Sales",
      });
      setCompanyUsers(fetchedCompanyUsers);
      setIsLoading(false);
    };
    fetchCompanyUsers();
  }, [router]);

  // Filter pipeline data based on search term
  const filteredPipelineData = useMemo(() => {
    let result = pipelineData;

    // First, if a specific column is selected in search filter,
    // we can either filter the whole columns array, or just clear leads from other columns.
    // Making other columns empty is usually better for a Kanban to maintain structure.

    if (searchTerm && searchTerm.trim() !== "") {
      const lowerSearchTerm = searchTerm.toLowerCase();

      result = result.map((column) => {
        // If a column filter is active and it's not THIS column, return empty leads
        if (
          selectedSearchColumnId !== null &&
          column.id !== selectedSearchColumnId
        ) {
          return { ...column, leads: [] };
        }

        return {
          ...column,
          leads: column.leads.filter((lead) => {
            // Search by client name
            const nameMatch = (lead.name || "")
              .toLowerCase()
              .includes(lowerSearchTerm);

            // Search by vehicle information
            const vehicleMatch =
              lead.vehicle &&
              lead.vehicle.toLowerCase().includes(lowerSearchTerm);

            return nameMatch || vehicleMatch;
          }),
        };
      });
    } else {
      // If no search term but a column is selected
      if (selectedSearchColumnId !== null) {
        result = result.map((column) => {
          if (column.id !== selectedSearchColumnId) {
            return { ...column, leads: [] };
          }
          return column;
        });
      }
    }

    return result;
  }, [pipelineData, searchTerm, selectedSearchColumnId]);

  const [selectedEmployees, setSelectedEmployees] = useState<{
    [key: string]: Employee | null;
  }>({});
  const [openDropdownIndex, setOpenDropdownIndex] = useState<{
    category: number;
    index: number;
  } | null>(null);

  // State for appointment modal
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);

  const [tag, setTag] = useState<Tag>();
  const [tagDropdownStates, setTagDropdownStates] = useState<{
    [key: string]: boolean;
  }>({});

  const [openServiceDropdown, setOpenServiceDropdown] = useState<{
    [key: string]: boolean;
  }>({});

  const [showColumnSelect, setShowColumnSelect] = useState<{
    [key: string]: boolean;
  }>({});

  const [columnDropdownOpen, setColumnDropdownOpen] = useState<{
    [key: string]: boolean;
  }>({});

  const handleSearchResult = useCallback((
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
          leadElement.classList.add(
            "bg-yellow-200",
            "border-yellow-300",
            "scale-[1.02]",
            "transition-transform",
          );
          setTimeout(() => {
            leadElement.classList.remove(
              "bg-yellow-200",
              "border-yellow-300",
              "scale-[1.02]",
              "transition-transform",
            );
          }, 5000);
        }
      }, 300);
    }
  }, []);

  const handleDropdownToggle = (categoryIndex: number, leadIndex: number) => {
    if (
      openDropdownIndex?.category === categoryIndex &&
      openDropdownIndex.index === leadIndex
    ) {
      setOpenDropdownIndex(null);
    } else {
      setOpenDropdownIndex({ category: categoryIndex, index: leadIndex });
    }

    console.log(categoryIndex, leadIndex);
  };

  const createEmployeeSelectHandler =
    (categoryIndex: number, leadIndex: number) =>
    async (value: SetStateAction<Employee | null>) => {
      const key = `${categoryIndex}-${leadIndex}`;
      const resolvedValue =
        typeof value === "function" ? value(selectedEmployees[key]) : value;

      // Update the selected employee in the state
      setSelectedEmployees((prevState) => ({
        ...prevState,
        [key]: resolvedValue,
      }));

      // Close the dropdown
      setOpenDropdownIndex(null);

      const invoiceId = pipelineData[categoryIndex].leads[leadIndex].invoiceId;

      if (resolvedValue && resolvedValue.id) {
        try {
          const response = await updateAssignedTo(invoiceId, resolvedValue.id);
          if (response.success) {
            // Update pipelineData to persist the selected employee in the UI
            const updatedPipelineData = [...pipelineData];
            updatedPipelineData[categoryIndex].leads[leadIndex].assignedTo =
              resolvedValue;

            setPipelineData(updatedPipelineData);
          } else {
            console.error("Failed to update assigned employee");
          }
          if (!response.success) {
            console.error("Failed to update assigned employee");
          }
        } catch (error) {
          console.error("Error updating assigned employee:", error);
        }
      } else {
        console.error("No employee selected");
      }
    };

  const handleTagDropdownToggle = (
    categoryIndex: number,
    leadIndex: number,
  ) => {
    const key = `${categoryIndex}-${leadIndex}`;
    setTagDropdownStates((prevState) => ({
      ...prevState,
      [key]: !prevState[key],
    }));
  };

  //for tag handling
  const handleTagSelect = async (
    categoryIndex: number,
    leadIndex: number,
    selectedTag: Tag | undefined,
  ) => {
    if (selectedTag) {
      const key = `${categoryIndex}-${leadIndex}`;
      const invoiceId = pipelineData[categoryIndex].leads[leadIndex].invoiceId;
      try {
        const result = await saveInvoiceTag(invoiceId, selectedTag.id);
        if (result) {
          const updatedPipelineData = [...pipelineData];
          updatedPipelineData[categoryIndex].leads[leadIndex].tags.push({
            id: selectedTag.id,
            tag: selectedTag,
          });
          setPipelineData(updatedPipelineData);

          updateTagAutomationTrigger({
            columnId: result?.invoice?.columnId!,
            companyId: result?.invoice?.companyId,
            pipelineType: "SHOP",
            tagId: selectedTag?.id,
            invoiceId: result?.invoiceId,
          });
        }
      } catch (error) {
        console.error("Error saving tag:", error);
      }
    }
  };

  // Handle tag removal
  const handleTagRemove = async (
    categoryIndex: number,
    leadIndex: number,
    tagToRemove: Tag,
  ) => {
    const key = `${categoryIndex}-${leadIndex}`;
    const invoiceId = pipelineData[categoryIndex].leads[leadIndex].invoiceId;

    try {
      // Remove the tag from the database
      const result = await removeInvoiceTag(invoiceId, tagToRemove.id);

      if (result) {
        // Update the UI after removing the tag
        const updatedPipelineData = [...pipelineData];
        updatedPipelineData[categoryIndex].leads[leadIndex].tags =
          updatedPipelineData[categoryIndex].leads[leadIndex].tags.filter(
            (tag) => tag.tag.id !== tagToRemove.id,
          );
        setPipelineData(updatedPipelineData);
      }
    } catch (error) {
      console.error("Error removing tag:", error);
    }
  };

  //service
  const handleServiceDropdownToggle = (
    categoryIndex: number,
    leadIndex: number,
  ) => {
    const key = `${categoryIndex}-${leadIndex}`;
    setOpenServiceDropdown((prevState) => ({
      ...prevState,
      [key]: !prevState[key],
    }));
  };

  const handleColumnDropdownToggle = (
    categoryIndex: number,
    leadIndex: number,
  ) => {
    const key = `${categoryIndex}-${leadIndex}`;
    setShowColumnSelect((prevState) => ({
      ...prevState,
      [key]: !prevState[key],
    }));
    setColumnDropdownOpen((prevState) => ({
      ...prevState,
      [key]: !prevState[key],
    }));
  };

  const handleColumnChange = async (
    categoryIndex: number,
    leadIndex: number,
    newColumnId: string,
  ) => {
    const key = `${categoryIndex}-${leadIndex}`;
    const lead = pipelineData[categoryIndex].leads[leadIndex];

    if (!newColumnId || newColumnId === categoryIndex.toString()) {
      setShowColumnSelect((prev) => ({ ...prev, [key]: false }));
      setColumnDropdownOpen((prev) => ({ ...prev, [key]: false }));
      return;
    }

    try {
      const destinationColumnIndex = parseInt(newColumnId);
      const sourceColumn = pipelineData[categoryIndex];
      const destinationColumn = pipelineData[destinationColumnIndex];

      if (destinationColumn && destinationColumn.title === "Delivered") {
        const completed = lead?.services?.incomplete?.length === 0;
        if (!completed && lead?.technicians?.length > 0) {
          toast.error(
            "All services must be completed by Technicians before moving to delivered.",
          );
          return;
        }
        if (lead.dueBalance !== 0) {
          toast.error("Please clear due balance before moving to delivered.");
          return;
        }
      }

      const sourceItems = [...sourceColumn.leads];
      const destinationItems = [...destinationColumn.leads];
      const [movedLead] = sourceItems.splice(leadIndex, 1);
      destinationItems.push(movedLead);

      const updatedData = pipelineData.map((column, index) => {
        if (index === categoryIndex) {
          return { ...column, leads: sourceItems };
        } else if (index === destinationColumnIndex) {
          return { ...column, leads: destinationItems };
        }
        return column;
      });

      setPipelineData(updatedData);

      const newStatusId = destinationColumn.id;
      if (newStatusId !== null) {
        const response = await updateInvoiceStatus(lead.invoiceId, newStatusId);
        if (response.type === "success") {
          toast.success("Job moved successfully");

          if (destinationColumn.title === "Delivered") {
            await updateTechnicianStatustoComplete(lead.invoiceId);
          }
        } else {
          toast.error("Failed to move job. Please try again.");
          setPipelineData(pipelineData);
        }
      }

      setShowColumnSelect((prev) => ({ ...prev, [key]: false }));
      setColumnDropdownOpen((prev) => ({ ...prev, [key]: false }));
    } catch (error) {
      toast.error("Failed to move lead. Please try again.");
      console.error("Error moving lead:", error);
    }
  };

  useEffect(() => {
    return monitorForElements({
      onDrop({ source, location }) {
        const destination = location.current.dropTargets[0];
        if (!destination) return;

        const sourceData = source.data as {
          columnIndex: number;
          leadIndex: number;
          invoiceId: number;
        };
        const destData = destination.data as {
          columnIndex: number;
          index?: number;
        };

        const sourceColIdx = sourceData.columnIndex;
        const destColIdx = destData.columnIndex;
        const sourceLeadIdx = sourceData.leadIndex;
        const destLeadIdx = destData.index ?? 0;

        if (sourceColIdx === destColIdx && sourceLeadIdx === destLeadIdx)
          return;

        setPipelineData((prevData) => {
          const newData = [...prevData];
          const sourceColumn = {
            ...newData[sourceColIdx],
            leads: [...newData[sourceColIdx].leads],
          };
          const [removed] = sourceColumn.leads.splice(sourceLeadIdx, 1);

          const destinationColumn = newData[destColIdx];
          if (destinationColumn.title === "Delivered") {
            const completed = removed?.services?.incomplete?.length === 0;
            const hasDue = removed.dueBalance !== 0;

            if ((!completed && removed?.technicians?.length > 0) || hasDue) {
              if (hasDue)
                toast.error(
                  "Please clear due balance before moving to delivered.",
                );
              else
                toast.error(
                  "All services must be completed before moving to delivered.",
                );
              return prevData;
            }

            updateTechnicianStatustoComplete(removed.invoiceId).catch(
              console.error,
            );
          }

          if (sourceColIdx === destColIdx) {
            sourceColumn.leads.splice(destLeadIdx, 0, removed);
            newData[sourceColIdx] = sourceColumn;
          } else {
            const destColumn = {
              ...newData[destColIdx],
              leads: [...newData[destColIdx].leads],
            };
            destColumn.leads.splice(destLeadIdx, 0, removed);
            newData[sourceColIdx] = sourceColumn;
            newData[destColIdx] = destColumn;

            const newStatusId = destColumn.id;
            if (newStatusId) {
              updateInvoiceStatus(removed.invoiceId, newStatusId)
                .then((res) =>
                  res.type === "success"
                    ? successToast("Job moved successfully")
                    : errorToast("Update failed"),
                )
                .catch(() => errorToast("Failed to update status"));
            }
          }

          return newData;
        });
      },
    });
  }, []);

  useEffect(() => {
    const scrollContainer = dragDropContextRef.current;
    if (!scrollContainer || screenWidth < 768) return;

    return autoScrollForElements({
      element: scrollContainer,
    });
  }, [screenWidth]);

  return (
    <>
      {/* Add the search component at the top */}
      <div className="mb-4 px-2">
        <SearchScroll
          pipelineData={filteredPipelineData}
          onSearchResult={handleSearchResult}
          onColumnChange={(colId) => setSelectedSearchColumnId(colId)}
        />
      </div>

      {loading || isLoading ? (
        <PipelineLoadingSkeleton />
      ) : (
        <div className="h-full w-full overflow-hidden px-2">
          <div
            ref={dragDropContextRef}
            className="thin-scrollbar flex touch-pan-x snap-x snap-mandatory flex-nowrap justify-between gap-2 overflow-x-auto"
          >
            {filteredPipelineData.map((item, categoryIndex) => (
              <DroppableColumn
                key={categoryIndex}
                columnRefs={columnRefs}
                categoryIndex={categoryIndex}
                item={item}
                openDropdownIndex={openDropdownIndex}
                tagDropdownStates={tagDropdownStates}
                openServiceDropdown={openServiceDropdown}
                screenWidth={screenWidth}
                leadRefs={leadRefs}
                handleColumnDropdownToggle={handleColumnDropdownToggle}
                pipelineType={pipelineType}
                handleDropdownToggle={handleDropdownToggle}
                createEmployeeSelectHandler={createEmployeeSelectHandler}
                companyUsers={companyUsers}
                setOpenDropdownIndex={setOpenDropdownIndex}
                showColumnSelect={showColumnSelect}
                pipelineData={pipelineData}
                handleColumnChange={handleColumnChange}
                setShowColumnSelect={setShowColumnSelect}
                setColumnDropdownOpen={setColumnDropdownOpen}
                columnDropdownOpen={columnDropdownOpen}
                handleTagRemove={handleTagRemove}
                handleTagDropdownToggle={handleTagDropdownToggle}
                handleTagSelect={handleTagSelect}
                handleServiceDropdownToggle={handleServiceDropdownToggle}
                isTechnician={isTechnician}
                setSelectedClientId={setSelectedClientId}
                setSelectedVehicleId={setSelectedVehicleId}
                setIsAppointmentModalOpen={setIsAppointmentModalOpen}
                searchTerm={searchTerm}
              />
            ))}
          </div>
        </div>
      )}

      {selectedClientId && (
        <AppointmentCreateOrEdit
          clientId={selectedClientId}
          vehicleId={selectedVehicleId}
          isModalOpen={isAppointmentModalOpen}
          setIsModalOpen={setIsAppointmentModalOpen}
          onAppointmentCreated={(appointment) => {
            // Handle appointment created
            setIsAppointmentModalOpen(false);
            setSelectedClientId(null);
            setSelectedVehicleId(null);
          }}
          onAppointmentUpdated={(appointment) => {
            // Handle appointment updated
            setIsAppointmentModalOpen(false);
            setSelectedClientId(null);
            setSelectedVehicleId(null);
          }}
        />
      )}
    </>
  );
}
