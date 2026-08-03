"use client";
import ComponentsLightbox from "@/components/common/LightBox";
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
import { queryKeys } from "@/lib/queryKeys";
import { addTechnician, updateTechnician } from "@/service/work-order/api";
import {
  handleFileSelection,
  uploadAllAttachments,
} from "@/utils/handleFileAttachment";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { useIsAdminOrManager } from "@/utils/useIsAdminOrManager";
import {
  VehicleParts as Parts,
  Priority,
  Technician,
  TechnicianImage,
  User,
} from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { ImageIcon, X } from "lucide-react";
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

// Shared label styling so every field label in the grid renders with the
// same font-size/weight/line-height. Previously "Assign To" used its own
// inline className while SlimInput fields used labelClassName="text-sm
// md:text-base", which reverts to text-base (16px) at the md breakpoint —
// that mismatch was the real source of the row misalignment. The actual
// height mismatch between Selector and SlimInput/DropdownSelection is now
// fixed directly in Selector.tsx (h-9 mt-1 -> h-10), so this component no
// longer needs to work around it with wrapper classes.
const FIELD_LABEL_CLASS = "block px-1 text-sm font-medium text-slate-600";
const FIELD_WRAPPER_CLASS = "flex flex-col gap-1.5";

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
    due: moment().add(1, "day").format("YYYY-MM-DD"),
    amount: "",
    note: "",
    technicianNote: "",
  });

  const [technicianNote, setTechnicianNote] = useState(
    technician?.technicianNote || "",
  );

  const [formData, setFormData] = useState<{
    attachments: (TechnicianImage | LocalAttachment)[];
  }>({
    attachments:
      (technician?.images as (TechnicianImage | LocalAttachment)[]) || [],
  });

  const [imageUploadIsLoading, setImageUploadIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [lightboxItems, setLightboxItems] = useState<{ src: string }[] | null>(
    null,
  );
  const [priority, setPriority] = useState<Priority>("Low");
  const [loading, setLoading] = useState(false); // Loading state

  const isAdminOrManger = useIsAdminOrManager();
  const currentUser = useGetCurrentUser();
  const companyId = currentUser?.companyId;
  const isTechnician = currentUser?.employeeType === "Technician";

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch(
          "/api/pipeline/shop/get-employees?notType=Sales",
        );
        const json = await res.json();
        setEmployeeList(json?.data ?? []);
      } catch {
        setEmployeeList([]);
      }
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

      // FIX: moment(undefined/null/invalid) silently resolves to the Unix
      // epoch (01/01/1970) instead of throwing, which is what produced the
      // bogus "Assigned Date" value. Only format `date` when it's a valid
      // date; otherwise fall back to today, same as the "new technician"
      // default used in reset().
      const formattedDate = moment(date).isValid()
        ? moment(date).utc().format("YYYY-MM-DD")
        : moment().utc().format("YYYY-MM-DD");

      const formattedDue =
        due && moment(due).isValid()
          ? moment(due).utc().format("YYYY-MM-DD")
          : moment().add(1, "day").utc().format("YYYY-MM-DD");

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

      setTechnicianNote(technicianNote as string);
      setFormData({ attachments: images || [] });
    }
  }, [technician, employeeList]);
  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
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
              due: technician.due ? new Date(technician.due) : null,
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
              date: new Date(
                inputValues.date || moment().utc().format("YYYY-MM-DD"),
              ),
              due: inputValues.due ? new Date(inputValues.due) : null,
              amount: Number(inputValues.amount),
              note: inputValues.note,
              technicianNote: technicianNote,
              userId: employee?.id,
              status,
              priority,
              invoiceId,
              serviceId,
            };

        const updated = await updateTechnician(
          companyId!,
          invoiceId,
          technician.id,
          {
            ...updatedPayload,
            vehicleParts: isTechnician
              ? technician.vehicleParts || []
              : selectedVehicleParts,
            imageUrls: finalImageUrls,
          },
        );

        const newImages: TechnicianImage[] = finalImageUrls.map((url) => {
          return {
            fileUrl: url,
            uploadedAt: new Date(),
            technicianId: technician.id,
          } as TechnicianImage;
        });

        setFormData({ attachments: newImages });
        setOpen(false);
        setTechnicians((prev) =>
          prev.map((tech) =>
            tech.id === technician.id
              ? {
                  ...updated,
                  images: newImages,
                  hasPermission: tech.hasPermission,
                  vehicleParts: selectedVehicleParts as Parts[],
                }
              : tech,
          ),
        );
      } else {
        const payload = {
          serviceId: Number(serviceId),
          date: new Date(
            inputValues.date || moment().utc().format("YYYY-MM-DD"),
          ),
          due: inputValues.due ? new Date(inputValues.due) : null,
          amount: Number(inputValues.amount),
          note: inputValues.note,
          userId: employee?.id,
          priority,
          status,
          invoiceId,
          invoiceItemId,
          technicianNote: technicianNote,
        };
        const created = await addTechnician(companyId!, invoiceId, {
          ...payload,
          vehicleParts: selectedVehicleParts,
        });
        setOpen(false);
        setTechnicians((prev) => [
          ...prev,
          {
            ...created,
            hasPermission: true,
            vehicleParts: selectedVehicleParts as Parts[],
          },
        ]);
        setSelectedVehicleParts([]);
      }
    } catch (error) {
      const formattedError = errorHandler(error);
      setError(
        formattedError?.errorSource?.length
          ? formattedError.errorSource[0].message
          : formattedError.message,
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
      due: moment().add(1, "day").format("YYYY-MM-DD"),
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

  const handleCancel = () => {
    if (technician) {
      setFormData({
        attachments:
          (technician.images as (TechnicianImage | LocalAttachment)[]) || [],
      });
      setTechnicianNote(technician.technicianNote || "");
      setStatus(technician.status as TStatus);
    } else {
      reset();
    }
    setImageUploadIsLoading(false);
    setError("");
  };

  useEffect(() => {
    return () => {
      // Reset the pending state when the component unmounts
      startTransition(() => {});
    };
  }, []);

  //show only them who are not assigned
  const availableEmployees = employeeList.filter(
    (emp) => !technicianList?.some((tech) => tech.userId === emp.id),
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
      prev.filter((vPart) => vPart.partsName !== part.value),
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
          <p className="cursor-auto text-primary">{technician.name}</p>
        )
      ) : (
        writePermission &&
        !isTechnician && (
          <DialogTrigger asChild>
            <button
              onClick={reset}
              className="rounded-full border border-primary px-3 py-0.5"
            >
              + Add Labor
            </button>
          </DialogTrigger>
        )
      )}
      <DialogContent className="flex flex-col gap-0 p-0 sm:max-h-[90vh] overflow-hidden">
        <div className="p-6 pb-4 border-b">
          <h2 className="text-xl font-semibold text-slate-800">
            {technician ? "Edit Technician" : "Assign Technician"}
          </h2>
          {error && (
            <div className="mt-4 flex items-center justify-between rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-red-700">
              <p>{error}</p>
              <button type="button" onClick={() => setError("")}>
                <X size={20} strokeWidth={3} />
              </button>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {" "}
            {/* Assigned by */}
            <div className={FIELD_WRAPPER_CLASS}>
              <label className={FIELD_LABEL_CLASS}>Assign To</label>
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
                        .includes(search.toLowerCase()),
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
              labelClassName={FIELD_LABEL_CLASS}
              className="h-10 text-sm font-normal text-slate-700"
              label="Assigned Date"
              name="date"
              type="date"
              readOnly={isTechnician}
            />
            <SlimInput
              onChange={handleChange}
              value={inputValues.due}
              labelClassName={FIELD_LABEL_CLASS}
              className="h-10 text-sm font-normal text-slate-700"
              label="Due Date"
              name="due"
              type="date"
              readOnly={isTechnician}
            />
            <SlimInput
              onChange={handleChange}
              value={inputValues.amount}
              labelClassName={FIELD_LABEL_CLASS}
              className="h-10 text-sm font-normal text-slate-700"
              label="Amount"
              name="amount"
              readOnly={isTechnician}
            />{" "}
            <div className={FIELD_WRAPPER_CLASS}>
              <label className={FIELD_LABEL_CLASS}>Priority</label>
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
                  showSearch={false}
                  border={true}
                />
              </div>
            </div>
            <div className={FIELD_WRAPPER_CLASS}>
              <label htmlFor="status" className={FIELD_LABEL_CLASS}>
                Status
              </label>
              <DropdownSelection
                dropDownValues={[
                  "Pending",
                  "In Progress",
                  "Complete",
                  "Cancel",
                ]}
                onValueChange={(value) => setStatus(value as any)}
                changesValue={status}
                buttonClassName="h-10 cursor-pointer rounded-md border border-slate-300 px-3 py-2 outline-none w-full text-sm font-normal text-slate-700 hover:border-slate-400 transition-colors"
              />
            </div>
          </div>{" "}
          {isAdminOrManger && (
            <div className={FIELD_WRAPPER_CLASS}>
              <label htmlFor="note" className={FIELD_LABEL_CLASS}>
                New Note
              </label>
              <textarea
                onChange={handleChange}
                value={inputValues.note}
                name="note"
                className="h-32 w-full resize-none rounded-md border border-slate-300 p-3 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400"
                readOnly={isTechnician}
                placeholder="Add a note..."
              />
            </div>
          )}
          {technician && (
            <div className={FIELD_WRAPPER_CLASS}>
              <div className="flex justify-between">
                <p className="text-left text-sm font-semibold text-slate-700">
                  Work Note
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <div className="space-y-1.5">
                  <p className="text-xs text-slate-500">{formattedDate}</p>
                  <p className="text-sm text-slate-700">
                    {technician?.note || "No notes"}
                  </p>
                </div>
              </div>
            </div>
          )}
          {isTechnician ||
          (isAdminOrManger &&
            ((technicianNote && technicianNote.length > 0) ||
              formData.attachments.length > 0)) ? (
            <div className="space-y-4 mb-4 pb-4 border-b border-slate-100">
              <h3 className="text-left text-sm font-semibold text-slate-700">
                Technician Work Details
              </h3>

              {/* Technician Note Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-600">
                  Technician Work Note
                </label>
                {isTechnician ? (
                  <textarea
                    value={technicianNote}
                    onChange={(e) => setTechnicianNote(e.target.value)}
                    className="h-32 w-full resize-none rounded-md border border-slate-300 p-3 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400"
                    placeholder="Add work details, observations, and findings..."
                  />
                ) : isAdminOrManger &&
                  ((technicianNote && technicianNote.length > 0) ||
                    (technician as any)?.images?.length > 0) ? (
                  <div className="min-h-28 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 shadow-sm">
                    {/* show technician note if exists */}
                    {(technician as any)?.technicianNote || technicianNote ? (
                      <p className="whitespace-pre-wrap text-slate-700">
                        {(technician as any)?.technicianNote || technicianNote}
                      </p>
                    ) : (
                      <p className="text-slate-400">No work note added</p>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Photo Attachments Section */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-600">
                  Photo Attachments
                </label>
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-4">
                  <div className="flex flex-col gap-3">
                    {/* Upload Button */}
                    {isTechnician && (
                      <>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center justify-center gap-2 rounded-md border border-primary bg-primary/5 text-primary hover:bg-primary/10 cursor-pointer py-2 px-3 text-sm font-medium transition-colors"
                        >
                          <ImageIcon size={16} />
                          <span>
                            {imageUploadIsLoading
                              ? "Uploading Photos"
                              : "Upload Photo"}
                          </span>
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
                      </>
                    )}

                    {/* Attachments Gallery */}
                    {formData.attachments && formData.attachments.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {formData.attachments.map((att, idx) => (
                          <div key={idx} className="group relative">
                            <img
                              src={att.fileUrl || "/placeholder.svg"}
                              alt={`attachment-${idx}`}
                              onClick={() =>
                                setLightboxItems([
                                  { src: att.fileUrl || "/placeholder.svg" },
                                ])
                              }
                              className="h-20 w-20 rounded-lg border border-slate-200 object-cover shadow-sm transition-all group-hover:shadow-md cursor-pointer"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({
                                  attachments: prev.attachments.filter(
                                    (_, i) => i !== idx,
                                  ),
                                }));
                              }}
                              className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white shadow-md opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <X size={14} strokeWidth={3} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-xs text-slate-400">
                        No photos uploaded
                      </p>
                    )}
                    {/* Lightbox  */}
                    {lightboxItems && (
                      <ComponentsLightbox
                        getItems={lightboxItems.map((i) => ({ src: i.src }))}
                        startIndex={0}
                        onClose={() => setLightboxItems(null)}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          {/* select vehicle parts item */}{" "}
          <VehicleParts
            fromEdit={!!technician}
            selectedParts={selectedVehicleParts || []}
            onRemoveParts={handleRemoveParts}
            onSelectParts={handleSelectParts}
            isWriteAccess={isAdminOrManger && !isTechnician}
          />
        </div>
        <div className="p-6 pt-4 border-t">
          <DialogFooter>
            <DialogClose
              className="mt-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors md:mt-0"
              onClick={handleCancel}
            >
              Cancel
            </DialogClose>
            <button
              disabled={loading || pending} // Disable button when loading
              className="flex items-center justify-center rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-[#5A63E6] disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
