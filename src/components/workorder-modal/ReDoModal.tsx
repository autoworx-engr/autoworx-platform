"use client";
import { Dialog, DialogContent, DialogFooter } from "@/components/Dialog";
import { queryKeys } from "@/lib/queryKeys";
import { createRedo } from "@/service/work-order/api";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { InvoiceRedo, Technician } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { RotatingLines } from "react-loader-spinner";
import RedoTechnician from "./RedoTechnician";

type TProps = {
  invoiceId: string;
  serviceId: number;
  technicians: (Technician & { name: string })[];
  invoiceStatus: string | undefined;
  existingRedos: InvoiceRedo[];
  parentInvoiceId: string;
};

type TRedoTechnicianInfo = {
  invoiceId: string;
  serviceId: number;
  technicianId: number;
  notes: string;
};

export default function ReDoModal({
  invoiceId,
  serviceId,
  technicians,
  invoiceStatus,
  existingRedos,
  parentInvoiceId,
}: TProps) {
  const [open, setOpen] = useState(false);
  const [redoTechnicians, setRedoTechnicians] = useState<TRedoTechnicianInfo[]>(
    [],
  );
  const [pending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const currentUser = useGetCurrentUser();

  const isInvoiceDelivered = invoiceStatus === "Delivered";
  const hasExistingRedo = existingRedos.length > 0;

  const handleRedoTechnician = (
    event: React.ChangeEvent<HTMLInputElement>,
    technicianId: number,
    notes: string,
  ) => {
    const checked = event.target.checked;
    if (checked) {
      const redoTechnicianInfo = {
        invoiceId,
        serviceId,
        technicianId,
        notes,
      };
      setRedoTechnicians((prev) => [...prev, redoTechnicianInfo]);
    } else {
      setRedoTechnicians((prev) =>
        prev.filter((info) => info.technicianId !== technicianId),
      );
    }
  };

  const handleChangeTechnicianNotes = (
    event: React.ChangeEvent<HTMLInputElement>,
    technicianId: number,
  ) => {
    const { value } = event.target;
    setRedoTechnicians((prevTechnicians) =>
      prevTechnicians.map((info) => {
        return info.technicianId === technicianId
          ? { ...info, notes: value }
          : info;
      }),
    );
  };

  const handleSaveInvoiceRedo = async () => {
    if (redoTechnicians.length === 0) {
      toast.error("Please select at least one technician");
      return;
    }
    if (!currentUser?.companyId) return;
    try {
      await createRedo(
        currentUser.companyId,
        invoiceId,
        redoTechnicians.map(({ serviceId, technicianId, notes }) => ({
          serviceId,
          technicianId,
          notes,
        })),
      );
      setRedoTechnicians([]);
      setOpen(false);
      toast.success("Redo saved successfully");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.getWorkOrderDataKey(parentInvoiceId),
      });
    } catch (err) {
      toast.error("Failed to save redo technicians");
    }
  };

  return (
    <>
      {isInvoiceDelivered && !hasExistingRedo && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-white"
        >
          Re-Do
        </button>
      )}
      <Dialog open={open} onOpenChange={() => setOpen((prev) => !prev)}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <div className="space-y-3 rounded-md bg-background">
            <div className="mx-10 my-5">
              <div>
                <h3 className="text-xl font-bold">Service 1</h3>
                <p className="text-semibold text-base">
                  Select employee for re-do
                </p>
              </div>
              <div className="mt-5 flex flex-col justify-center space-y-1">
                <div className="flex">
                  <p className="min-w-[150px] text-left">Name</p>
                  <p>Notes</p>
                </div>
                <div className="space-y-3">
                  {/* input - 1 */}
                  {technicians &&
                    technicians?.length > 0 &&
                    technicians.map((technician) => (
                      <RedoTechnician
                        key={technician.id}
                        technician={technician}
                        onRedoTechnician={handleRedoTechnician}
                        onChangeTechnicianNotes={handleChangeTechnicianNotes}
                      />
                    ))}
                </div>
              </div>
            </div>
            <DialogFooter className="py-8">
              <button
                disabled={pending}
                onClick={() => startTransition(handleSaveInvoiceRedo)}
                className="mx-auto rounded bg-primary px-8 py-2 text-white"
              >
                {pending ? (
                  <RotatingLines
                    strokeColor="#fff"
                    strokeWidth="5"
                    width="25"
                  />
                ) : (
                  " Save Changes"
                )}
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
