import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SetStateAction, useEffect, useRef, useState } from "react";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { Tag, User } from "@prisma/client";
import { Employee, ShopLead, ShopPipelineData } from "@/types/invoiceLead";
import {
  ArrowRightLeft,
  BookCheck,
  Calendar,
  CirclePlus,
  MessageCircleMore,
} from "lucide-react";
import { EmployeeSelector } from "./EmployeeSelector";
import ShopColumnDropdown from "./ShopColumnDropdown";
import { EmployeeTagSelector } from "./EmployeeTagSelector";
import ServiceSelector from "./ServiceSelector";
import Link from "next/link";
import WorkOrderModal from "@/components/workorder-modal/WorkOrderModal";
import Image from "next/image";
import TaskForm from "./TaskForm";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
type DraggableLeadProps = {
  screenWidth: number;
  categoryIndex: number;
  leadIndex: number;
  lead: ShopLead;
  leadRefs: React.MutableRefObject<Map<string, HTMLLIElement>>;
  handleColumnDropdownToggle: (
    categoryIndex: number,
    leadIndex: number
  ) => void;
  pipelineType: string;
  isDropdownOpen?: boolean;
  handleDropdownToggle: (categoryIndex: number, leadIndex: number) => void;
  selectedEmployee: Employee | null; // from parent component
  createEmployeeSelectHandler: (
    categoryIndex: number,
    leadIndex: number
  ) => (value: SetStateAction<Employee | null>) => void;
  companyUsers: User[];
  setOpenDropdownIndex: (
    value: SetStateAction<{
      category: number;
      index: number;
    } | null>
  ) => void;

  showColumnSelect: { [key: string]: boolean };
  pipelineData: ShopPipelineData[];
  handleColumnChange: (
    categoryIndex: number,
    leadIndex: number,
    newColumnId: string
  ) => Promise<void>;
  setShowColumnSelect: (
    value: SetStateAction<{
      [key: string]: boolean;
    }>
  ) => void;
  setColumnDropdownOpen: (
    value: SetStateAction<{
      [key: string]: boolean;
    }>
  ) => void;
  columnDropdownOpen: { [key: string]: boolean };
  handleTagRemove: (
    categoryIndex: number,
    leadIndex: number,
    tagToRemove: Tag
  ) => Promise<void>;
  handleTagDropdownToggle: (categoryIndex: number, leadIndex: number) => void;
  isTagDropdownOpen: boolean; // from parent component
  handleTagSelect: (
    categoryIndex: number,
    leadIndex: number,
    selectedTag: Tag | undefined
  ) => Promise<void>;
  isServiceDropdownOpen: boolean; // from parent component
  handleServiceDropdownToggle: (
    categoryIndex: number,
    leadIndex: number
  ) => void;
  isTechnician: boolean | undefined;
  setSelectedClientId: (value: SetStateAction<number | null>) => void;
  setSelectedVehicleId: (value: SetStateAction<number | null>) => void;
  setIsAppointmentModalOpen: (value: SetStateAction<boolean>) => void;
};
const DraggableLead = ({
  screenWidth,
  categoryIndex,
  leadIndex,
  lead,
  leadRefs,
  handleColumnDropdownToggle,
  pipelineType,
  isDropdownOpen,
  handleDropdownToggle,
  selectedEmployee, // from parent component
  createEmployeeSelectHandler,
  companyUsers,
  setOpenDropdownIndex,
  showColumnSelect,
  pipelineData,
  handleColumnChange,
  setShowColumnSelect,
  setColumnDropdownOpen,
  columnDropdownOpen,
  handleTagRemove,
  handleTagDropdownToggle,
  isTagDropdownOpen, // from parent component
  handleTagSelect,
  isServiceDropdownOpen, // from parent component
  handleServiceDropdownToggle,
  isTechnician,
  setSelectedClientId,
  setSelectedVehicleId,
  setIsAppointmentModalOpen,
}: DraggableLeadProps) => {
  const leadRef = useRef<HTMLLIElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const currentUser = useGetCurrentUser();
  useEffect(() => {
    const element = leadRef.current;
    if (!element) return;

    if (screenWidth < 768) return;

    return combine(
      draggable({
        element,
        getInitialData: () => ({
          type: "LEAD",
          columnIndex: categoryIndex,
          leadIndex: leadIndex,
          invoiceId: lead.invoiceId,
        }),
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false),
      }),
      dropTargetForElements({
        element,
        getData: () => ({
          columnIndex: categoryIndex,
          index: leadIndex,
        }),
        canDrop: ({ source }) => {
          const sourceData = source.data as { type?: string };
          return sourceData.type === "LEAD";
        },
        onDragEnter: () => setIsDropTarget(true),
        onDragLeave: () => setIsDropTarget(false),
        onDrop: () => setIsDropTarget(false),
      })
    );
  }, [categoryIndex, leadIndex, screenWidth, lead.invoiceId]);
  const key = `${categoryIndex}-${leadIndex}`;

  const getInitials = (employee: Employee | null) => {
    if (employee) {
      const firstNameInitial = employee.firstName.charAt(0).toUpperCase();
      const lastNameInitial = employee.lastName?.charAt(0).toUpperCase();
      return `${firstNameInitial}${lastNameInitial}`;
    }
    return "";
  };
  return (
    <li
      ref={(el) => {
        leadRef.current = el;
        if (el) leadRefs.current.set(key, el);
      }}
      className={`max-w-auto relative mx-1 my-1 h-fit animate-none rounded-xl border bg-background p-1 duration-300 hover:bg-slate-100 cursor-grab active:cursor-grabbing  ${isDropTarget ? "ring-2 ring-blue-500 bg-blue-50" : ""}`}
      style={{
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-inter overflow-auto pb-2 font-semibold text-black">
          {lead.name}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleColumnDropdownToggle(categoryIndex, leadIndex)}
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
                  onClick={() => handleDropdownToggle(categoryIndex, leadIndex)}
                >
                  {selectedEmployee ? (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-gray-600 bg-background text-xs text-black">
                      {getInitials(selectedEmployee)}
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
                    setOpenDropdown={() => setOpenDropdownIndex(null)}
                    companyUsers={companyUsers}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showColumnSelect[`${categoryIndex}-${leadIndex}`] && (
        <ShopColumnDropdown
          options={pipelineData
            .filter((col, idx) => idx !== categoryIndex)
            .map((col, idx) => ({
              id: col.id,
              value: pipelineData.findIndex((p) => p.id === col.id).toString(),
              label: col.title || "Untitled Column",
            }))}
          onSelect={(columnId) =>
            handleColumnChange(categoryIndex, leadIndex, columnId)
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
          isOpen={columnDropdownOpen[`${categoryIndex}-${leadIndex}`] || false}
        />
      )}

      <div className="mb-1 flex flex-wrap items-center gap-1">
        {pipelineData[categoryIndex].leads[leadIndex].tags.map((invoiceTag) => (
          <span
            key={`tag-${invoiceTag.id}`}
            className="mr-2 inline-flex h-[20px] items-center rounded bg-gray-300 px-1 py-1 text-xs font-semibold text-black"
            style={{
              backgroundColor: invoiceTag.tag?.bgColor,
              color: invoiceTag.tag?.textColor,
            }}
          >
            {invoiceTag.tag.name}
            <div
              className="ml-1 cursor-pointer text-xs text-black"
              onClick={() =>
                handleTagRemove(categoryIndex, leadIndex, invoiceTag.tag)
              }
            >
              ✕
            </div>
          </span>
        ))}

        <button
          onClick={() => handleTagDropdownToggle(categoryIndex, leadIndex)}
          className="inline-flex h-[20px] items-center justify-center rounded bg-[#6571FF] px-1 py-1 text-xs font-semibold text-white"
        >
          + Add
        </button>
      </div>

      {isTagDropdownOpen && (
        <div className="-left-100 absolute top-12 z-20">
          <EmployeeTagSelector
            employeeTags={pipelineData[categoryIndex].leads[leadIndex].tags.map(
              (invoiceTag) => invoiceTag.tag
            )}
            setValue={(selectedTag) =>
              handleTagSelect(categoryIndex, leadIndex, selectedTag)
            }
            open={isTagDropdownOpen}
            setOpen={() => handleTagDropdownToggle(categoryIndex, leadIndex)}
            tagType="GENERAL"
          />
        </div>
      )}

      <div>
        <p className="mb-2 overflow-auto text-xs">{lead.vehicle}</p>
      </div>

      {/* service code */}
      <ServiceSelector
        services={lead.services.completed
          .concat(lead.services.incomplete)
          .concat(lead.services.unAssigned)}
        completedServices={lead.services.completed}
        incompleteServices={lead.services.incomplete}
        unAssignedServices={lead.services.unAssigned}
        isServiceDropdownOpen={isServiceDropdownOpen}
        handleServiceDropdownToggle={() =>
          handleServiceDropdownToggle(categoryIndex, leadIndex)
        }
        type={pipelineType}
      />
      {pipelineType === "Sales Pipelines" && (
        <div>
          <p className="overflow-auto pb-2 text-xs">Lead Source</p>
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
                const params = new URLSearchParams(searchParams.toString());
                params.set("clientId", lead?.clientId?.toString());
                router.push(`${pathname}?${params.toString()}`);

                setSelectedClientId(lead?.clientId);
              }

              if (lead?.vehicleId) {
                setSelectedVehicleId(lead?.vehicleId);
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
          {/* <CirclePlus
                                              size={24}
                                              strokeWidth={1.5}
                                              className="mt-1 cursor-pointer"
                                            /> */}
          {/* Invoice id */}
          {(currentUser?.employeeType === "Manager" ||
            currentUser?.employeeType === "Admin" ||
            currentUser?.isSuperAdmin === true) && (
            <div className="group relative mx-0 mt-1 p-0">
              <InvoiceModal
                invoiceId={lead.invoiceId}
                buttonChild={
                  <button className="group relative flex w-6 items-center justify-center">
                    <BookCheck width={18} height={18} />
                    <span className="invisible absolute bottom-full px-2 mb-1 w-max -translate-x-1/2 transform whitespace-nowrap rounded-md border-2 border-white bg-[#66738C]  py-1 text-xs text-white shadow-lg transition-opacity group-hover:visible">
                      View Invoice
                    </span>
                  </button>
                }
              />
            </div>
          )}
        </div>
      </div>
    </li>
  );
};

export default DraggableLead;
