import { createLeadDraftEstimate } from "@/actions/pipelines/createLeadDraftEstimate";
import { actionTypes } from "@/constants/lead.constant";
import {
  useColumnDispatch,
  useCompanyUsers,
} from "@/context/sales-pipeline.context";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { errorToast, successToast } from "@/lib/toast";
import { usePopupStore } from "@/stores/popup";
import { LeadWithSalesUser } from "@/types/invoiceLead";
import { Appointment } from "@prisma/client";
import { customAlphabet } from "nanoid";
import Image from "next/image";
import { useState, useTransition } from "react";
import AppointmentBtn from "../../../components/AppointmentBtn";
import CommunicationsNoti from "../../../components/CommunicationsNoti";
import { NewAppointmentPipeline } from "../../../components/NewAppointmentPipeline";
import PipelineInvoiceModal from "../../../components/PipelineInvoiceModal";
import AddTaskComponent from "./AddTaskComponent";
import LeadAssign from "./LeadAssign";
import { updatePipelineAutomationTrigger } from "@/service/pipeline-automation-trigger/api";
import { updateCommunicationAutomationTrigger } from "@/service/communication-automation-trigger/api";

type TProps = {
  lead: LeadWithSalesUser;
};

type TCreateDraftEstimateParams = {
  columnId: number;
  leadId: number;
  clientId?: number;
  vehicleId: number;
};

export default function LeadActions({ lead }: TProps) {
  const [pending, startTransition] = useTransition();

  const dispatch = useColumnDispatch();

  const companyUsers = useCompanyUsers();

  const [openAppointment, setOpenAppointment] = useState(false);

  const { popup, open, close } = usePopupStore();

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
        clientId: clientId,
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

        // Trigger communication automation
        updateCommunicationAutomationTrigger({
          companyId: lead?.companyId,
          leadId,
          columnId,
        });
      } else if (res.type === "error") {
        setInvoiceId(res.data.id);
      } else if (res.type === "globalError") {
        errorToast(
          res?.errorSource && res?.errorSource.length > 0
            ? res?.errorSource[0].message
            : res.message,
        );
      }
    } catch (err) {
      console.error("Error creating draft estimate:", err);
      errorToast("Failed to create draft estimate. Please try again.");
    }
  };

  const handleUpdateAppointmentInLead = async (
    appointment: Appointment,
    leadInfo: {
      leadId: number;
      columnId: number;
    },
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
      successToast("Appointment created successfully");

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
      updateCommunicationAutomationTrigger({
        companyId: lead.companyId,
        leadId: leadInfo.leadId,
        columnId: leadInfo.columnId,
      });
    } catch (err) {
      console.error("Automation run failed", err);
    }
  };

  return (
    <>
      <div className="flex justify-between">
        <div className="flex items-center gap-2">
          {/* client message notification or redirect to client section component */}
          <CommunicationsNoti
            lead={{
              clientId: lead?.client?.id!,
              totalMessage: lead?.totalMessage ?? 0,
            }}
          />
          <button
            disabled={pending}
            type="button"
            onClick={() => {
              if (lead?.columnId && lead.id) {
                startTransition(() =>
                  handleCreateDraftEstimate({
                    columnId: lead.columnId!,
                    leadId: lead.id,
                    clientId: lead.client?.id,
                    vehicleId: lead?.client?.vehicle?.id!,
                  }),
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
          <AppointmentBtn
            onOpenAppointment={() => {
              open("ADD_TASK");
              setOpenAppointment(true);
              if (!lead?.client?.id) {
                errorToast("client not found");
              }
            }}
            appointment={
              (lead?.client?.appointments?.length ?? 0) > 0
                ? lead?.client?.appointments?.[0]
                : undefined
            }
          />
          {/* add task component */}
          <AddTaskComponent companyUsers={companyUsers ?? []} lead={lead} />
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

      {openAppointment && lead?.client?.id && lead.vehicleId && (
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
      )}
    </>
  );
}
