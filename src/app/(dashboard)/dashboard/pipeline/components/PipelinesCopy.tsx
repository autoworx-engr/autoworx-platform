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
import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import WorkOrderModal from "@/components/workorder-modal/WorkOrderModal";
import { errorToast, successToast } from "@/lib/toast";
import { updateTagAutomationTrigger } from "@/service/tag-automation-trigger/api";
import { Column, Employee, ShopPipelineData } from "@/types/invoiceLead";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { Tag, User } from "@prisma/client";
import {
  ArrowRightLeft,
  BookCheck,
  Calendar,
  CirclePlus,
  MessageCircleMore,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SetStateAction, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { EmployeeSelector } from "./EmployeeSelector";
import { EmployeeTagSelector } from "./EmployeeTagSelector";
import PipelineLoadingSkeleton from "./PipelineLoadingSkeleton";
import SearchScroll from "./SearchScroll";
import ServiceSelector from "./ServiceSelector";
import ShopColumnDropdown from "./ShopColumnDropdown";
import TaskForm from "./TaskForm";
import DroppableColumn from "./DroppableColumn";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";

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
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  console.log("selectedClientId==>", selectedClientId);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(
    null
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
  console.log("Current User:", currentUser);

  function updateWidth() {
    setScreenWidth(window.innerWidth);
  }

  useEffect(() => {
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useEffect(() => {
    // setIsLoading(true);
    setPipelineData(shopPipelineDataProp);
    // Reset refs when data changes
    columnRefs.current = new Array(shopPipelineDataProp.length).fill(null);
    leadRefs.current = new Map();
    setIsLoading(false);
  }, [shopPipelineDataProp]);

  useEffect(() => {
    // setIsLoading(true);
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

  const handleSearchResult = (
    result: { columnIndex: number; leadIndex: number } | null
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

  // ... Rest of your existing code ...

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

  const getInitials = (employee: Employee | null) => {
    if (employee) {
      const firstNameInitial = employee.firstName.charAt(0).toUpperCase();
      const lastNameInitial = employee.lastName?.charAt(0).toUpperCase();
      return `${firstNameInitial}${lastNameInitial}`;
    }
    return "";
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
    leadIndex: number
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
    selectedTag: Tag | undefined
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

          // // Optionally update the leadTags state (if needed)
          // setLeadTags((prevState) => {
          //   const existingTags = prevState[key] || [];
          //   return {
          //     ...prevState,
          //     [key]: [...existingTags, selectedTag],
          //   };
          // });

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
    tagToRemove: Tag
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
            (tag) => tag.tag.id !== tagToRemove.id
          );
        setPipelineData(updatedPipelineData);
        // setLeadTags((prevState) => {
        //   const existingTags =
        //     prevState[key] || pipelineData[categoryIndex].leads[leadIndex].tags;
        //   return {
        //     ...prevState,
        //     [key]: existingTags.filter((tag) => tag.id !== tagToRemove.id),
        //   };
        // });
      }
    } catch (error) {
      console.error("Error removing tag:", error);
    }
  };

  //service

  const handleServiceDropdownToggle = (
    categoryIndex: number,
    leadIndex: number
  ) => {
    const key = `${categoryIndex}-${leadIndex}`;
    setOpenServiceDropdown((prevState) => ({
      ...prevState,
      [key]: !prevState[key],
    }));
  };

  const handleColumnDropdownToggle = (
    categoryIndex: number,
    leadIndex: number
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
    newColumnId: string
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
            "All services must be completed by Technicians before moving to delivered."
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

    // Handle drag-and-drop within the same column
    if (destination.droppableId === source.droppableId) {
      const columnIndex = parseInt(source.droppableId);
      const columnItems = [...pipelineData[columnIndex].leads];

      // Remove the item from the source index
      const [removed] = columnItems.splice(source.index, 1);

      // Re-insert the item at the destination index
      columnItems.splice(destination.index, 0, removed);

      // Update the state with the reordered column items
      const updatedData = pipelineData.map((column, index) => {
        if (index === columnIndex) {
          return { ...column, leads: columnItems };
        }
        return column;
      });
      console.log(updatedData);
      setPipelineData(updatedData);
      return;
    }

    // Handle drag-and-drop between different columns
    const sourceColumn = pipelineData[source.droppableId];
    const destinationColumn = pipelineData[destination.droppableId];

    const sourceItems = [...sourceColumn.leads];
    const destinationItems = [...destinationColumn.leads];

    const [removed] = sourceItems.splice(source.index, 1);

    if (destinationColumn && destinationColumn.title === "Delivered") {
      // Check if the due is 0 before moving to delivered
      const completed = removed?.services?.incomplete?.length === 0;

      if (!completed && removed?.technicians?.length > 0) {
        toast.error(
          "All services must be completed by Technicians before moving to delivered."
        );
        // Revert the item back to its original position
        sourceItems.splice(source.index, 0, removed);
        return;
      }
    }
    if (destinationColumn && destinationColumn.title === "Delivered") {
      // Check if the due is 0 before moving to delivered
      if (removed.dueBalance !== 0) {
        toast.error("Please clear due balance before moving to delivered.");
        // Revert the item back to its original position
        sourceItems.splice(source.index, 0, removed);
        return;
      }

      // Update technician status to 'Complete' in the backend
      try {
        const response = await updateTechnicianStatustoComplete(
          removed.invoiceId
        );
      } catch (error) {
        console.error("Error updating technician status:", error);
      }
    }

    destinationItems.splice(destination.index, 0, removed);

    const updatedData = pipelineData.map((column, index) => {
      if (index === parseInt(source.droppableId)) {
        return { ...column, leads: sourceItems };
      } else if (index === parseInt(destination.droppableId)) {
        return { ...column, leads: destinationItems };
      }
      return column;
    });

    setPipelineData(updatedData);

    const invoiceId = removed.invoiceId;
    const newStatusId = destinationColumn.id;
    if (newStatusId !== null) {
      try {
        const response = await updateInvoiceStatus(invoiceId, newStatusId);
        if (response.type === "success") {
          successToast("Job moved successfully");
        } else {
          errorToast("Failed to update invoice status");
          console.error("Failed to update invoice status:", response.message);
        }
      } catch (error) {
        errorToast("Failed to update invoice status");
        console.error("Error updating invoice status:", error);
      }
    } else {
      console.error("newStatusId is null");
    }
  };

  // useEffect(() => {
  //   return monitorForElements({
  //     onDrop({ source, location }) {
  //       const destination = location.current.dropTargets[0];
  //       if (!destination) {
  //         return;
  //       }

  //       const sourceData = source.data as {
  //         columnIndex: number;
  //         leadIndex: number;
  //         invoiceId: number;
  //       };
  //       const destData = destination.data as {
  //         columnIndex: number;
  //         index?: number;
  //       };

  //       const sourceColumnIndex = sourceData.columnIndex;
  //       const sourceLeadIndex = sourceData.leadIndex;
  //       const destColumnIndex = destData.columnIndex;
  //       const destLeadIndex = destData.index ?? 0;

  //       if (sourceColumnIndex === destColumnIndex && sourceLeadIndex === destLeadIndex) {
  //         return;
  //       }

  //       const sourceColumn = pipelineData[sourceColumnIndex];
  //       const destinationColumn = pipelineData[destColumnIndex];

  //       const sourceItems = [...sourceColumn.leads];
  //       const destinationItems = [...destinationColumn.leads];

  //       const [removed] = sourceItems.splice(sourceLeadIndex, 1);

  //       if (destinationColumn && destinationColumn.title === "Delivered") {
  //         const completed = removed?.services?.incomplete?.length === 0;

  //         if (!completed && removed?.technicians?.length > 0) {
  //           toast.error(
  //             "All services must be completed by Technicians before moving to delivered."
  //           );
  //           return;
  //         }

  //         if (removed.dueBalance !== 0) {
  //           toast.error("Please clear due balance before moving to delivered.");
  //           return;
  //         }

  //         updateTechnicianStatustoComplete(removed.invoiceId).catch((error) => {
  //           console.error("Error updating technician status:", error);
  //         });
  //       }

  //       destinationItems.push(removed);

  //       const updatedData = pipelineData.map((column, index) => {
  //         if (index === sourceColumnIndex) {
  //           return { ...column, leads: sourceItems };
  //         } else if (index === destColumnIndex) {
  //           return { ...column, leads: destinationItems };
  //         }
  //         return column;
  //       });

  //       setPipelineData(updatedData);

  //       const invoiceId = removed.invoiceId;
  //       const newStatusId = destinationColumn.id;

  //       if (newStatusId !== null) {
  //         updateInvoiceStatus(invoiceId, newStatusId)
  //           .then((response) => {
  //             if (response.type === "success") {
  //               successToast("Job moved successfully");
  //             } else {
  //               errorToast("Failed to update invoice status");
  //               console.error(
  //                 "Failed to update invoice status:",
  //                 response.message
  //               );
  //             }
  //           })
  //           .catch((error) => {
  //             errorToast("Failed to update invoice status");
  //             console.error("Error updating invoice status:", error);
  //           });
  //       } else {
  //         console.error("newStatusId is null");
  //       }
  //     },
  //   });
  // }, [pipelineData]);

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
                  "Please clear due balance before moving to delivered."
                );
              else
                toast.error(
                  "All services must be completed before moving to delivered."
                );
              return prevData;
            }

            updateTechnicianStatustoComplete(removed.invoiceId).catch(
              console.error
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
                    : errorToast("Update failed")
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
          pipelineData={pipelineData}
          onSearchResult={handleSearchResult}
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
            {pipelineData.map((item, categoryIndex) => (
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
