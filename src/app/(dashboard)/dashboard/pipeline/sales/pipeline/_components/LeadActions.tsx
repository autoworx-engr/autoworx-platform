import { AppointmentCreateOrEdit } from "@/components/appointment/AppointmentCreateOrEdit";
import { actionTypes } from "@/constants/lead.constant";
import { useColumnDispatch } from "@/context/sales-pipeline.context";
import { errorToast, successToast } from "@/lib/toast";
import { updatePipelineAutomationTrigger } from "@/service/pipeline-automation-trigger/api";
import { LeadWithSalesUser } from "@/types/invoiceLead";
import { Appointment } from "@prisma/client";
import { customAlphabet } from "nanoid";
import Image from "next/image";
import { useState, useTransition } from "react";
import CommunicationsNoti from "../../../components/CommunicationsNoti";
import PipelineInvoiceModal from "../../../components/PipelineInvoiceModal";
import AddTaskComponent from "./AddTaskComponent";
import LeadAssign from "./LeadAssign";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { createDraftEstimate } from "@/actions/estimate/invoice/createDraft";
import { createLeadDraftEstimate } from "@/actions/pipelines/createLeadDraftEstimate";
import { Calendar, CalendarCheck } from "lucide-react";
import { updateInvoiceAutomationTrigger } from "@/service/invoice-automation-trigger/api";

type TProps = {
  lead: LeadWithSalesUser;
};

type TCreateDraftEstimateParams = {
  columnId: number;
  leadId: number;
  clientId?: number;
  vehicleId: number | null;
};

export default function LeadActions({ lead }: TProps) {
  const [pending, startTransition] = useTransition();

  const dispatch = useColumnDispatch();

  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  const handleCreateDraftEstimate = async ({
    columnId,
    leadId,
    clientId,
    vehicleId,
  }: TCreateDraftEstimateParams) => {
    try {
      const draftEstimateId = customAlphabet("1234567890", 10)();
      const res = await createLeadDraftEstimate({
        id: draftEstimateId,
        leadId,
        clientId: clientId!,
        vehicleId: vehicleId,
        type: "Estimate",
      });

      if (res.type === "success") {
        successToast(res?.message || "Draft estimate created");
        //updating the pipelien data with the draft estimate flag
        dispatch({
          type: actionTypes.CREATE_INVOICE,
          payload: {
            columnId: columnId,
            leadId: leadId,
            isInvoiceCreated: true,
          },
        });

        // Trigger pipeline automation
        const response = await updatePipelineAutomationTrigger({
          condition: "ESTIMATE_CREATED",
          companyId: res?.data.companyId,
          leadId,
          columnId,
        });

        if (response.statusCode === 200) {
          dispatch({
            type: actionTypes.AUTOMATION_TRIGGER,
            payload: {
              updatedLead: response.data,
              previousColumnId: columnId,
            },
          });
        }

        // Invoice automation
        await updateInvoiceAutomationTrigger({
          companyId: res?.data.companyId,
          invoiceId: res?.data?.id,
          columnId: columnId!,
          type: res?.data?.type,
        });
      } else if (res.type === "error") {
        setInvoiceId(res.data.id);
      } else if (res.type === "globalError") {
        errorToast(
          res?.errorSource && res?.errorSource.length > 0
            ? res?.errorSource[0].message
            : res.message
        );
      }
    } catch (err) {
      console.error("Error creating draft estimate:", err);
      errorHandler(err);
      errorToast("Failed to create draft estimate. Please try again.");
    }
  };

  const handleUpdateAppointmentInLead = async (
    appointment: Appointment,
    leadInfo: {
      leadId: number;
      columnId: number;
    }
  ) => {
    try {
      dispatch({
        type: actionTypes.ADD_APPOINTMENT,
        payload: {
          leadId: leadInfo.leadId,
          columnId: leadInfo.columnId,
          appointment: appointment,
        },
      });

      // Trigger pipeline automation
      const response = await updatePipelineAutomationTrigger({
        condition: "APPOINTMENT_SCHEDULED",
        companyId: lead.companyId,
        leadId: leadInfo.leadId,
        columnId: leadInfo.columnId,
      });

      if (response.statusCode === 200) {
        dispatch({
          type: actionTypes.AUTOMATION_TRIGGER,
          payload: {
            updatedLead: response.data,
            previousColumnId: leadInfo.columnId,
          },
        });
      }

      // Trigger communication automation
      // updateCommunicationAutomationTrigger({
      //   companyId: lead.companyId,
      //   leadId: leadInfo.leadId,
      //   columnId: leadInfo.columnId,
      // });
    } catch (err) {
      console.error("Automation run failed", err);
    }
  };

  const appointment =
    (lead?.client?.appointments?.length ?? 0) > 0
      ? lead?.client?.appointments?.[0]
      : undefined;
  const fromEdit = !!appointment?.id;
  const vehicleId = lead?.vehicleId;
  const clientId = lead?.client?.id;
  return (
    <>
      <div className="flex justify-between">
        <div className="flex items-center gap-2">
          {/* client message notification or redirect to client section component */}
          <CommunicationsNoti lead={lead} />
          <button
            disabled={pending}
            type="button"
            onClick={() => {
              if (lead?.columnId && lead.id && lead?.client) {
                startTransition(() =>
                  handleCreateDraftEstimate({
                    columnId: lead.columnId!,
                    leadId: lead.id,
                    clientId: lead.client?.id,
                    vehicleId: lead?.vehicleId,
                  })
                );
              }
            }}
            className="group relative disabled:cursor-not-allowed disabled:opacity-50"
          >
            {lead.isEstimateCreated ? (
              <PipelineInvoiceModal invoiceId={invoiceId} />
            ) : (
              <Image
                src="/icons/draftEstimate.png"
                alt="draftEstimate"
                width={14}
                height={14}
              />
            )}
            <span className="invisible absolute bottom-full left-14 mb-1 w-max -translate-x-1/2 transform whitespace-nowrap rounded-md border-2 border-white bg-[#66738C] px-2 py-1 text-xs text-white shadow-lg transition-opacity group-hover:visible">
              Draft estimate
            </span>
          </button>
          {/* TODO: shown a mark when create a appointment */}
          <AppointmentCreateOrEdit
            fromEdit={fromEdit}
            fromLead
            appointmentId={fromEdit ? appointment?.id : undefined}
            triggerIcon={
              <button className="group relative">
                {!!appointment ? (
                  <CalendarCheck size={18} color="#6571FF" />
                ) : (
                  <Calendar size={18} color="#66738C" />
                )}

                <span className="invisible absolute bottom-full left-14 mb-1 w-max -translate-x-1/2 transform whitespace-nowrap rounded-md border-2 border-white bg-[#66738C] px-2 py-1 text-xs text-white shadow-lg transition-opacity group-hover:visible">
                  New Appointment
                </span>
              </button>
            }
            vehicleId={vehicleId}
            clientId={clientId}
            onAppointmentCreated={(appointment: Appointment) => {
              handleUpdateAppointmentInLead(appointment, {
                leadId: lead.id,
                columnId: lead.columnId!,
              });
            }}
            onAppointmentUpdated={(appointment: Appointment) => {
              handleUpdateAppointmentInLead(appointment, {
                leadId: lead.id,
                columnId: lead.columnId!,
              });
            }}
          />
          {/* add task component */}
          <AddTaskComponent lead={lead} />
        </div>
        <LeadAssign
          lead={lead}
          salesUser={
            lead.salesUser && {
              id: lead.salesUser.id,
              firstName: lead.salesUser?.firstName,
              lastName: lead.salesUser?.lastName,
            }
          }
        />
      </div>

      {/* {openAppointment && lead?.client?.id && lead.vehicleId && (
        <NewAppointmentPipeline
          onUpdateAppointmentInLead={handleUpdateAppointmentInLead}
          clientId={lead?.client?.id}
          vehicleId={lead.vehicleId}
          popup={popup}
          open={open}
          close={() => {
            close();
            setOpenAppointment(false);
          }}
        />
      )} */}
    </>
  );
}
