import { Tooltip } from "antd";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  FileTextIcon,
  Filter,
  Info,
  InfoIcon,
  Mail,
  MessageSquare,
  Users,
  X,
  Zap,
} from "lucide-react";

export const getInvoiceTypeHelp = (type: string) => {
  if (!type) return null;

  const helpContent = {
    Invoice: {
      icon: <FileText className="text-blue-800" />,
      title: "Invoice Automation",
      desc: "Automatically send invoice notifications to clients when an invoice reaches a specific status.",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-800",
    },
    Estimate: {
      icon: <FileTextIcon className="text-purple-800" />,
      title: "Estimate Automation",
      desc: "Automatically send estimate notifications to clients when an estimate reaches a specific status.",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      textColor: "text-purple-800",
    },
  };

  return helpContent[type as keyof typeof helpContent] || null;
};

interface ConditionActionHelpProps {
  conditionId?: number | string | null;
  actionId?: number | string | null;
  conditionName?: string;
  actionName?: string;
}

export const getConditionActionHelp = ({
  conditionId,
  actionId,
  conditionName,
  actionName,
}: ConditionActionHelpProps) => {
  if (!conditionId || !actionId) return null;

  const helpConfig = {
    status_transition: {
      icon: <ArrowRight className="w-5 h-5 text-indigo-600" />,
      title: "Status Transition",
      description: `When service moves from "${conditionName}" to "${actionName}", this automation will trigger and send notifications to the customer.`,
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-200",
      textColor: "text-indigo-800",
    },
  };

  return helpConfig.status_transition;
};

export const getPipelineConditionHelp = (conditionType: string) => {
  const helpConfig = {
    APPOINTMENT_SCHEDULED: {
      icon: <Calendar className="w-5 h-5 text-blue-600" />,
      title: "Appointment Scheduled",
      desc: "When an appointment is scheduled for a lead in the selected stages, it will automatically move to your chosen action column.",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-400",
      textColor: "text-blue-900",
    },
    ESTIMATE_CREATED: {
      icon: <FileText className="w-5 h-5 text-green-600" />,
      title: "Estimate Created",
      desc: "When an estimate is created for a lead, it will automatically move to the action column.",
      bgColor: "bg-green-50",
      borderColor: "border-green-400",
      textColor: "text-green-900",
    },
    TASK_CREATED: {
      icon: <CheckCircle2 className="w-5 h-5 text-purple-600" />,
      title: "Task Created",
      desc: "When a task is created for a lead, it will automatically move to the action column.",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-400",
      textColor: "text-purple-900",
    },
    MESSAGE_SENT_CLIENT: {
      icon: <MessageSquare className="w-5 h-5 text-indigo-600" />,
      title: "Message Sent to Client",
      desc: "When you send a message to the client, the lead will automatically move to the action column.",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-400",
      textColor: "text-indigo-900",
    },
    MESSAGE_RECEIVED_CLIENT: {
      icon: <Mail className="w-5 h-5 text-teal-600" />,
      title: "Message Received from Client",
      desc: "When a client sends you a message, the lead will automatically move to the action column.",
      bgColor: "bg-teal-50",
      borderColor: "border-teal-400",
      textColor: "text-teal-900",
    },
    TIME_DELAY: {
      icon: <Clock className="w-5 h-5 text-orange-600" />,
      title: "Time Delay",
      desc: "After the specified time delay, leads in the selected stages will automatically move to the action column.",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-400",
      textColor: "text-orange-900",
    },
  };

  return helpConfig[conditionType as keyof typeof helpConfig] || null;
};

/**
 * Info Card Component
 */
const InfoCard = ({
  icon,
  title,
  description,
  bgColor,
  borderColor,
  textColor,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}) => (
  <div
    className={`flex gap-3 p-3 rounded-lg ${bgColor} border-l-4 ${borderColor} mt-3 animate-fadeIn`}
  >
    <div className="flex-shrink-0 mt-0.5">{icon}</div>
    <div>
      <div className={`font-medium text-sm ${textColor}`}>{title}</div>
      <div className={`text-xs mt-1 ${textColor} opacity-90`}>
        {description}
      </div>
    </div>
  </div>
);

/**
 * Guide Card Component
 */
const PipelineGuideCard = ({ onClose }: { onClose: () => void }) => (
  <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
    <div className="flex items-start justify-between">
      <div className="flex gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-medium mb-1">How Pipeline Automation Works?</p>
          <p className="text-xs leading-relaxed">
            Select Stage(s) → Choose Condition → Set Action Column → Automatic
            Movement
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="text-blue-600 hover:text-blue-800 transition-colors p-1"
        aria-label="Close guide"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  </div>
);

/**
 * Flow Visualization for Pipeline
 */
export const PipelineFlowVisualization = ({
  stageCount,
  condition,
  delay,
  action,
}: {
  stageCount: number;
  condition: string;
  delay: string | number | null;
  action: string;
}) => {
  const getConditionText = () => {
    switch (condition) {
      case "APPOINTMENT_SCHEDULED":
        return "Appointment Scheduled";
      case "ESTIMATE_CREATED":
        return "Estimate Created";
      case "TASK_CREATED":
        return "Task Created";
      case "MESSAGE_SENT_CLIENT":
        return "Message Sent";
      case "MESSAGE_RECEIVED_CLIENT":
        return "Message Received";
      case "TIME_DELAY":
        return `Wait ${delay || "..."}`;
      default:
        return "Condition";
    }
  };

  return (
    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-500" />
          Automation Flow Preview
        </h3>
        <Tooltip title="This shows how your pipeline automation will work">
          <InfoIcon className="text-gray-400 hover:text-gray-600 cursor-help" />
        </Tooltip>
      </div>
      <div className="flex items-center gap-2 text-xs overflow-x-auto pb-2">
        <div className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded font-medium whitespace-nowrap">
          {stageCount > 0
            ? `${stageCount} Stage${stageCount > 1 ? "s" : ""}`
            : "Select Stage"}
        </div>
        <div className="text-gray-400">→</div>
        <div className="px-3 py-1.5 bg-purple-100 text-purple-800 rounded font-medium whitespace-nowrap">
          {getConditionText()}
        </div>
        <div className="text-gray-400">→</div>
        <div className="px-3 py-1.5 bg-green-100 text-green-800 rounded font-medium whitespace-nowrap">
          Move to {action || "Action Column"}
        </div>
      </div>
    </div>
  );
};

export const getTargetHelp = ({
  selectedTargets,
  length,
}: {
  selectedTargets: string;
  length: number;
}) => {
  if (length === 0) return null;

  const helpContent = {
    Content: {
      icon: <Users className="text-blue-800" />,
      title: "Campaign Target Audience",
      desc: `This campaign will be sent to: ${selectedTargets}. You can further refine this with target conditions and vehicle filters.`,
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-800",
    },
  };
  return helpContent.Content;
};

export const getCampaignConditionHelp = ({
  conditionLabel,
}: {
  conditionLabel: string;
}) => {
  if (!conditionLabel) return null;

  const helpContent = {
    Condition: {
      icon: <Filter className="text-purple-800" />,
      title: "Time-based Filtering",
      desc: `Campaign will target ${conditionLabel}. This helps you reach customers at the right time based on their last interaction.`,
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      textColor: "text-purple-800",
    },
  };
  return helpContent.Condition;
};

const getCommunicationHelp = (commType: string) => {
  if (!commType) return null;

  const helpContent = {
    SMS: {
      icon: MessageSquare,
      title: "SMS Campaign",
      desc: "Send promotional text messages directly to your customers' phones. High open rates and immediate delivery.",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-800",
    },
    EMAIL: {
      icon: Mail,
      title: "Email Campaign",
      desc: "Send detailed marketing emails with rich content and attachments. Perfect for newsletters and promotional offers.",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-800",
    },
    BOTH: {
      icon: Mail,
      title: "Multi-Channel Campaign",
      desc: "Send both SMS and Email for maximum reach. Your message will be delivered through multiple channels to ensure visibility.",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-200",
      textColor: "text-indigo-800",
    },
  };

  // return helpContent[commType];
};
