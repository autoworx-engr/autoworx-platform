"use client";
import { getEmployees } from "@/actions/employee/get";
import { addTechnician } from "@/actions/estimate/technician/addTechnician";
import { updateTechnician } from "@/actions/estimate/technician/updateTechnician";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/Dialog";
import { DropdownSelection } from "@/components/DropDownSelection";
import Selector from "@/components/Selector";
import { SlimInput } from "@/components/SlimInput";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { useIsAdminOrManager } from "@/utils/useIsAdminOrManager";
import {
  VehicleParts as Parts,
  Priority,
  Technician,
  TechnicianImage,
  User,
} from "@prisma/client";
import moment from "moment";
import {
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { Circles } from "react-loader-spinner"; // Importing the spinner
import VehicleParts from "./VehicleParts";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { ImageIcon, X } from "lucide-react";
import { handleFileSelection, uploadAllAttachments } from "@/utils/handleFileAttachment";

type LocalAttachment = {
  fileUrl: string;
  file?: File;
  id: number | string;
  isLocal?: boolean;
  uploadedAt?: Date;
};

type TProps = {
  invoiceItemId: number;
  invoiceId: string;
  serviceId: number;
  technician?: Technician & {
    name: string;
    hasPermission: boolean;
    vehicleParts: Parts[];
    images: TechnicianImage[];
  };
  setTechnicians: Dispatch<
    SetStateAction<
      (Technician & {
        name: string;
        hasPermission: boolean;
        vehicleParts: Parts[];
        images: TechnicianImage[];
      })[]
    >
  >;
  technicianList?: Technician[];
  writePermission: boolean;
};

type TStatus = "Pending" | "In Progress" | "Complete" | "Cancel";

export default function CreateAndEditLabor({
  invoiceItemId,
  invoiceId,
  serviceId,
  technician,
  setTechnicians,
  technicianList,
  writePermission,
}: TProps) {
  const [open, setOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [employeeOpen, setEmployeeOpen] = useState(false);

  const queryClient = useQueryClient();

  const [selectedVehicleParts, setSelectedVehicleParts] = useState<
    Partial<Parts>[]
  >(technician?.vehicleParts || []);

  const [employeeList, setEmployeeList] = useState<User[]>([]);
  const [pending, startTransition] = useTransition();

  const [employee, setEmployee] = useState<User | null>(null);
  const [status, setStatus] = useState<TStatus>("Pending");
  const [error, setError] = useState<string | null>(null);
  const [inputValues, setInputValues] = useState({
    date: moment().format("YYYY-MM-DD"),
    due: "",
    amount: "",
    note: "",
    technicianNote: "",
  });

  const [technicianNote, setTechnicianNote] = useState(
    technician?.technicianNote || ""
  );

  const [formData, setFormData] = useState<{
    attachments: (TechnicianImage | LocalAttachment)[];
  }>({
    attachments: (technician?.images as (TechnicianImage | LocalAttachment)[]) || []
  });
  const [uploadedImages, setUploadedImages] = useState<
  { fileUrl: string; id?: number; uploadedAt?: Date }[]
>(technician?.images || []);

  const [imageUploadIsLoading, setImageUploadIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [priority, setPriority] = useState<Priority>("Low");
  const [loading, setLoading] = useState(false); // Loading state

  const isAdminOrManger = useIsAdminOrManager();
  const currentUser = useGetCurrentUser();
  const isTechnician = currentUser?.employeeType === "Technician";

  useEffect(() => {
    const fetchEmployees = async () => {
      const employees = await getEmployees({ notType: "Sales" });
      setEmployeeList(employees);
    };
    fetchEmployees();
  }, []);

  // edit technician
  useEffect(() => {
    if (technician) {
      const {
        amount,
        date,
        due,
        note,
        priority,
        userId,
        status: technicianStatus,
        technicianNote,
        images,
      } = technician;

      const formattedDate = moment(date).utc().format("YYYY-MM-DD");
      const formattedDue = moment(due).utc().format("YYYY-MM-DD");
      setInputValues({
        date: formattedDate,
        due: formattedDue,
        amount: amount?.toString() as string,
        note: note as string,
        technicianNote: technicianNote as string,
      });
      setPriority(priority as Priority);
      setStatus(technicianStatus as TStatus);
      setEmployee(employeeList.find((e) => e.id === userId) || null);
      setUploadedImages(images || []);

      setTechnicianNote(technicianNote as string);
      setFormData({ attachments: images || [] });
    }
  }, [technician, employeeList]);
  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;

    // If user is a technician, don't allow changes to any field except status
    if (isTechnician && name !== "status" && name !== "technicianNote") {
      return;
    }

    if (name === "amount" && parseInt(value) < 0) {
      setError("Amount must be greater than zero");
      return;
    } else if (
      name === "amount" &&
      value !== "" &&
      Number.isNaN(parseInt(value))
    ) {
      setError("Amount must be a number");
      return;
    } else {
      setError(null);
      setInputValues((prevState) => ({
        ...prevState,
        [name]: value,
      }));
    }
  };

  // form submit
  const handleSubmit = async () => {
    setError(null);
    setLoading(true); // Show spinner

    if (!employee) {
      setError("Employee is required");
      setLoading(false); // Hide spinner
      return;
    }
    let finalImageUrls: string[] = [];
    try {
      finalImageUrls = await uploadAllAttachments(formData.attachments);
      setImageUploadIsLoading(false);
      if (technician) {
        setImageUploadIsLoading(true);
        // For technicians, only allow updating status, keep other fields from the original technician
        const updatedPayload = isTechnician
          ? {
              date: new Date(technician.date || new Date()),
              due: new Date(technician.due || new Date()),
              amount: Number(technician.amount) || 0,
              note: technician.note || "",
              technicianNote: technicianNote || "",
              userId: technician.userId,
              status,
              priority: technician.priority || "Low",
              invoiceId,
              serviceId,
            }
          : {
              date: new Date(inputValues.date),
              due: new Date(inputValues.due),
              amount: Number(inputValues.amount),
              note: inputValues.note,
              technicianNote: technicianNote,
              userId: employee?.id,
              status,
              priority,
              invoiceId,
              serviceId,
            };

        const response = await updateTechnician(
          technician.id,
          updatedPayload,
          isTechnician ? technician.vehicleParts || [] : selectedVehicleParts,
          finalImageUrls
        );

        if (response.type === "success") {
          setOpen(false);
          setTechnicians((prev) =>
            prev.map((tech) =>
              tech.id === technician.id
                ? {
                    ...response.data,
                    hasPermission: tech.hasPermission,
                    vehicleParts: selectedVehicleParts as Parts[],
                  }
                : tech
            )
          );
        } else if (response.type === "globalError") {
          setError(
            response?.errorSource?.length
              ? response.errorSource[0].message
              : response.message
          );
        }
      } else {
        const payload = {
          serviceId: Number(serviceId),
          date: new Date(inputValues.date),
          due: new Date(inputValues.due),
          amount: Number(inputValues.amount),
          note: inputValues.note,
          userId: employee?.id,
          priority,
          status,
          invoiceId,
          invoiceItemId,
          technicianNote: technicianNote,
        };
        const response = await addTechnician(payload, selectedVehicleParts);
        if (response.type === "success") {
          setOpen(false);
          setTechnicians((prev) => [
            ...prev,
            {
              ...response.data,
              hasPermission: true,
              vehicleParts: selectedVehicleParts as Parts[],
            },
          ]);
          setSelectedVehicleParts([]);
        } else if (response.type === "globalError") {
          setError(
            response?.errorSource?.length
              ? response.errorSource[0].message
              : response.message
          );
        }
      }
    } catch (error) {
      const formattedError = errorHandler(error);
      setError(
        formattedError?.errorSource?.length
          ? formattedError.errorSource[0].message
          : formattedError.message
      );
    } finally {
      queryClient.invalidateQueries({
        queryKey: queryKeys.getInvoiceModalDataKey(invoiceId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.getWorkOrderDataKey(invoiceId),
      });
      setLoading(false); // Hide spinner
      setImageUploadIsLoading(false);
    }
  };

  const date = moment(technician?.createdAt);
  const formattedDate = date.format("h:mmA Do MMMM YYYY");

  // reset input value
  const reset = () => {
    setInputValues({
      date: moment().format("YYYY-MM-DD"),
      due: "",
      amount: "",
      note: "",
      technicianNote: "",
    });
    setTechnicianNote("");
    setFormData({ attachments: [] });
    setStatus("Pending");
    setPriority("Low");
    setError("");
    setEmployee(null);
  };

  useEffect(() => {
    return () => {
      // Reset the pending state when the component unmounts
      startTransition(() => {});
    };
  }, []);

  //show only them who are not assigned
  const availableEmployees = employeeList.filter(
    (emp) => !technicianList?.some((tech) => tech.userId === emp.id)
  );
  // parts select handler
  const handleSelectParts = (part: { label: string; value: string }) => {
    if (isTechnician) return; // Prevent technicians from adding parts
    setSelectedVehicleParts((prev) => [
      ...prev,
      { partsName: part.value, invoiceId: invoiceId, serviceId: serviceId },
    ]);
  };

  // parts remove handler
  const handleRemoveParts = (part: { label: string; value: string }) => {
    if (isTechnician) return; // Prevent technicians from removing parts
    setSelectedVehicleParts((prev) =>
      prev.filter((vPart) => vPart.partsName !== part.value)
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {technician ? (
        technician.hasPermission ? (
          <DialogTrigger asChild>
            <p className="text-white">{technician.name}</p>
          </DialogTrigger>
        ) : (
          <p className="cursor-auto text-[#6571FF]">{technician.name}</p>
        )
      ) : (
        writePermission &&
        !isTechnician && (
          <DialogTrigger asChild>
            <button
              onClick={reset}
              className="rounded-full border border-[#6571FF] px-3 py-0.5"
            >
              + Add Labor
            </button>
          </DialogTrigger>
        )
      )}
      <DialogContent className="overflow-y-auto">
        <h2 className="text-xl font-bold">
          {technician ? "Edit Technician" : "Assign Technician"}
        </h2>
        {error && (
          <div className="mb-4 flex items-center justify-between rounded-md bg-red-700 px-4 py-1 text-white">
            <p>{error}</p>
            <button type="button" onClick={() => setError("")}>
              <X size={20} strokeWidth={3} />
            </button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          {" "}
          {/* Assigned by */}
          <div>
            <label className="mb-1 px-2 text-sm font-medium md:text-base">
              Assign To
            </label>
            <div
              className={isTechnician ? "pointer-events-none opacity-50" : ""}
            >
              <Selector
                label={(employee) =>
                  employee?.firstName ? `${employee.firstName}` : "Employee"
                }
                newButton={<div></div>}
                items={availableEmployees}
                displayList={(employee: User) => (
                  <p>
                    {employee.firstName} {employee.lastName}
                  </p>
                )}
                onSearch={(search: string) =>
                  availableEmployees.filter((employee) =>
                    `${employee.firstName} ${employee.lastName}`
                      .toLowerCase()
                      .includes(search.toLowerCase())
                  )
                }
                openState={[employeeOpen, setEmployeeOpen]}
                selectedItem={employee}
                //@ts-ignore
                setSelectedItem={setEmployee}
              />
            </div>
          </div>{" "}
          <SlimInput
            value={inputValues.date}
            onChange={handleChange}
            labelClassName="text-sm md:text-base"
            className="h-10"
            label="Assigned Date"
            name="date"
            type="date"
            readOnly={isTechnician}
          />
          <SlimInput
            onChange={handleChange}
            value={inputValues.due}
            labelClassName="text-sm md:text-base"
            className="h-10"
            label="Due Date"
            name="due"
            type="date"
            readOnly={isTechnician}
          />
          <SlimInput
            onChange={handleChange}
            value={inputValues.amount}
            labelClassName="text-sm md:text-base"
            className="h-10"
            label="Amount"
            name="amount"
            readOnly={isTechnician}
          />{" "}
          <div>
            <label className="mb-1 px-2 text-sm font-medium md:text-base">
              Priority
            </label>
            <div
              className={isTechnician ? "pointer-events-none opacity-50" : ""}
            >
              <Selector
                label={(priority) => (priority ? priority : "Priority")}
                items={["Low", "Medium", "High"]}
                displayList={(priority: Priority) => <p>{priority}</p>}
                openState={[priorityOpen, setPriorityOpen]}
                selectedItem={priority}
                //@ts-ignore
                setSelectedItem={setPriority}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="status"
              className="mb-1 px-2 text-sm font-medium md:text-base"
            >
              Status
            </label>
            {/* TODO: use better UI */}
            <DropdownSelection
              dropDownValues={["Pending", "In Progress", "Complete", "Cancel"]}
              onValueChange={(value) => setStatus(value as any)}
              changesValue={status}
              buttonClassName="h-10 cursor-pointer rounded-md border-2 border-slate-400 p-2 outline-none w-full py-2"
            />
          </div>
        </div>{" "}
        {isAdminOrManger && (
          <div>
            <label
              htmlFor="note"
              className="mb-1 px-2 text-sm font-medium md:text-base"
            >
              New Note
            </label>
            <textarea
              onChange={handleChange}
              value={inputValues.note}
              name="note"
              className="h-32 w-full resize-none rounded-md border-2 border-slate-400 p-2 outline-none"
              readOnly={isTechnician}
            />
          </div>
        )}
        {technician && (
          <div>
            <div className="flex justify-between">
              <p className="text-left text-lg font-bold">Work Note</p>
            </div>
            <div className="flex justify-between bg-blue-100 p-3">
              <div className="w-3/5 space-y-2">
                <p>Date: {formattedDate}</p>
                <p>{technician?.note || "No notes"}</p>
              </div>
            </div>
          </div>
        )}

        
        <div className="space-y-4 mb-6 pb-4 border-b border-slate-200">
          
          
          <div className="space-y-2">
            <label className="mb-1 px-2 text-sm font-medium md:text-base">
               Technician Work Details
            </label>
            {isTechnician ? (
              <textarea
                value={technicianNote}
                onChange={(e) => setTechnicianNote(e.target.value)}
                className="w-full h-28 resize-none rounded-lg border border-slate-300 bg-white p-3 text-sm shadow-sm transition-all focus:border-[#6571FF] focus:ring-2 focus:ring-[#6571FF]/20 placeholder:text-slate-400"
                placeholder="Add work details, observations, and findings..."
              />
            ) : (
              <div className="min-h-28 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 shadow-sm">
                {(technician as any)?.technicianNote ? (
                  <p className="whitespace-pre-wrap text-slate-700">
                    {(technician as any).technicianNote}
                  </p>
                ) : (
                  <p className="text-slate-400">No work note added</p>
                )}
              </div>
            )}
          </div>

     
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-600">
              Photo Attachments
            </label>
            <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4">
              <div className="flex flex-col gap-3">
            
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex items-center justify-center gap-2 rounded-lg border-2 py-2.5 px-3 text-sm font-medium transition-all ${
                    isTechnician
                      ? "border-[#6571FF] bg-blue-50 text-[#6571FF] hover:bg-blue-100 cursor-pointer"
                      : "border-slate-300 bg-slate-100 text-slate-500 cursor-not-allowed opacity-50"
                  }`}
                  disabled={!isTechnician}
                >
                  <ImageIcon size={16} />
                  <span>{imageUploadIsLoading ? 'Uploading...' : isTechnician ? "Upload Photos" : "View Photos"}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) =>
                    handleFileSelection({
                      event: e as any,
                      formData,
                      setFormData,
                    })
                  }
                />

           
                {formData.attachments && formData.attachments.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {formData.attachments.slice(0, 4).map((att, idx) => (
                      <div key={idx} className="group relative">
                        <img
                          src={att.fileUrl || "/placeholder.svg"}
                          alt={`attachment-${idx}`}
                          className="h-20 w-20 rounded-md border border-slate-200 object-cover shadow-sm transition-transform group-hover:scale-105"
                        />
                        {isTechnician && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                attachments: prev.attachments.filter(
                                  (_, i) => i !== idx
                                ),
                              }));
                            }}
                            className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white shadow-md opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <X size={14} strokeWidth={3} />
                          </button>
                        )}
                      </div>
                    ))}
                    {formData.attachments.length > 4 && (
                      <div className="flex h-20 w-20 items-center justify-center rounded-md border-2 border-slate-300 bg-slate-100 text-xs font-semibold text-slate-600">
                        +{formData.attachments.length - 4}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-xs text-slate-400">
                    No photos uploaded
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* select vehicle parts item */}{" "}
        <VehicleParts
          fromEdit={!!technician}
          selectedParts={selectedVehicleParts || []}
          onRemoveParts={handleRemoveParts}
          onSelectParts={handleSelectParts}
          isWriteAccess={isAdminOrManger && !isTechnician}
        />
        <DialogFooter>
          <DialogClose className="mt-2 rounded-lg border-2 border-slate-400 p-2 text-sm md:mt-0 md:text-base">
            Cancel
          </DialogClose>
          <button
            disabled={loading || pending} // Disable button when loading
            className="flex items-center justify-center rounded-lg border bg-[#6571FF] px-5 py-2 text-sm text-white disabled:bg-gray-400 md:text-base"
            onClick={() => startTransition(handleSubmit)}
          >
            {loading || pending ? (
              <Circles
                height="20"
                width="20"
                color="#ffffff"
                ariaLabel="circles-loading"
                wrapperStyle={{}}
                wrapperClass=""
                visible={true}
              />
            ) : technician ? (
              "Update"
            ) : (
              "Add"
            )}{" "}
            {/* Show spinner when loading */}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
