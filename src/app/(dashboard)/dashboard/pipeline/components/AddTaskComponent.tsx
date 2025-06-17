"use client";
import { SalesLead } from "@/types/invoiceLead";
import { Task, User } from "@prisma/client";
import usePipelineTrigger from "@/hooks/usePipelineTrigger";
import useCommunicationTrigger from "@/hooks/useCommunicationTrigger";
import dynamic from "next/dynamic";

type TProps = {
  lead: SalesLead;
  companyUsers: User[];
};

const TaskForm = dynamic(() => import("./TaskForm"), { ssr: false });

export default function AddTaskComponent({ lead, companyUsers }: TProps) {
  const { dispatch } = usePipelineTrigger();
  const { dispatch: communicationDispatch } = useCommunicationTrigger();
  const handleAutomationTrigger = async () => {
    dispatch("UPDATE_PIPELINE_AUTOMATION_TRIGGER", {
      condition: "TASK_CREATED",
      companyId: lead.companyId,
      leadId: lead.leadId,
      columnId: lead.columnId,
    });
  };
  const handleCommunicationAutomationTrigger = async () => {
    communicationDispatch("UPDATE_COMMUNICATION_AUTOMATION_TRIGGER", {
      companyId: lead.companyId,
      leadId: lead.leadId,
      columnId: lead.columnId,
    });
  };

  const handleLeadTaskUpdate = async (task: Task) => {
    dispatch("UPDATE_LEAD_TASK_STATE", {
      task,
      leadId: lead.leadId,
      columnId: lead.columnId,
    });
  };

  return (
    <div className="group relative mt-1.5">
      <TaskForm
        companyUsers={companyUsers}
        leadId={lead?.leadId}
        clientId={lead?.client?.id}
        previousTasks={lead?.tasks || []}
        totalTasksCount={lead?.tasks?.length}
        onAutomationTrigger={handleAutomationTrigger}
        onCommunicationAutomationTrigger={handleCommunicationAutomationTrigger}
        onUpdateTaskInLead={handleLeadTaskUpdate}
      />
      <span className="invisible absolute bottom-full left-14 mb-1 w-max -translate-x-1/2 transform whitespace-nowrap rounded-md border-2 border-white bg-[#66738C] px-2 py-1 text-xs text-white shadow-lg transition-opacity group-hover:visible">
        Add Task
      </span>
    </div>
  );
}
