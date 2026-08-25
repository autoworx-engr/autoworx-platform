"use client";

import { Task, User } from "@prisma/client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { successToast } from "@/lib/toast";
import TaskCreateOrEdit from "@/components/task/TaskCreateOrEdit";
import TaskListPopup from "../sales/pipeline/_components/TaskListPopup";

export default function TaskForm({
  companyUsers,
  invoiceId,
  previousTasks,
  leadId,
  clientId,
  totalTasksCount = 0,
  setTotalTasks,
  onAutomationTrigger,
  onCommunicationAutomationTrigger,
  onUpdateTaskInLead,
  isTechnician = false,
}: {
  companyUsers: Partial<User>[] | null;
  invoiceId?: string;
  leadId?: number;
  clientId?: number;
  previousTasks: Task[];
  totalTasksCount?: number;
  setTotalTasks?: React.Dispatch<React.SetStateAction<number>>;
  onAutomationTrigger?: () => void;
  onCommunicationAutomationTrigger?: () => void;
  onUpdateTaskInLead?: (task: Task) => void;
  isTechnician?: boolean;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editTaskId, setEditTaskId] = useState<number | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    if (previousTasks) {
      setTasks(previousTasks);
    }
  }, [previousTasks]);

  const handleTaskCreated = (task: Task) => {
    onAutomationTrigger && onAutomationTrigger();
    onCommunicationAutomationTrigger && onCommunicationAutomationTrigger();
    onUpdateTaskInLead && onUpdateTaskInLead(task);
    setTasks((prevTasks) => [...prevTasks, task]);
    setTotalTasks && setTotalTasks((prev) => prev + 1);
  };

  const handleTaskUpdated = (task: Task) => {
    onUpdateTaskInLead && onUpdateTaskInLead(task);
    setTasks((prevTasks) =>
      prevTasks.map((existingTask) =>
        existingTask.id === task.id ? task : existingTask,
      ),
    );
    setIsEditModalOpen(false);
    setEditTaskId(null);
  };

  const handleTaskClick = (taskId: number) => {
    setEditTaskId(taskId);
    setIsEditModalOpen(true);
  };

  const currentTaskCount = Math.max(totalTasksCount, tasks.length);
  const isShowTaskCount = currentTaskCount > 0;

  const triggerButton = (
    <div className="relative cursor-pointer">
      <div className="relative h-4 w-4">
        <Image
          src="/icons/addtask.png"
          alt="Add Task"
          sizes="100vw"
          fill
          className="object-contain duration-300 hover:opacity-80"
        />
      </div>
      {isShowTaskCount && (
        <span className="absolute -top-2 left-2 rounded-full bg-red-500 px-1 py-0.5 text-[10px] text-white leading-none min-w-[16px] text-center">
          {currentTaskCount}
        </span>
      )}
    </div>
  );

  return (
    <div className="group relative">
      <TaskCreateOrEdit
        triggerIcon={triggerButton}
        leadId={leadId}
        clientId={clientId}
        invoiceId={invoiceId}
        onTaskCreated={handleTaskCreated}
      />

      {/* Edit Task Modal */}
      {editTaskId && (
        <TaskCreateOrEdit
          taskId={editTaskId}
          fromEdit={true}
          leadId={leadId}
          clientId={clientId}
          invoiceId={invoiceId}
          isModalOpen={isEditModalOpen}
          setIsModalOpen={setIsEditModalOpen}
          onTaskUpdated={handleTaskUpdated}
        />
      )}

      {tasks && tasks.length > 0 && (
        <TaskListPopup
          isTechnician={isTechnician}
          tasks={tasks}
          onTaskClick={handleTaskClick}
          zIndexClass="z-50"
        />
      )}
    </div>
  );
}
