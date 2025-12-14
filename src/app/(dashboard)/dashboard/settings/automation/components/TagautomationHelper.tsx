
import { Tooltip } from "antd";
import { InfoCircleOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import { Target, MessageSquare, Clock, Info, X, Zap } from "lucide-react";
import { useState } from "react";


/**
 * Returns condition-specific help content with icons and styling
 */
export const getConditionHelp = (conditionType: string) => {
  const helpConfig = {
    pipeline: {
      icon: <Target className="w-5 h-5 text-blue-600" />,
      title: "Pipeline Movement",
      desc: "When a tag is added, the lead will automatically move to your selected column.",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-400",
      textColor: "text-blue-900",
    },
    communication: {
      icon: <MessageSquare className="w-5 h-5 text-green-600" />,
      title: "Communication Trigger",
      desc: "When a tag is added, an automatic SMS/Email will be sent to the client.",
      bgColor: "bg-green-50",
      borderColor: "border-green-400",
      textColor: "text-green-900",
    },
    post_tag: {
      icon: <Clock className="w-5 h-5 text-purple-600" />,
      title: "Post-Tag Action",
      desc: "After reaching the targeted column, new tags will be automatically added.",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-400",
      textColor: "text-purple-900",
    },
  };

  return helpConfig[conditionType as keyof typeof helpConfig] || null;
};

/**
 * Renders an info card with icon, title, and description
 */
export const InfoCard = ({
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
 * Renders a guide card with dismissible close button
 */
export const GuideCard = ({ onClose }: { onClose: () => void }) => (
  <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
    <div className="flex items-start justify-between">
      <div className="flex gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-medium mb-1">How does it work?</p>
          <p className="text-xs leading-relaxed">
            Select Condition → Add Tags → Set Time Delay → Action will be
            triggered
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
 * Renders automation flow visualization
 */
const FlowVisualization = ({
  timeDelay,
  conditionType,
}: {
  timeDelay: string | number | null;
  conditionType: string;
}) => {
  const getActionText = () => {
    switch (conditionType) {
      case "pipeline":
        return "Move to Column";
      case "communication":
        return "Send Message";
      case "post_tag":
        return "Add New Tags";
      default:
        return "Action";
    }
  };

  return (
    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-500" />
          Automation Flow Preview
        </h3>
        <Tooltip title="This shows how your automation will work step by step">
          <InfoCircleOutlined className="text-gray-400 hover:text-gray-600 cursor-help" />
        </Tooltip>
      </div>
      <div className="flex items-center gap-2 text-xs overflow-x-auto pb-2">
        <div className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded font-medium whitespace-nowrap">
          Tag Added
        </div>
        <div className="text-gray-400">→</div>
        <div className="px-3 py-1.5 bg-purple-100 text-purple-800 rounded font-medium whitespace-nowrap">
          Wait {timeDelay || "..."}
        </div>
        <div className="text-gray-400">→</div>
        <div className="px-3 py-1.5 bg-green-100 text-green-800 rounded font-medium whitespace-nowrap">
          {getActionText()}
        </div>
      </div>
    </div>
  );
};

/**
 * Renders a tooltip-wrapped label
 */
export const TooltipLabel = ({
  label,
  tooltipText,
  required = false,
  icon = "info",
}: {
  label: string;
  tooltipText: string | React.ReactNode;
  required?: boolean;
  icon?: "info" | "question";
}) => {
  const IconComponent =
    icon === "question" ? QuestionCircleOutlined : InfoCircleOutlined;

  return (
    <div className="flex items-center gap-1 mb-1">
      <span className="font-medium text-gray-500">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <Tooltip title={tooltipText} placement="top">
        <IconComponent className="text-gray-400 hover:text-gray-600 cursor-help text-xs" />
      </Tooltip>
    </div>
  );
};

/**
 * Renders a helpful tip box
 */
export const TipBox = ({ message }: { message: string }) => (
  <div className="flex items-start gap-2 mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
    <span className="text-base">💡</span>
    <p className="text-xs text-amber-900">
      <strong>Tip:</strong> {message}
    </p>
  </div>
);
