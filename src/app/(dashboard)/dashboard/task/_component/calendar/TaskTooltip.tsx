import { Task } from "@prisma/client";
import { SquarePen, Zap } from "lucide-react"; // Zap for priority icon

type TTaskTooltipProps = {
  event: Task;
  onModalOpen?: () => void;
};

// --- STYLES DEFINITION ---
const TRANSITION_UTILITY = "transition-all duration-300 ease-in-out";
const SLATE_TEXT_COLOR = "text-slate-600 dark:text-slate-300";
const INFO_TEXT_COLOR = "text-slate-500 dark:text-slate-400";
const ACTION_COLOR = "#6571FF"; // Special action color for the edit button
// --- END STYLES DEFINITION ---

// Helper component for structured detail rows (re-used for consistency)
const TooltipDetail: React.FC<{ icon: any, children: React.ReactNode, label: string }> = ({
  icon: Icon,
  children,
  label
}) => (
  <p className={`flex items-start gap-2 text-sm ${SLATE_TEXT_COLOR}`}>
    <Icon size={16} className={`mt-0.5 min-w-[16px] ${INFO_TEXT_COLOR}`} />
    <span className="font-medium min-w-[80px] text-left">{label}:</span>
    <span className="flex-1 min-w-0 truncate font-normal">{children}</span>
  </p>
);

export default function TaskTooltip({ event, onModalOpen }: TTaskTooltipProps) {
  return (
    // Outer div maintains click/drag isolation
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className="space-y-3"
    >

      {/* 1. Title and Edit Button (Sleek Header) */}
      <div className="flex items-start justify-between pb-2 border-b border-slate-200 dark:border-slate-700">

        {/* Title: Professional, higher contrast typography */}
        <h3 className="text-xl font-extrabold text-slate-600 dark:text-white mr-4">
          {event.title}
        </h3>

        {/* Edit Button: Sleek, premium style with the action color and micro-interaction */}
        <button
          type="button"
          className={`flex-shrink-0 rounded-md p-1 text-white bg-[${ACTION_COLOR}] 
                      shadow-md shadow-[${ACTION_COLOR}]/40 hover:shadow-lg 
                      hover:scale-[1.05] ${TRANSITION_UTILITY}`}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onModalOpen && onModalOpen();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        >
          <SquarePen className="w-4 h-4 lg:w-5 lg:h-5" />
        </button>
      </div>

      {/* 2. Priority and Key Details */}
      <div className="space-y-2">

        {/* Task Priority (Using Zap/lightning icon) */}
        <TooltipDetail icon={Zap} label="Priority">
          <span className="font-bold uppercase text-amber-500 dark:text-amber-400">
            {event.priority}
          </span>
        </TooltipDetail>

      </div>

      {/* 3. Description (The main content, separated by a line) */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
        <p className={`text-sm italic font-semibold ${INFO_TEXT_COLOR} mb-1`}>Description:</p>
        <p className={`text-sm ${SLATE_TEXT_COLOR} whitespace-pre-wrap`}>{event.description || 'No description provided.'}</p>
      </div>
    </div>
  );
}