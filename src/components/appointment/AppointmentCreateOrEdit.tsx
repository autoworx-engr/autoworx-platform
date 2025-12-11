"use client";

import { Dialog, DialogTrigger } from "@/components/Dialog";
import { Appointment, Lead } from "@prisma/client";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import AppointmentModalBody from "./AppointmentModalBody";
import { AppointModalBodyTechnician } from "./AppointModalBodyTechnician";
import { Plus } from "lucide-react";

type TAppointmentCreateOrEditProps = {
  fromLead?: boolean;
  clientId?: number | null;
  vehicleId?: number | null;
  defaultDate?: Date | string; // Use Date or string based on your requirements
  defaultStartTime?: string; // Use string for time in "HH:mm" format
  fromEdit?: boolean;
  appointmentId?: number;
  triggerIcon?: React.ReactNode;
  isModalOpen?: boolean; // Optional prop to control modal visibility
  setIsModalOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  onAppointmentCreated?: (
    appointment: Appointment & { lead: Lead | null }
  ) => void; // Replace 'any' with actual type
  onAppointmentUpdated?: (
    appointment: Appointment & { lead: Lead | null }
  ) => void; // Replace 'any' with
  onAppointmentDeleted?: (appointmentId?: number) => void; // Replace 'any' with actual type
};

export function AppointmentCreateOrEdit({
  fromLead = false,
  clientId,
  vehicleId,
  defaultDate,
  defaultStartTime,
  fromEdit,
  appointmentId,
  triggerIcon,
  onAppointmentCreated,
  onAppointmentUpdated,
  onAppointmentDeleted,
  isModalOpen = false,
  setIsModalOpen,
}: TAppointmentCreateOrEditProps) {
  const { data: session } = useSession();

  const state = useState(false);
  const [open, setOpen] = setIsModalOpen
    ? [isModalOpen, setIsModalOpen]
    : state;
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  // Function to remove 'clientId' from URL parameters
  const removeClientIdFromParams = () => {
    const searchParams = new URLSearchParams(params!);
    if (searchParams.has("clientId")) {
      searchParams.delete("clientId");
      router.push(pathname!);
    }
  };
  let trigger = null;
  if (triggerIcon) {
    trigger = triggerIcon;
  } else {
    trigger = (
      <button
        type="button"
        className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white
          bg-gradient-to-r from-[#6571FF] to-[#5a66ee]
          shadow-[0_4px_14px_0_rgba(101,113,255,0.39)]
          hover:shadow-[0_6px_20px_rgba(101,113,255,0.23)]
          hover:-translate-y-0.5
          active:translate-y-0 active:scale-100
          transition-all duration-300 ease-in-out"
      >
        <span className="hidden lg:inline">
          {fromEdit ? "Edit" : "New"} Appointment
        </span>
        <span className="inline lg:hidden">
          <Plus size={20} />
        </span>
      </button>
    );
  }
  return (
    // <div className="newAppointment">
    <Dialog
      open={open}
      onOpenChange={(open) => {
        removeClientIdFromParams();
        setOpen(open);
      }}
    >
      {!setIsModalOpen && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {open && session?.user?.employeeType === "Technician" ? (
        <AppointModalBodyTechnician appointmentId={appointmentId!} />
      ) : (
        <AppointmentModalBody
          fromLead={fromLead}
          clientId={clientId}
          vehicleId={vehicleId}
          date={defaultDate}
          startTime={defaultStartTime}
          appointmentId={appointmentId}
          fromEdit={fromEdit}
          onModalClose={() => setOpen(false)}
          onAppointmentCreated={onAppointmentCreated}
          onAppointmentUpdated={onAppointmentUpdated}
          onAppointmentDeleted={onAppointmentDeleted}
          setIsAppointmentModalOpen={setOpen}
        />
      )}
    </Dialog>
    // </div>
  );
}
