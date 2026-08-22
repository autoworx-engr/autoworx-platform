"use client";

import {
  CalendarDays,
  Clock3,
  Zap,
  Users,
  Edit,
  PencilLineIcon,
} from "lucide-react";

interface TaskDetailCardProps {
  dateLabel?: string;
  timeRange: string;
  priority: string;
  taskUsers?: any[];
  description: string;
  taskIconClass: string;
  taskPriorityTextClass: string;
}

export function TaskDetailCard({
  dateLabel,
  timeRange,
  priority,
  taskUsers,
  description,
  taskIconClass,
  taskPriorityTextClass,
}: TaskDetailCardProps) {
  return (
    <>
      {dateLabel && (
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${taskIconClass}`}>
            <CalendarDays className="size-4" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
              Date
            </p>
            <p className="text-sm font-medium text-gray-900">{dateLabel}</p>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg shrink-0 ${taskIconClass}`}>
          <Clock3 className="size-4" />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
            Time
          </p>
          <p className="text-sm font-medium text-gray-900">{timeRange}</p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg shrink-0 ${taskIconClass}`}>
          <Zap className="size-4" />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
            Priority
          </p>
          <p className={`text-sm font-bold uppercase ${taskPriorityTextClass}`}>
            {priority || "N/A"}
          </p>
        </div>
      </div>

      {taskUsers && taskUsers.length > 0 && (
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${taskIconClass}`}>
            <Users className="size-4" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
              Assigned To
            </p>
            <p className="text-sm font-medium text-gray-900">
              {taskUsers
                .map((tu) =>
                  tu?.user ? `${tu.user.firstName} ${tu.user.lastName}` : null,
                )
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg shrink-0 ${taskIconClass}`}>
          <PencilLineIcon className="size-4" />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
            Description
          </p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {description || "No description provided."}
          </p>
        </div>
      </div>
    </>
  );
}
