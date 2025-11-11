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
import WorkOrderModal from "@/components/workorder-modal/WorkOrderModal";
import { Column, Employee, ShopPipelineData } from "@/types/invoiceLead";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { Tag, User } from "@prisma/client";
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
import { errorToast, successToast } from "@/lib/toast";
import {
  ArrowRightLeft,
  Calendar,
  CirclePlus,
  MessageCircleMore,
} from "lucide-react";
import { updateTagAutomationTrigger } from "@/service/tag-automation-trigger/api";

interface PipelinesProps {
  pipelinesTitle: string;
  columns?: Column[];
  shopPipelineDataProp: ShopPipelineData[];
  loading?: boolean;
  isTechnician?: boolean;
}

export default function Pipelines({
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
  const [screenWidth, setScreenWidth] = useState<number>(window.innerWidth);

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
          toast.success("Lead moved successfully");

          if (destinationColumn.title === "Delivered") {
            await updateTechnicianStatustoComplete(lead.invoiceId);
          }
        } else {
          toast.error("Failed to move lead. Please try again.");
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
          successToast("Lead moved successfully");
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
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="h-full w-full overflow-hidden px-2">
            <div className="thin-scrollbar flex touch-pan-x snap-x snap-mandatory flex-nowrap justify-between gap-2 overflow-x-auto">
              {pipelineData.map((item, categoryIndex) => (
                <Droppable
                  droppableId={`${categoryIndex}`}
                  key={categoryIndex.toString() + 1}
                  isDropDisabled={screenWidth < 768}
                >
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={(el) => {
                        provided.innerRef(el);
                        columnRefs.current[categoryIndex] = el;
                      }}
                      className="mx-2 w-[calc(100vw-2rem)] flex-shrink-0 rounded-md border sm:min-w-80 sm:flex-1 lg:min-w-[calc(100%/3-1.5rem)] xl:min-w-[calc(100%/4-1.5rem)] 2xl:min-w-[calc(100%/6-1.5rem)]"
                      style={{
                        backgroundColor: "rgba(101, 113, 255, 0.15)",
                        padding: "0",
                      }}
                    >
                      <h2 className="rounded-lg bg-[#6571FF] px-4 py-3 text-center text-white">
                        <p className="text-base font-bold">
                          {item.title || ""}
                          <span className="ml-2 rounded-lg bg-[#3F49B9] px-2">
                            {item.leads.length}
                          </span>
                        </p>
                      </h2>

                      <ul
                        className="thin-scrollbar mt-1 flex max-h-[70vh] min-h-[70vh] flex-col gap-1 overflow-y-auto p-1"
                        style={{ maxHeight: "70vh" }}
                      >
                        {item.leads.map((lead, leadIndex) => {
                          const key = `${categoryIndex}-${leadIndex}`;
                          const isDropdownOpen =
                            openDropdownIndex?.category === categoryIndex &&
                            openDropdownIndex.index === leadIndex;
                          const isTagDropdownOpen = tagDropdownStates[key];
                          const isServiceDropdownOpen =
                            openServiceDropdown[key] || false;
                          const selectedEmployee = lead.assignedTo;

                          return (
                            <Draggable
                              key={lead.invoiceId}
                              draggableId={`${categoryIndex}-${leadIndex}`}
                              index={leadIndex}
                              isDragDisabled={screenWidth < 768}
                            >
                              {(provided) => (
                                <li
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  ref={(el) => {
                                    provided.innerRef(el);
                                    // Store a reference to this lead element
                                    if (el) leadRefs.current.set(key, el);
                                  }}
                                  key={lead.invoiceId}
                                  className="max-w-auto relative mx-1 my-1 h-fit animate-none rounded-xl border bg-background p-1 duration-300 hover:bg-slate-100"
                                >
                                  {/* Lead content - same as your original code */}
                                  <div className="flex items-center justify-between">
                                    <h3 className="font-inter overflow-auto pb-2 font-semibold text-black">
                                      {lead.name}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() =>
                                          handleColumnDropdownToggle(
                                            categoryIndex,
                                            leadIndex
                                          )
                                        }
                                        className="cursor-pointer text-xl mr-2 hover:text-blue-600 transition-colors md:hidden"
                                        title="Move to different column"
                                      >
                                        <ArrowRightLeft
                                          size={24}
                                          strokeWidth={2}
                                          style={{ color: "#6571FFed" }}
                                        />
                                      </button>

                                      {pipelineType === "Sales Pipelines" && (
                                        <div>
                                          {!isDropdownOpen && (
                                            <div
                                              role="button"
                                              onClick={() =>
                                                handleDropdownToggle(
                                                  categoryIndex,
                                                  leadIndex
                                                )
                                              }
                                            >
                                              {selectedEmployee ? (
                                                <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-gray-600 bg-background text-xs text-black">
                                                  {getInitials(
                                                    selectedEmployee
                                                  )}
                                                </div>
                                              ) : (
                                                <CirclePlus size={26} />
                                              )}
                                            </div>
                                          )}

                                          {isDropdownOpen && (
                                            <div className="absolute right-0 top-8 z-10">
                                              <EmployeeSelector
                                                name="employeeId"
                                                value={selectedEmployee}
                                                setValue={createEmployeeSelectHandler(
                                                  categoryIndex,
                                                  leadIndex
                                                )}
                                                openDropdown={true}
                                                setOpenDropdown={() =>
                                                  setOpenDropdownIndex(null)
                                                }
                                                companyUsers={companyUsers}
                                              />
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {showColumnSelect[
                                    `${categoryIndex}-${leadIndex}`
                                  ] && (
                                    <ShopColumnDropdown
                                      options={pipelineData
                                        .filter(
                                          (col, idx) => idx !== categoryIndex
                                        )
                                        .map((col, idx) => ({
                                          id: col.id,
                                          value: pipelineData
                                            .findIndex((p) => p.id === col.id)
                                            .toString(),
                                          label: col.title || "Untitled Column",
                                        }))}
                                      onSelect={(columnId) =>
                                        handleColumnChange(
                                          categoryIndex,
                                          leadIndex,
                                          columnId
                                        )
                                      }
                                      onClose={() => {
                                        const key = `${categoryIndex}-${leadIndex}`;
                                        setShowColumnSelect((prev) => ({
                                          ...prev,
                                          [key]: false,
                                        }));
                                        setColumnDropdownOpen((prev) => ({
                                          ...prev,
                                          [key]: false,
                                        }));
                                      }}
                                      isOpen={
                                        columnDropdownOpen[
                                          `${categoryIndex}-${leadIndex}`
                                        ] || false
                                      }
                                    />
                                  )}

                                  <div className="mb-1 flex flex-wrap items-center gap-1">
                                    {pipelineData[categoryIndex].leads[
                                      leadIndex
                                    ].tags.map((invoiceTag) => (
                                      <span
                                        key={`tag-${invoiceTag.id}`}
                                        className="mr-2 inline-flex h-[20px] items-center rounded bg-gray-300 px-1 py-1 text-xs font-semibold text-black"
                                        style={{
                                          backgroundColor:
                                            invoiceTag.tag?.bgColor,
                                          color: invoiceTag.tag?.textColor,
                                        }}
                                      >
                                        {invoiceTag.tag.name}
                                        <div
                                          className="ml-1 cursor-pointer text-xs text-black"
                                          onClick={() =>
                                            handleTagRemove(
                                              categoryIndex,
                                              leadIndex,
                                              invoiceTag.tag
                                            )
                                          }
                                        >
                                          ✕
                                        </div>
                                      </span>
                                    ))}

                                    <button
                                      onClick={() =>
                                        handleTagDropdownToggle(
                                          categoryIndex,
                                          leadIndex
                                        )
                                      }
                                      className="inline-flex h-[20px] items-center justify-center rounded bg-[#6571FF] px-1 py-1 text-xs font-semibold text-white"
                                    >
                                      + Add
                                    </button>
                                  </div>
                                  {isTagDropdownOpen && (
                                    <div className="-left-100 absolute top-12 z-20">
                                      <EmployeeTagSelector
                                        employeeTags={pipelineData[
                                          categoryIndex
                                        ].leads[leadIndex].tags.map(
                                          (invoiceTag) => invoiceTag.tag
                                        )}
                                        setValue={(selectedTag) =>
                                          handleTagSelect(
                                            categoryIndex,
                                            leadIndex,
                                            selectedTag
                                          )
                                        }
                                        open={isTagDropdownOpen}
                                        setOpen={() =>
                                          handleTagDropdownToggle(
                                            categoryIndex,
                                            leadIndex
                                          )
                                        }
                                        tagType="GENERAL"
                                      />
                                    </div>
                                  )}
                                  <div>
                                    <p className="mb-2 overflow-auto text-xs">
                                      {lead.vehicle}
                                    </p>
                                  </div>
                                  {/* service code */}
                                  <ServiceSelector
                                    services={lead.services.completed
                                      .concat(lead.services.incomplete)
                                      .concat(lead.services.unAssigned)}
                                    completedServices={lead.services.completed}
                                    incompleteServices={
                                      lead.services.incomplete
                                    }
                                    unAssignedServices={
                                      lead.services.unAssigned
                                    }
                                    isServiceDropdownOpen={
                                      isServiceDropdownOpen
                                    }
                                    handleServiceDropdownToggle={() =>
                                      handleServiceDropdownToggle(
                                        categoryIndex,
                                        leadIndex
                                      )
                                    }
                                    type={pipelineType}
                                  />
                                  {pipelineType === "Sales Pipelines" && (
                                    <div>
                                      <p className="overflow-auto pb-2 text-xs">
                                        Lead Source
                                      </p>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <div className="flex items-center gap-2">
                                      <Link
                                        href={`/dashboard/communication/client/${lead.clientId}?chat=true`}
                                        className={`group relative mt-1 ${isTechnician ? "hidden" : ""}`}
                                      >
                                        <MessageCircleMore size={20} />
                                        <span className="invisible absolute bottom-full left-14 w-max -translate-x-1/2 transform whitespace-nowrap rounded-md border-2 border-white bg-[#66738C] px-2 py-1 text-xs text-white shadow-lg transition-opacity group-hover:visible">
                                          Communications
                                        </span>
                                      </Link>

                                      <div className="group relative mx-0 mt-1 p-0">
                                        <WorkOrderModal
                                          invoiceId={lead.invoiceId}
                                          buttonChild={
                                            <button className="group relative flex w-6 items-center justify-center">
                                              <Image
                                                src="/icons/invoicePipeline.png"
                                                alt=""
                                                width={14}
                                                height={14}
                                              />

                                              <span className="invisible absolute bottom-full left-14 mb-1 w-max -translate-x-1/2 transform whitespace-nowrap rounded-md border-2 border-white bg-[#66738C] px-2 py-1 text-xs text-white shadow-lg transition-opacity group-hover:visible">
                                                View Work Order
                                              </span>
                                            </button>
                                          }
                                        />
                                      </div>
                                      <button
                                        onClick={() => {
                                          // removeClientIdFromParams();
                                          if (!searchParams) return;
                                          if (lead?.clientId) {
                                            const params = new URLSearchParams(
                                              searchParams.toString()
                                            );
                                            params.set(
                                              "clientId",
                                              lead?.clientId?.toString()
                                            );
                                            router.push(
                                              `${pathname}?${params.toString()}`
                                            );

                                            setSelectedClientId(lead?.clientId);
                                          }

                                          if (lead?.vehicleId) {
                                            setSelectedVehicleId(
                                              lead?.vehicleId
                                            );
                                          }
                                          setIsAppointmentModalOpen(true);
                                        }}
                                        className="group relative"
                                      >
                                        <Calendar
                                          size={18}
                                          className={`mt-1 ${isTechnician ? "hidden" : ""}`}
                                        />
                                        <span className="invisible absolute bottom-full left-14 mb-1 w-max -translate-x-1/2 transform whitespace-nowrap rounded-md border-2 border-white bg-[#66738C] px-2 py-1 text-xs text-white shadow-lg transition-opacity group-hover:visible">
                                          Appointment
                                        </span>
                                      </button>

                                      <div className="group relative mt-1.5">
                                        <TaskForm
                                          companyUsers={companyUsers}
                                          invoiceId={lead.invoiceId}
                                          previousTasks={lead.tasks || []}
                                          totalTasksCount={lead?.tasks?.length}
                                          isTechnician={isTechnician}
                                        />

                                        <span className="invisible absolute bottom-full left-14 mb-1 w-max -translate-x-1/2 transform whitespace-nowrap rounded-md border-2 border-white bg-[#66738C] px-2 py-1 text-xs text-white shadow-lg transition-opacity group-hover:visible">
                                          Add Task
                                        </span>
                                      </div>
                                    </div>
                                    <div className="group relative">
                                      {/* button */}
                                      <CirclePlus
                                        size={24}
                                        strokeWidth={1.5}
                                        className="mt-1 cursor-pointer"
                                      />
                                    </div>
                                  </div>
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
