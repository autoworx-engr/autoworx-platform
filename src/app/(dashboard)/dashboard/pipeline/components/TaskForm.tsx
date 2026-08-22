"use client";

import { Task, User } from "@prisma/client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { successToast } from "@/lib/toast";
import TaskCreateOrEdit from "@/components/task/TaskCreateOrEdit";

// Task List Popup Component
function TaskListPopup({
  tasks,
  onTaskClick,
  isTechnician = false,
}: {
  tasks: Task[];
  onTaskClick: (taskId: number) => void;
  isTechnician?: boolean;
}) {
  return (
    <div
      className={`absolute ${isTechnician ? "-left-6" : "-left-20"} z-50 mt-1 hidden h-[90px] max-h-[110px] w-[200px] transform overflow-y-auto rounded-lg border border-[#66738C] bg-background p-2 group-hover:block`}
      style={{ top: "-6rem" }}
    >
      {tasks.map((task) => (
        <div
          key={task.id}
          className="mb-2 rounded-[3px] p-1 text-white cursor-pointer hover:opacity-80 transition-opacity"
          style={{
            backgroundColor:
              task.priority === "Low"
                ? "#6571FF"
                : task.priority === "Medium"
                  ? "#25AADD"
                  : "#006D77",
          }}
          onClick={(e) => {
            e.stopPropagation();
            onTaskClick(task.id);
          }}
        >
          {task.title}
        </div>
      ))}
    </div>
  );
}

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
        />
      )}
    </div>
  );
}
