import { Task } from "@prisma/client";
import { SquarePen } from "lucide-react";

type TTaskTooltipProps = {
  event: Task;
  onModalOpen?: () => void;
};

export default function TaskTooltip({ event, onModalOpen }: TTaskTooltipProps) {
  return (
    <div 
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{event.title}</h3>

        <button
          type="button"
          className="text- rounded-full bg-[#6571FF] p-2 text-white"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onModalOpen && onModalOpen();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        >
          <SquarePen className="w-4 h-4 cursor-pointer mx-auto" />
        </button>
      </div>

      <p className="mt-3">{event.description}</p>
      <p className="mt-3">Task Priority: {event.priority}</p>
    </div>
  );
}
