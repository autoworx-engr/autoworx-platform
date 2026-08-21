"use client";

import { AppointmentCreateOrEdit } from "@/components/appointment/AppointmentCreateOrEdit";
import { LeadWithSalesUser } from "@/types/invoiceLead";
import { Appointment, User } from "@prisma/client";
import { Calendar, CalendarCheck, MessageCircleMore } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import PipelineInvoiceModal from "./PipelineInvoiceModal";
import TaskForm from "./TaskForm";

type TLeadTableActionsProps = {
  lead: LeadWithSalesUser;
  companyUsers: User[];
  isPending: boolean;
  onCreateDraftEstimate: (args: {
    leadId: number;
    clientId: number | undefined;
    vehicleId: number | undefined;
  }) => void;
  onUpdateAppointment: (
    appointment: Appointment,
    lead: { leadId: number; columnId: number },
  ) => void;
};

/** Hover label shared by every action icon in the row. */
function ActionTooltip({ children }: { children: string }) {
  return (
    <span className="invisible absolute top-full left-14 z-20 mt-1 w-max -translate-x-1/2 transform whitespace-nowrap rounded-md border-2 border-white bg-[#66738C] px-2 py-1 text-xs text-white shadow-lg transition-opacity group-hover:visible">
      {children}
    </span>
  );
}

/** Greyed-out stand-in for an action that needs a client the lead doesn't have. */
function DisabledAction({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="group relative cursor-not-allowed opacity-40">
      {children}
      <ActionTooltip>{label}</ActionTooltip>
    </span>
  );
}

const DraftEstimateIcon = () => (
  <div className="relative h-4 w-4">
    <Image
      src="/icons/draftEstimate.png"
      alt="draftEstimate"
      fill
      sizes="16px"
      className="object-contain duration-300 hover:opacity-80"
      loading="lazy"
    />
  </div>
);

const AddTaskIcon = () => (
  <div className="relative h-4 w-4">
    <Image
      src="/icons/addtask.png"
      alt="Add Task"
      fill
      sizes="16px"
      className="object-contain"
      loading="lazy"
    />
  </div>
);

/**
 * Actions cell of the sales Leads table.
 *
 * Communications, draft estimate, appointment and task all hang off a client
 * record, so a lead with no client (an unqualified enquiry that was never
 * converted) renders them disabled rather than opening a modal that can't be
 * saved.
 */
export default function LeadTableActions({
  lead,
  companyUsers,
  isPending,
  onCreateDraftEstimate,
  onUpdateAppointment,
}: TLeadTableActionsProps) {
  // Lead.clientId has no foreign key, so it can still hold the id of a client
  // that was deleted or belongs to another company. Only the client the server
  // actually resolved proves there is one to act on.
  const clientId = lead?.client?.id ?? undefined;
  const vehicleId = lead?.client?.vehicle?.id ?? lead?.vehicleId ?? undefined;
  const hasClient = !!clientId;

  const appointment =
    lead?.latestAppointment ??
    ((lead?.client?.appointments?.length ?? 0) > 0
      ? lead?.client?.appointments?.[0]
      : undefined);

  const hasDraftEstimate = !!lead.isEstimateCreated && !!lead.invoiceId;

  return (
    <div className="flex items-center gap-2">
      {hasClient ? (
        <Link
          href={`/dashboard/communication/client/${clientId}?source=lead`}
          className="group relative"
        >
          <MessageCircleMore
            size={20}
            className="duration-300 hover:text-primary"
          />
          <ActionTooltip>Communications</ActionTooltip>
        </Link>
      ) : (
        <DisabledAction label="Communications">
          <MessageCircleMore size={20} />
        </DisabledAction>
      )}

      {hasDraftEstimate ? (
        <span className="group relative">
          <PipelineInvoiceModal invoiceId={lead.invoiceId!} />
          <ActionTooltip>Draft estimate</ActionTooltip>
        </span>
      ) : hasClient ? (
        <button
          onClick={() =>
            onCreateDraftEstimate({ leadId: lead.id, clientId, vehicleId })
          }
          disabled={isPending}
          className="group relative disabled:cursor-not-allowed disabled:opacity-40"
        >
          <DraftEstimateIcon />
          <ActionTooltip>Draft estimate</ActionTooltip>
        </button>
      ) : (
        <DisabledAction label="Draft estimate">
          <DraftEstimateIcon />
        </DisabledAction>
      )}

      {hasClient ? (
        <AppointmentCreateOrEdit
          fromEdit={!!appointment}
          fromLead
          appointmentId={appointment?.id}
          triggerIcon={
            <button className="group relative">
              {!!appointment ? (
                <CalendarCheck size={18} color="#6571FF" />
              ) : (
                <Calendar size={18} color="#66738C" />
              )}
              <ActionTooltip>Appointment</ActionTooltip>
            </button>
          }
          vehicleId={vehicleId}
          clientId={clientId}
          onAppointmentCreated={(appointment: Appointment) =>
            onUpdateAppointment(appointment, {
              leadId: lead.id,
              columnId: lead.columnId!,
            })
          }
          onAppointmentUpdated={(appointment: Appointment) =>
            onUpdateAppointment(appointment, {
              leadId: lead.id,
              columnId: lead.columnId!,
            })
          }
        />
      ) : (
        <DisabledAction label="Appointment">
          <Calendar size={18} color="#66738C" />
        </DisabledAction>
      )}

      {hasClient ? (
        <div className="group relative">
          <TaskForm
            companyUsers={companyUsers}
            leadId={lead.id}
            previousTasks={lead.tasks || []}
            totalTasksCount={lead.taskCount ?? 0}
          />
          <ActionTooltip>Add Task</ActionTooltip>
        </div>
      ) : (
        <DisabledAction label="Add Task">
          <AddTaskIcon />
        </DisabledAction>
      )}
    </div>
  );
}
