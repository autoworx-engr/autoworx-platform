"use client";

import { Dialog, DialogTrigger } from "@/components/Dialog";
import { Appointment, Lead } from "@prisma/client";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import AppointmentModalBody from "./AppointmentModalBody";
import { AppointModalBodyTechnician } from "./AppointModalBodyTechnician";
import { Plus } from "lucide-react";
import { Button } from "../ui/button";

type TAppointmentCreateOrEditProps = {
  fromLead?: boolean;
  clientId?: number | null;
  vehicleId?: number | null;
  draftEstimateId?: string | null;
  defaultDate?: Date | string; // Use Date or string based on your requirements
  defaultStartTime?: string; // Use string for time in "HH:mm" format
  fromEdit?: boolean;
  appointmentId?: number;
  triggerIcon?: React.ReactNode;
  isModalOpen?: boolean; // Optional prop to control modal visibility
  setIsModalOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  onAppointmentCreated?: (
    appointment: Appointment & { lead: Lead | null },
  ) => void; // Replace 'any' with actual type
  onAppointmentUpdated?: (
    appointment: Appointment & { lead: Lead | null },
  ) => void; // Replace 'any' with
  onAppointmentDeleted?: (appointmentId?: number) => void; // Replace 'any' with actual type
};

export function AppointmentCreateOrEdit({
  fromLead = false,
  clientId,
  vehicleId,
  draftEstimateId,
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
      <Button>
        <span className="hidden lg:inline">
          {fromEdit ? "Edit" : "New"} Appointment
        </span>
        <span className="lg:hidden text-xs flex items-center gap-1">
          <Plus size={16} /> Appointment
        </span>
      </Button>
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
          draftEstimateId={draftEstimateId}
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
